"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useOrderTracker } from "./OrderTrackerContext";

const MILES_LIMIT = 3.0;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function CartWidget() {
  const { cart, setQty, removeItem, clearCart, totalItems, totalCents } = useCart();
  const { setActiveOrder } = useOrderTracker();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [distanceWarning, setDistanceWarning] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState("");
  const watchRef = useRef<number | null>(null);
  const warnedRef = useRef(false);

  // Geolocation distance watch
  useEffect(() => {
    if (!cart) {
      if (watchRef.current !== null) {
        navigator.geolocation?.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      warnedRef.current = false;
      return;
    }

    if (!navigator.geolocation) return;

    function check(pos: GeolocationPosition) {
      if (!cart) return;
      const dist = haversine(pos.coords.latitude, pos.coords.longitude, cart.venueLat, cart.venueLng);
      if (dist > MILES_LIMIT && !warnedRef.current) {
        warnedRef.current = true;
        setDistanceWarning(true);
      } else if (dist <= MILES_LIMIT && warnedRef.current) {
        warnedRef.current = false;
        setDistanceWarning(false);
      }
    }

    watchRef.current = navigator.geolocation.watchPosition(check, () => {}, {
      enableHighAccuracy: false,
      maximumAge: 30000,
      timeout: 15000,
    });

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [cart?.venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function placeOrder() {
    if (!cart || cart.items.length === 0) return;
    setPlacing(true);
    setMsg("");
    const items = cart.items.map(i => ({ menuItemId: i.menuItemId, qty: i.qty }));
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId: cart.venueId, items }),
    });
    const j = await res.json();
    setPlacing(false);
    if (!res.ok) { setMsg(j.error || "Order failed"); return; }
    clearCart();
    setOpen(false);
    setActiveOrder({
      orderId: j.orderId,
      orderCode: j.orderCode ?? "----",
      orderNumber: j.orderNumber ?? "",
      venueName: j.venueName ?? cart.venueName,
      venueId: cart.venueId,
      status: "PLACED",
      totalCents: j.totalCents ?? totalCents,
    });
  }

  if (!cart || totalItems === 0 || pathname?.startsWith("/u/venue/")) return null;

  return (
    <>
      {/* Distance warning modal */}
      {distanceWarning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.82)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "var(--surface)", borderRadius: 20, padding: "28px 24px",
            maxWidth: 360, width: "100%", textAlign: "center",
            border: "2px solid #f39c12", boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📍</div>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800 }}>You left the area</h3>
            <p style={{ color: "var(--muted-text)", fontSize: 14, lineHeight: 1.6, margin: "0 0 22px" }}>
              You're more than <strong>{MILES_LIMIT} miles</strong> from{" "}
              <strong>{cart.venueName}</strong>. Your cart has been saved, but you&apos;ll need to return to place your order.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { clearCart(); setDistanceWarning(false); }}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "transparent",
                  border: "1.5px solid var(--border)", color: "var(--muted-text)",
                  fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Clear Cart
              </button>
              <button
                onClick={() => setDistanceWarning(false)}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "#f39c12",
                  border: "none", color: "#000", fontWeight: 800, cursor: "pointer", fontSize: 14 }}>
                Keep Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart slide-up panel */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 1090,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
          }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100,
            background: "var(--surface)", borderRadius: "20px 20px 0 0",
            padding: "0 0 env(safe-area-inset-bottom,16px)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            maxHeight: "80vh", display: "flex", flexDirection: "column",
          }}>
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 20px 14px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Your Cart</div>
                <div style={{ fontSize: 12, color: "var(--muted-text)" }}>{cart.venueName}</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none",
                cursor: "pointer", color: "var(--muted-text)", fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            {/* Items list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
              {cart.items.map(item => (
                <div key={item.menuItemId} style={{ display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-text)" }}>
                      ${(item.priceCents / 100).toFixed(2)} each
                    </div>
                  </div>
                  {/* Qty controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setQty(item.menuItemId, item.qty - 1)}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--border)",
                        background: "transparent", color: "var(--ink)", fontWeight: 800,
                        cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                    <button onClick={() => setQty(item.menuItemId, item.qty + 1)}
                      style={{ width: 28, height: 28, borderRadius: "50%", background: "#08daf4",
                        border: "none", color: "#000", fontWeight: 800,
                        cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  {/* Line total */}
                  <div style={{ fontWeight: 800, minWidth: 52, textAlign: "right", fontSize: 14 }}>
                    ${((item.qty * item.priceCents) / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 20px 20px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 18 }}>${(totalCents / 100).toFixed(2)}</span>
              </div>
              {msg && <p style={{ color: "#f66", fontSize: 13, margin: "0 0 10px" }}>{msg}</p>}
              <button onClick={placeOrder} disabled={placing}
                style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: "#08daf4",
                  border: "none", color: "#000", fontWeight: 900, fontSize: 16,
                  cursor: placing ? "default" : "pointer", opacity: placing ? 0.7 : 1 }}>
                {placing ? "Placing order…" : `Place Order · $${(totalCents / 100).toFixed(2)}`}
              </button>
              <button onClick={() => { clearCart(); setOpen(false); }}
                style={{ width: "100%", marginTop: 8, padding: "10px 0", borderRadius: 12,
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--muted-text)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Clear Cart
              </button>
            </div>
          </div>
        </>
      )}

      {/* Floating cart button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 24, right: 20, zIndex: 1080,
          background: "#08daf4", border: "none", borderRadius: 20,
          padding: "12px 18px 12px 14px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 4px 24px rgba(8,218,244,0.45)",
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Cart" style={{ width: 26, height: 26, objectFit: "contain", filter: "brightness(0)" }} />
        {/* Badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: "#000", lineHeight: 1.1 }}>
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.7)", lineHeight: 1 }}>
            ${(totalCents / 100).toFixed(2)}
          </span>
        </div>
      </button>
    </>
  );
}
