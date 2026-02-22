"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

type MenuItem = { id: string; name: string; priceCents: number; isAlcohol: boolean; isAvailable: boolean };
type ActiveOrder = { orderId: string; orderCode: string; venueName: string; status: string };

const PHASES = [
  { key: "PLACED",    label: "Order Sent" },
  { key: "ACCEPTED",  label: "Accepted" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY",     label: "Ready" },
];

function OrderTracker({ order, onDismiss }: { order: ActiveOrder; onDismiss: () => void }) {
  const phaseIdx = PHASES.findIndex(p => p.key === order.status);
  const current = phaseIdx === -1 ? 0 : phaseIdx;
  const isReady = order.status === "READY";
  const [expanded, setExpanded] = useState(true);
  const [codeVisible, setCodeVisible] = useState(false);

  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      zIndex: 1000,
      padding: "0 12px 12px",
      pointerEvents: "none",
    }}>
      <div style={{
        maxWidth: 540,
        margin: "0 auto",
        background: "#0e1117",
        borderRadius: expanded ? 16 : 40,
        border: "1px solid rgba(8,218,244,0.3)",
        boxShadow: "0 8px 40px rgba(8,218,244,0.15)",
        overflow: "hidden",
        pointerEvents: "auto",
        transition: "border-radius 0.25s",
      }}>
        {/* Collapsed pill bar */}
        {!expanded && (
          <div
            onClick={() => setExpanded(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 18px", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: "#08daf4",
                boxShadow: "0 0 0 3px rgba(8,218,244,0.25)", display: "inline-block",
                animation: "pulse 1.4s ease-in-out infinite",
              }} />
              <strong style={{ fontSize: 14, color: "#fff" }}>Order Tracking</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#08daf4", fontWeight: 600 }}>{order.status}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Tap to expand</span>
            </div>
          </div>
        )}

        {/* Expanded panel */}
        {expanded && (
          <div style={{ padding: "22px 22px 18px" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{order.venueName}</p>
                {/* Order code with show/hide toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 36, fontWeight: 900, letterSpacing: 6, color: codeVisible ? "#08daf4" : "transparent",
                    textShadow: codeVisible ? "0 0 20px rgba(8,218,244,0.5)" : "none",
                    filter: codeVisible ? "none" : "blur(8px)",
                    background: codeVisible ? "none" : "rgba(255,255,255,0.12)",
                    borderRadius: 8, padding: codeVisible ? "0" : "2px 8px",
                    transition: "all 0.25s",
                    userSelect: codeVisible ? "auto" : "none",
                  }}>#{order.orderCode}</span>
                  <button onClick={() => setCodeVisible(v => !v)} style={{
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8, color: "#fff", fontSize: 11, padding: "4px 10px", cursor: "pointer",
                  }}>{codeVisible ? "Hide" : "Show"}</button>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  Show this code to venue staff
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {/* Minimize */}
                <button onClick={() => setExpanded(false)} style={{
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, color: "#fff", fontSize: 12, padding: "6px 12px", cursor: "pointer",
                }}>Minimize</button>
                {/* Dismiss fully */}
                <button onClick={onDismiss} style={{
                  background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)",
                  borderRadius: 8, color: "#f87171", fontSize: 12, padding: "6px 12px", cursor: "pointer",
                }}>Dismiss</button>
              </div>
            </div>

            {/* Progress track */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
              {PHASES.map((p, i) => (
                <div key={p.key} style={{ display: "flex", alignItems: "center", flex: i < PHASES.length - 1 ? 1 : undefined }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: i <= current ? "#08daf4" : "rgba(255,255,255,0.1)",
                    fontWeight: 700, fontSize: 12, color: i <= current ? "#000" : "rgba(255,255,255,0.4)",
                    boxShadow: i === current ? "0 0 0 3px rgba(8,218,244,0.3)" : "none",
                    transition: "all 0.3s",
                  }}>{i < current ? "✓" : i + 1}</div>
                  {i < PHASES.length - 1 && (
                    <div style={{
                      flex: 1, height: 3, margin: "0 3px",
                      background: i < current ? "#08daf4" : "rgba(255,255,255,0.1)",
                      transition: "background 0.3s",
                    }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              {PHASES.map((p, i) => (
                <div key={p.key} style={{
                  fontSize: 10, textAlign: "center", width: 58,
                  color: i === current ? "#08daf4" : "rgba(255,255,255,0.3)",
                  fontWeight: i === current ? 700 : 400,
                }}>{p.label}</div>
              ))}
            </div>

            {isReady && (
              <div style={{
                background: "rgba(8,218,244,0.08)", border: "1px solid rgba(8,218,244,0.3)",
                borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#fff",
              }}>
                <strong style={{ color: "#08daf4" }}>Ready for pickup</strong> — Have your ID ready: Passport or issued driver&apos;s license.
              </div>
            )}

            {!isReady && (
              <p style={{ textAlign: "center", fontSize: 11, margin: 0, color: "rgba(255,255,255,0.3)" }}>
                Auto-updating every 10 seconds
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Venue({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reload = () => fetch(`/api/venues/${params.id}`).then(r => r.json()).then(setData);

  useEffect(() => { reload(); }, [params.id]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); },
      () => {}
    );
  }, []);

  // Poll order status
  useEffect(() => {
    if (!activeOrder) { if (pollRef.current) clearInterval(pollRef.current); return; }
    const poll = async () => {
      const r = await fetch("/api/orders");
      const j = await r.json();
      const found = (j.orders ?? []).find((o: any) => o.id === activeOrder.orderId);
      if (!found) return;
      if (found.status === "COMPLETED" || found.status === "CANCELLED") {
        setActiveOrder(null); return;
      }
      setActiveOrder(prev => prev ? { ...prev, status: found.status } : null);
    };
    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeOrder?.orderId]);

  async function checkIn() {
    setMsg("");
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId: params.id, lat, lng }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Checked in!");
    reload();
  }

  async function clickIt() {
    setMsg("");
    const res = await fetch("/api/clicks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId: params.id }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Click sent!");
  }

  async function placeOrder() {
    setMsg("");
    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([menuItemId, qty]) => ({ menuItemId, qty }));
    if (items.length === 0) { setMsg("Add items to cart first."); return; }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId: params.id, items }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error || "Order failed"); return; }
    setCart({});
    reload();
    setActiveOrder({
      orderId: j.orderId,
      orderCode: j.orderCode ?? "------",
      venueName: j.venueName ?? data?.venue?.name ?? "",
      status: "PLACED",
    });
  }

  function setQty(id: string, qty: number) {
    setCart(c => ({ ...c, [id]: Math.max(0, qty) }));
  }

  if (!data) return <div className="container"><p className="muted">Loading…</p></div>;

  const cartTotal = data.menu
    .reduce((s: number, m: MenuItem) => s + (cart[m.id] || 0) * m.priceCents, 0);

  return (
    <div className="container">
      {activeOrder && <OrderTracker order={activeOrder} onDismiss={() => setActiveOrder(null)} />}
      <div className="header">
        <h2>{data.venue.name}</h2>
        <span className="badge">{data.crowdLevel}/10 crowd</span>
      </div>
      <Nav role="u" />

      <p className="muted">{data.venue.type} · {data.venue.address}</p>
      {data.alcoholBlocked && (
        <p className="muted red">🚫 Alcohol service has ended for this venue.</p>
      )}

      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={checkIn}>Check in</button>
        <button className="btn secondary" onClick={clickIt}>Click ♡</button>
        <a className="btn secondary" href={`https://www.google.com/maps?q=${data.venue.lat},${data.venue.lng}`} target="_blank">Maps</a>
      </div>
      {msg && <p className="muted">{msg}</p>}

      <h3>Menu</h3>
      {data.menu.length === 0 && <p className="muted">No menu items yet.</p>}
      <div className="row">
        {data.menu.map((m: MenuItem) => {
          const blocked = m.isAlcohol && data.alcoholBlocked;
          return (
            <div key={m.id} className="card" style={{ flex: "1 1 260px", opacity: m.isAvailable && !blocked ? 1 : 0.5 }}>
              <div className="header">
                <strong>{m.name}</strong>
                <span className="badge">${(m.priceCents / 100).toFixed(2)}</span>
              </div>
              <p className="muted">{m.isAlcohol ? "🍺 Alcohol" : "🥤 N/A"}</p>
              {!m.isAvailable && <p className="muted red">Unavailable</p>}
              {blocked && <p className="muted red">After cutoff</p>}
              {m.isAvailable && !blocked && (
                <div className="row" style={{ marginTop: 8, alignItems: "center" }}>
                  <button className="btn sm secondary" onClick={() => setQty(m.id, (cart[m.id] || 0) - 1)}>−</button>
                  <span style={{ minWidth: 24, textAlign: "center" }}>{cart[m.id] || 0}</span>
                  <button className="btn sm secondary" onClick={() => setQty(m.id, (cart[m.id] || 0) + 1)}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cartTotal > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="header">
            <strong>Order total: ${(cartTotal / 100).toFixed(2)}</strong>
            <button className="btn" onClick={placeOrder}>Place Order</button>
          </div>
          <p className="muted">Wallet will be debited. Must be checked in to order.</p>
        </div>
      )}
    </div>
  );
}
