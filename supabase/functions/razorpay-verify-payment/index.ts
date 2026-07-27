import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  keySecret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keySecret);
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const message = `${razorpayOrderId}|${razorpayPaymentId}`;
  const messageData = encoder.encode(message);
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expectedSignature === razorpaySignature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: order, error: orderError } = await adminClient.from("orders").select("id, user_id, total, razorpay_order_id, razorpay_status").eq("id", order_id).maybeSingle();
    if (orderError || !order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (order.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (order.razorpay_order_id !== razorpay_order_id) return new Response(JSON.stringify({ error: "Razorpay order ID mismatch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const isValid = await verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, RAZORPAY_KEY_SECRET);
    if (!isValid) {
      await adminClient.from("payments").insert({ order_id, user_id: user.id, provider: "razorpay", provider_order_id: razorpay_order_id, provider_payment_id: razorpay_payment_id, provider_signature: razorpay_signature, status: "failed", error_code: "SIGNATURE_VERIFICATION_FAILED", error_description: "Payment signature verification failed" });
      await adminClient.from("orders").update({ razorpay_status: "failed" }).eq("id", order_id);
      return new Response(JSON.stringify({ error: "Payment signature verification failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
    const paymentFetchResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, { headers: { "Authorization": "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`) } });
    const paymentData = await paymentFetchResponse.json();

    if (!paymentFetchResponse.ok || paymentData.status !== "captured") {
      await adminClient.from("orders").update({ razorpay_status: "failed" }).eq("id", order_id);
      await adminClient.from("payments").insert({ order_id, user_id: user.id, provider: "razorpay", provider_order_id: razorpay_order_id, provider_payment_id: razorpay_payment_id, provider_signature: razorpay_signature, status: "failed", error_code: paymentData.error_code ?? "PAYMENT_NOT_CAPTURED", error_description: paymentData.error_description ?? "Payment was not captured", raw_response: paymentData });
      return new Response(JSON.stringify({ error: "Payment was not successfully captured", details: paymentData }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date().toISOString();
    await adminClient.from("orders").update({ razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_status: "paid", payment_status: "paid", status_history: [...(order.status_history ?? []), { status: "received", at: now }] }).eq("id", order_id);
    await adminClient.from("payments").insert({ order_id, user_id: user.id, provider: "razorpay", provider_order_id: razorpay_order_id, provider_payment_id: razorpay_payment_id, provider_signature: razorpay_signature, amount: paymentData.amount ?? Math.round(Number(order.total) * 100), currency: paymentData.currency ?? "INR", status: "paid", raw_response: paymentData });

    return new Response(JSON.stringify({ verified: true, order_id, payment_status: "paid", razorpay_payment_id, razorpay_order_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message ?? "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
