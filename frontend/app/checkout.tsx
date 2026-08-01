import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api } from "@/src/api";
import { useApp } from "@/src/store";
import { getEnabledMethods, getMethod } from "@/src/payments";
import {
  RESTAURANT,
  ServiceabilityStatus,
  fetchCurrentPosition,
  getLocationPermission,
  requestLocationPermission,
} from "@/src/location";

export default function Checkout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, user, clearCart, refreshUser } = useApp();

  const methods = getEnabledMethods();
  const [payment, setPayment] = useState<string>(methods[0]?.id || "cod");

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [name, setName] = useState(user?.name || "");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [coupons, setCoupons] = useState<any[]>([]);
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [showCoupons, setShowCoupons] = useState(false);

  const [loc, setLoc] = useState<ServiceabilityStatus>({ state: "idle" });

  const checkServiceability = useCallback(async () => {
    setLoc({ state: "checking" });
    try {
      let perm = await getLocationPermission();
      if (perm.status !== "granted") {
        if (!perm.canAskAgain) {
          setLoc({ state: "denied", canAskAgain: false });
          return;
        }
        perm = await requestLocationPermission();
        if (perm.status !== "granted") {
          setLoc({ state: "denied", canAskAgain: perm.canAskAgain });
          return;
        }
      }
      const pos = await fetchCurrentPosition();
      const { latitude, longitude } = pos.coords;
      const res = await api.deliveryCheck(latitude, longitude);
      if (res.serviceable) {
        setLoc({
          state: "ok",
          lat: latitude,
          lng: longitude,
          distance_km: res.distance_km,
          zone_name: res.zone?.name || RESTAURANT.name,
        });
      } else {
        setLoc({ state: "out_of_zone", lat: latitude, lng: longitude, distance_km: res.distance_km });
      }
    } catch (e: any) {
      setLoc({ state: "error", message: e?.message || "Could not fetch location" });
    }
  }, []);

  useEffect(() => { checkServiceability(); }, [checkServiceability]);
  useEffect(() => { api.coupons().then(setCoupons); }, []);

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const validCoupon = coupons.find((c) => c.code === coupon.toUpperCase() && subtotal >= c.min_order);
  const discount = validCoupon ? Math.round((subtotal * validCoupon.discount_percent) / 100) : 0;
  const loyaltyMax = Math.min(user?.loyalty_points || 0, Math.floor(subtotal * 0.1));
  const loyaltyDiscount = useLoyalty ? loyaltyMax : 0;
  const deliveryFee = subtotal >= 250 ? 0 : 30;
  const total = Math.max(0, subtotal - discount - loyaltyDiscount + deliveryFee);

  const canPlace =
    loc.state === "ok" &&
    name.trim().length > 0 &&
    phone.trim().length >= 10 &&
    address.trim().length > 0 &&
    !placing;

  const placeOrder = async () => {
    setError("");
    if (loc.state !== "ok") {
      setError("Please enable location to check delivery availability");
      return;
    }
    if (!name.trim() || phone.trim().length < 10 || !address.trim()) {
      setError("Please fill name, phone & address");
      return;
    }
    setPlacing(true);
    try {
      const method = getMethod(payment);
      if (!method) throw new Error("Invalid payment method");
      const result = await method.pay({ amount: total, customerName: name, customerPhone: phone });
      if (!result.success) throw new Error(result.message || "Payment failed");

      console.log("CHECKOUT CART:", JSON.stringify(cart, null, 2));
 
     const res = await api.placeOrder({
        items: cart,
        address, phone, name,
        payment_method: payment,
        coupon_code: validCoupon?.code,
        notes,
        use_loyalty: useLoyalty,
        lat: loc.lat,
        lng: loc.lng,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearCart();
      refreshUser();
      router.replace(`/tracking/${res.id}`);
    } catch (e: any) {
      setError(e.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <Pressable testID="checkout-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 180 }}>
        {/* Location card */}
        <LocationCard status={loc} onRetry={checkServiceability} onOpenSettings={() => Linking.openSettings()} />

        <Text style={styles.section}>Delivery Details</Text>
        <View style={styles.input}>
          <Ionicons name="person" size={18} color={COLORS.textSecondary} />
          <TextInput value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={COLORS.textMuted} style={styles.txt} testID="co-name" />
        </View>
        <View style={styles.input}>
          <Ionicons name="call" size={18} color={COLORS.textSecondary} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor={COLORS.textMuted} keyboardType="number-pad" style={styles.txt} testID="co-phone" />
        </View>
        <View style={styles.input}>
          <Ionicons name="location" size={18} color={COLORS.textSecondary} />
          <TextInput value={address} onChangeText={setAddress} placeholder="Full delivery address" placeholderTextColor={COLORS.textMuted} multiline style={styles.txt} testID="co-address" />
        </View>
        <View style={styles.input}>
          <Ionicons name="chatbox" size={18} color={COLORS.textSecondary} />
          <TextInput value={notes} onChangeText={setNotes} placeholder="Delivery instructions (optional)" placeholderTextColor={COLORS.textMuted} style={styles.txt} testID="co-notes" />
        </View>

        <Text style={styles.section}>Apply Coupon</Text>
        <View style={styles.input}>
          <Ionicons name="pricetag" size={18} color={COLORS.gold} />
          <TextInput
            value={coupon}
            onChangeText={(t) => setCoupon(t.toUpperCase())}
            placeholder="Enter code"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            style={styles.txt}
            testID="co-coupon"
          />
          <Pressable onPress={() => setShowCoupons(true)} testID="co-view-coupons">
            <Text style={{ color: COLORS.brand, fontWeight: "800" }}>View</Text>
          </Pressable>
        </View>
        {validCoupon ? <Text style={styles.couponGood}>✓ {validCoupon.discount_percent}% off applied!</Text> : null}

        {user && user.loyalty_points > 0 ? (
          <Pressable testID="co-loyalty-toggle" onPress={() => setUseLoyalty(!useLoyalty)} style={styles.loyaltyRow}>
            <Ionicons name="star" size={20} color={COLORS.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.loyaltyTxt}>Use Loyalty Points</Text>
              <Text style={styles.loyaltySub}>{user.loyalty_points} pts (use up to ₹{loyaltyMax})</Text>
            </View>
            <View style={[styles.toggle, useLoyalty && styles.toggleOn]}>
              <View style={[styles.toggleDot, useLoyalty && styles.toggleDotOn]} />
            </View>
          </Pressable>
        ) : null}

        <Text style={styles.section}>Payment Method</Text>
        {methods.map((m) => {
          const active = payment === m.id;
          return (
            <Pressable
              key={m.id}
              testID={`pay-${m.id}`}
              onPress={() => setPayment(m.id)}
              style={[styles.payRow, active && styles.payActive]}
            >
              <Ionicons name={m.icon as any} size={22} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.payLbl}>{m.label}</Text>
                <Text style={styles.paySub}>{m.description}</Text>
              </View>
              {active ? <Ionicons name="checkmark-circle" size={20} color={COLORS.brand} /> : null}
            </Pressable>
          );
        })}
        <Text style={styles.morePayments}>💡 Online payments (Razorpay / UPI QR) coming soon</Text>

        <View style={styles.totals}>
          <Row lbl="Subtotal" val={`₹${subtotal.toFixed(0)}`} />
          {discount > 0 ? <Row lbl={`Coupon (${validCoupon.code})`} val={`-₹${discount}`} good /> : null}
          {loyaltyDiscount > 0 ? <Row lbl="Loyalty discount" val={`-₹${loyaltyDiscount}`} good /> : null}
          <Row lbl="Delivery fee" val={deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`} good={deliveryFee === 0} />
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLbl}>Total</Text>
            <Text style={styles.totalVal}>₹{total.toFixed(0)}</Text>
          </View>
        </View>

        {error ? <Text testID="checkout-error" style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Pressable
          testID="place-order-btn"
          onPress={placeOrder}
          disabled={!canPlace}
          style={[styles.placeBtn, !canPlace && styles.placeBtnDisabled]}
        >
          {placing ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.placeTxt}>{loc.state === "ok" ? "Place Order" : "Location Required"}</Text>
              <Text style={styles.placePrice}>₹{total.toFixed(0)}</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={showCoupons} transparent animationType="slide" onRequestClose={() => setShowCoupons(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Available Coupons</Text>
            {coupons.map((c) => (
              <Pressable
                key={c.code}
                testID={`coupon-${c.code}`}
                onPress={() => { setCoupon(c.code); setShowCoupons(false); }}
                style={styles.couponCard}
              >
                <View style={styles.couponBadge}>
                  <Text style={styles.couponPct}>{c.discount_percent}%</Text>
                  <Text style={styles.couponOff}>OFF</Text>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={styles.couponCode}>{c.code}</Text>
                  <Text style={styles.couponDesc}>{c.description}</Text>
                  <Text style={styles.couponMin}>Min order ₹{c.min_order}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowCoupons(false)} style={[styles.modalBtn, { backgroundColor: COLORS.brand, marginTop: SPACING.md }]}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function LocationCard({ status, onRetry, onOpenSettings }: { status: ServiceabilityStatus; onRetry: () => void; onOpenSettings: () => void }) {
  if (status.state === "idle" || status.state === "checking") {
    return (
      <View style={styles.locCard} testID="loc-card-checking">
        <ActivityIndicator color={COLORS.brand} />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={styles.locTitle}>Checking delivery availability…</Text>
          <Text style={styles.locSub}>Detecting your location via GPS</Text>
        </View>
      </View>
    );
  }
  if (status.state === "ok") {
    return (
      <View style={[styles.locCard, styles.locOk]} testID="loc-card-ok">
        <Ionicons name="checkmark-circle" size={26} color={COLORS.success} />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={[styles.locTitle, { color: COLORS.success }]}>We deliver here!</Text>
          <Text style={styles.locSub}>{status.distance_km.toFixed(1)} km from {status.zone_name}</Text>
        </View>
        <Pressable testID="loc-refresh" onPress={onRetry}><Ionicons name="refresh" size={20} color={COLORS.textMuted} /></Pressable>
      </View>
    );
  }
  if (status.state === "out_of_zone") {
    return (
      <View style={[styles.locCard, styles.locBad]} testID="loc-card-out">
        <Ionicons name="close-circle" size={26} color={COLORS.error} />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={[styles.locTitle, { color: COLORS.error }]}>Sorry! We will deliver in your area soon.</Text>
          <Text style={styles.locSub}>You are {status.distance_km.toFixed(1)} km away (max 5 km)</Text>
        </View>
        <Pressable testID="loc-refresh" onPress={onRetry}><Ionicons name="refresh" size={20} color={COLORS.textMuted} /></Pressable>
      </View>
    );
  }
  if (status.state === "denied") {
    return (
      <View style={[styles.locCard, styles.locBad]} testID="loc-card-denied">
        <Ionicons name="location-outline" size={26} color={COLORS.error} />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={[styles.locTitle, { color: COLORS.error }]}>Location required</Text>
          <Text style={styles.locSub}>Enable location so we can confirm delivery to your address</Text>
        </View>
        {status.canAskAgain ? (
          <Pressable testID="loc-grant" onPress={onRetry} style={styles.locBtn}>
            <Text style={styles.locBtnTxt}>Allow</Text>
          </Pressable>
        ) : (
          <Pressable testID="loc-settings" onPress={onOpenSettings} style={styles.locBtn}>
            <Text style={styles.locBtnTxt}>Settings</Text>
          </Pressable>
        )}
      </View>
    );
  }
  // error
  return (
    <View style={[styles.locCard, styles.locBad]} testID="loc-card-error">
      <Ionicons name="warning" size={26} color={COLORS.error} />
      <View style={{ flex: 1, marginLeft: SPACING.md }}>
        <Text style={[styles.locTitle, { color: COLORS.error }]}>Could not fetch location</Text>
        <Text style={styles.locSub}>{status.message}</Text>
      </View>
      <Pressable testID="loc-refresh" onPress={onRetry} style={styles.locBtn}>
        <Text style={styles.locBtnTxt}>Retry</Text>
      </Pressable>
    </View>
  );
}

function Row({ lbl, val, good }: any) {
  return (
    <View style={styles.totRow}>
      <Text style={styles.totLbl}>{lbl}</Text>
      <Text style={[styles.totVal, good && { color: COLORS.success }]}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surfaceAlt },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: "#fff" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceAlt },
  title: { fontSize: 17, fontWeight: "800" },
  section: { fontWeight: "800", fontSize: 15, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  input: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm, minHeight: 48, gap: 8 },
  txt: { flex: 1, color: COLORS.textPrimary, paddingVertical: SPACING.sm },
  couponGood: { color: COLORS.success, fontWeight: "700", marginTop: 4 },
  loyaltyRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md, gap: 12 },
  loyaltyTxt: { fontWeight: "800", color: COLORS.textPrimary },
  loyaltySub: { fontSize: 11, color: COLORS.textSecondary },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: COLORS.border, padding: 2 },
  toggleOn: { backgroundColor: COLORS.brand },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  toggleDotOn: { alignSelf: "flex-end" },
  payRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, gap: 12, borderWidth: 1.5, borderColor: "transparent" },
  payActive: { borderColor: COLORS.brand, backgroundColor: COLORS.surfaceTint },
  payLbl: { fontWeight: "800", color: COLORS.textPrimary },
  paySub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  morePayments: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontStyle: "italic" },
  totals: { backgroundColor: "#fff", borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totLbl: { color: COLORS.textSecondary },
  totVal: { fontWeight: "700", color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLbl: { fontWeight: "800", fontSize: 16 },
  totalVal: { fontWeight: "900", fontSize: 20, color: COLORS.brand },
  error: { color: COLORS.error, textAlign: "center", marginTop: SPACING.md },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: SPACING.lg, backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOW.strong },
  placeBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.pill, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: SPACING.xl, alignItems: "center" },
  placeBtnDisabled: { backgroundColor: COLORS.textMuted },
  placeTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  placePrice: { color: COLORS.gold, fontWeight: "900", fontSize: 18 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: SPACING.xl + 20 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary, marginBottom: SPACING.lg },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.pill, alignItems: "center" },
  couponCard: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceTint, marginBottom: SPACING.sm },
  couponBadge: { backgroundColor: COLORS.brand, padding: SPACING.sm, borderRadius: RADIUS.sm, alignItems: "center", minWidth: 64 },
  couponPct: { color: "#fff", fontWeight: "900", fontSize: 18 },
  couponOff: { color: "#fff", fontWeight: "700", fontSize: 10 },
  couponCode: { fontWeight: "900", color: COLORS.textPrimary },
  couponDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  couponMin: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  locCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: SPACING.md, borderRadius: RADIUS.md, borderLeftWidth: 4, borderLeftColor: COLORS.brand, ...SHADOW.card },
  locOk: { borderLeftColor: COLORS.success },
  locBad: { borderLeftColor: COLORS.error },
  locTitle: { fontWeight: "800", color: COLORS.textPrimary, fontSize: 14 },
  locSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  locBtn: { backgroundColor: COLORS.brand, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill },
  locBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
