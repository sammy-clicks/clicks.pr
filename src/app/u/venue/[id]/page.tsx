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

function OrderTracker({ order, onClose }: { order: ActiveOrder; onClose: () => void }) {
  const phaseIdx = PHASES.findIndex(p => p.key === order.status);
  const current = phaseIdx === -1 ? 0 : phaseIdx;
  const isReady = order.status === "READY";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px",
    }}>
      <div style={{
        background: "var(--surface, #1a1a2e)", borderRadius: 16, padding: "32px 24px",
        maxWidth: 420, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 16, background: "none",
          border: "none", fontSize: 22, cursor: "pointer", color: "inherit", opacity: 0.6,
        }}>✕</button>

        <p className="muted" style={{ margin: "0 0 4px", fontSize: 13 }}>{order.venueName}</p>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 6, marginBottom: 4 }}>
          #{order.orderCode}
        </div>
        <p className="muted" style={{ margin: "0 0 28px", fontSize: 13 }}>Show this code to venue staff</p>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          {PHASES.map((p, i) => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", flex: i < PHASES.length - 1 ? 1 : undefined }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: i <= current ? "#9b5de5" : "rgba(255,255,255,0.15)",
                fontWeight: 700, fontSize: 13, color: "#fff",
                boxShadow: i === current ? "0 0 0 3px #9b5de580" : "none",
                transition: "all 0.3s",
              }}>{i < current ? "✓" : i + 1}</div>
              {i < PHASES.length - 1 && (
                <div style={{
                  flex: 1, height: 3, margin: "0 4px",
                  background: i < current ? "#9b5de5" : "rgba(255,255,255,0.15)",
                  transition: "background 0.3s",
                }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          {PHASES.map((p, i) => (
            <div key={p.key} style={{
              fontSize: 11, textAlign: "center", width: 60,
              color: i === current ? "#fff" : "rgba(255,255,255,0.4)",
              fontWeight: i === current ? 700 : 400,
            }}>{p.label}</div>
          ))}
        </div>

        {isReady && (
          <div style={{
            background: "rgba(155,93,229,0.15)", border: "1px solid #9b5de5",
            borderRadius: 10, padding: "14px 16px", fontSize: 14,
          }}>
            🪪 <strong>Have your ID ready:</strong> Passport · Issued driver's license
          </div>
        )}

        {!isReady && (
          <p className="muted" style={{ textAlign: "center", fontSize: 12, margin: 0 }}>
            Auto-updating every 10 seconds…
          </p>
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
      {activeOrder && <OrderTracker order={activeOrder} onClose={() => setActiveOrder(null)} />}
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
