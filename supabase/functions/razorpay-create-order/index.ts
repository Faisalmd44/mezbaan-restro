import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as edge function secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { order_id, amount, currency = "INR" } = body;

    if (!order_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid parameters: order_id and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, user_id, total, status, payment_status, razorpay_status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: order does not belong to this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const razorpayPayload = {
      amount: amountInPaise,
      currency,
      receipt: order_id,
      notes: { order_id, user_id: user.id },
    };

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify(razorpayPayload),
    });

    const razorpayData = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      await adminClient.from("payments").insert({
        order_id, user_id: user.id, provider: "razorpay",
        amount: amountInPaise, currency, status: "failed",
        error_code: razorpayData.error?.code ?? "unknown",
        error_description: razorpayData.error?.description ?? "Razorpay order creation failed",
        raw_response: razorpayData,
      });
      return new Response(
        JSON.stringify({ error: "Failed to create Razorpay order", details: razorpayData.error?.description ?? "Unknown error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await adminClient.from("orders").update({ razorpay_order_id: razorpayData.id, razorpay_status: "created" }).eq("id", order_id);

    await adminClient.from("payments").insert({
      order_id, user_id: user.id, provider: "razorpay",
      provider_order_id: razorpayData.id, amount: amountInPaise, currency, status: "created",
      raw_response: razorpayData,
    });

    return new Response(
      JSON.stringify({
        razorpay_order_id: razorpayData.id, amount: razorpayData.amount,
        currency: razorpayData.currency, receipt: razorpayData.receipt,
        status: razorpayData.status, key_id: RAZORPAY_KEY_ID,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
