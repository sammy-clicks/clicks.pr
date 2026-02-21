"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

type MenuItem = { id: string; name: string; priceCents: number; isAlcohol: boolean; isAvailable: boolean };

export default function Venue({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});

  const reload = () => fetch(`/api/venues/${params.id}`).then(r => r.json()).then(setData);

  useEffect(() => { reload(); }, [params.id]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); },
      () => {}
    );
  }, []);

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
    setMsg("Order placed!");
    setCart({});
    reload();
  }

  function setQty(id: string, qty: number) {
    setCart(c => ({ ...c, [id]: Math.max(0, qty) }));
  }

  if (!data) return <div className="container"><p className="muted">Loading…</p></div>;

  const cartTotal = data.menu
    .reduce((s: number, m: MenuItem) => s + (cart[m.id] || 0) * m.priceCents, 0);

  return (
    <div className="container">
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
