
"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { useOrderTracker } from "@/components/OrderTrackerContext";

type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
  isAlcohol: boolean;
  isAvailable: boolean;
  category?: string | null;
  imageUrl?: string | null;
};

type Promotion = {
  id: string;
  title: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  expiresAt?: string | null;
};

export default function Venue({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const { setActiveOrder } = useOrderTracker();

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
    setCart({});
    reload();
    setActiveOrder({
      orderId: j.orderId,
      orderCode: j.orderCode ?? "----",
      orderNumber: j.orderNumber ?? "",
      venueName: j.venueName ?? data?.venue?.name ?? "",
      venueId: params.id,
      status: "PLACED",
      totalCents: j.totalCents ?? 0,
    });
  }

  function setQty(id: string, qty: number) {
    setCart(c => ({ ...c, [id]: Math.max(0, qty) }));
  }

  if (!data) return <div className="container"><p className="muted">Loading…</p></div>;

  const cartTotal = (data.menu as MenuItem[])
    .reduce((s, m) => s + (cart[m.id] || 0) * m.priceCents, 0);

  // Group menu items by category
  const categoryOrder: string[] = [];
  const byCategory: Record<string, MenuItem[]> = {};
  for (const m of data.menu as MenuItem[]) {
    const cat = m.category || "Menu";
    if (!byCategory[cat]) { byCategory[cat] = []; categoryOrder.push(cat); }
    byCategory[cat].push(m);
  }
  const hasNamedCats = categoryOrder.some(c => c !== "Menu");
  const sortedCats = hasNamedCats
    ? [...categoryOrder.filter(c => c !== "Menu"), ...(byCategory["Menu"] ? ["Menu"] : [])]
    : categoryOrder;

  const promotions: Promotion[] = data.promotions ?? [];

  return (
    <div className="container">
      <div className="header">
        <h2>{data.venue.name}</h2>
        <span className="badge">{data.crowdLevel}/10 crowd</span>
      </div>
      <Nav role="u" />

      {data.venue.venueImageUrl && (
        <img
          src={data.venue.venueImageUrl}
          alt={data.venue.name}
          style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, marginBottom: 12 }}
        />
      )}

      <p className="muted">{data.venue.type} · {data.venue.address}</p>
      {data.alcoholBlocked && (
        <p className="muted red">Alcohol service has ended for this venue.</p>
      )}

      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn" onClick={checkIn}>Check in</button>
        <button className="btn secondary" onClick={clickIt}>Click</button>
        <a className="btn secondary" href={`https://www.google.com/maps?q=${data.venue.lat},${data.venue.lng}`} target="_blank">Maps</a>
      </div>
      {msg && <p className="muted">{msg}</p>}

      {promotions.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Promotions</h3>
          <div className="row" style={{ flexWrap: "wrap" }}>
            {promotions.map((p) => (
              <div key={p.id} className="card" style={{ flex: "1 1 260px" }}>
                {p.imageUrl && (
                  <img src={p.imageUrl} alt={p.title}
                    style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                )}
                <div className="header">
                  <strong>{p.title}</strong>
                  <span className="badge" style={{ color: "#08daf4" }}>
                    {p.priceCents === 0 ? "Free" : `$${(p.priceCents / 100).toFixed(2)}`}
                  </span>
                </div>
                {p.description && <p className="muted" style={{ margin: "4px 0" }}>{p.description}</p>}
                {p.expiresAt && (
                  <p className="muted" style={{ fontSize: 12 }}>
                    Expires {new Date(p.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ marginTop: 24 }}>Menu</h3>
      {data.menu.length === 0 && <p className="muted">No menu items yet.</p>}

      {sortedCats.map((cat) => (
        <div key={cat}>
          {(sortedCats.length > 1 || cat !== "Menu") && (
            <h4 style={{ margin: "16px 0 8px", color: "#08daf4", textTransform: "uppercase", fontSize: 13, letterSpacing: 1 }}>
              {cat}
            </h4>
          )}
          <div className="row" style={{ flexWrap: "wrap" }}>
            {byCategory[cat].map((m) => {
              const blocked = m.isAlcohol && data.alcoholBlocked;
              return (
                <div key={m.id} className="card" style={{ flex: "1 1 200px", opacity: m.isAvailable && !blocked ? 1 : 0.5 }}>
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt={m.name}
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />
                  )}
                  <div className="header">
                    <strong>{m.name}</strong>
                    <span className="badge">${(m.priceCents / 100).toFixed(2)}</span>
                  </div>
                  <p className="muted">{m.isAlcohol ? "Alcohol" : "Non-alcoholic"}</p>
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
        </div>
      ))}

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