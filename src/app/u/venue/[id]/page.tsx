"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { useOrderTracker } from "@/components/OrderTrackerContext";
import { useCart } from "@/components/CartContext";

const CROWD: Record<number, { label: string; color: string }> = {
  0:  { label: "No activity", color: "#666"    },
  1:  { label: "Quiet",       color: "#2ecc71" },
  2:  { label: "Quiet",       color: "#2ecc71" },
  3:  { label: "Moderate",    color: "#a8d926" },
  4:  { label: "Moderate",    color: "#f39c12" },
  5:  { label: "Busy",        color: "#f39c12" },
  6:  { label: "Busy",        color: "#e67e22" },
  7:  { label: "Packed",      color: "#e67e22" },
  8:  { label: "Packed",      color: "#e74c3c" },
  9:  { label: "Full",        color: "#e74c3c" },
  10: { label: "Full",        color: "#c0392b" },
};

type MixerOption = { id: string; name: string; priceCents: number };

type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
  isAlcohol: boolean;
  isAvailable: boolean;
  category?: string | null;
  imageUrl?: string | null;
  mixers: MixerOption[];
};

type PromoItem = { menuItemId: string; name: string; qty: number; priceCents: number };

type Promotion = {
  id: string;
  title: string;
  description?: string | null;
  priceCents: number;
  imageUrl?: string | null;
  expiresAt?: string | null;
  maxRedeemsPerNightPerUser: number;
  hasAlcohol: boolean;
  items?: PromoItem[];
};

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default function VenuePage({ params }: { params: { id: string } }) {
  const [data, setData]           = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);
  const [lat, setLat]             = useState<number | null>(null);
  const [lng, setLng]             = useState<number | null>(null);
  const [selectedPromos, setSelectedPromos] = useState<Record<string, number>>({});
  const [mixerModal, setMixerModal] = useState<{ item: MenuItem } | null>(null);
  const [orderNote,   setOrderNote]   = useState("");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { cart, addItem, setQty: ctxSetQty, clearCart, totalCents } = useCart();
  const { addActiveOrder, bannerShowing } = useOrderTracker();

  const reload = () =>
    fetch(`/api/venues/${params.id}`)
      .then(r => r.json())
      .then((d: any) => {
        setData(d);
        setActiveTab(prev => {
          if (prev) return prev;
          const cats = Array.from(new Set((d.menu as MenuItem[]).map((m: MenuItem) => m.category || "Menu")));
          return (cats[0] as string) ?? "";
        });
      });

  useEffect(() => { reload(); }, [params.id]);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { setLat(p.coords.latitude); setLng(p.coords.longitude); },
      () => {}
    );
  }, []);

  function getQty(id: string) {
    return cart?.venueId === params.id
      ? (cart.items.find(i => i.menuItemId === id)?.qty ?? 0)
      : 0;
  }

  function adjustItem(m: MenuItem, newQty: number) {
    if (!data) return;
    if (newQty <= 0) { ctxSetQty(m.id, 0); return; }
    const already = cart?.items.find(i => i.menuItemId === m.id);
    if (already) {
      // Already in cart — just change qty (keep existing mixer)
      ctxSetQty(m.id, newQty);
    } else if (m.mixers.length > 0) {
      // Has mixer options — open picker first
      setMixerModal({ item: m });
    } else {
      addItem(params.id, data.venue.name, data.venue.lat ?? 0, data.venue.lng ?? 0, {
        menuItemId: m.id, name: m.name,
        priceCents: m.priceCents, qty: newQty, isAlcohol: m.isAlcohol,
      });
    }
  }

  function confirmMixer(mixerId: string | null) {
    if (!mixerModal || !data) { setMixerModal(null); return; }
    const m = mixerModal.item;
    const mixer = mixerId ? m.mixers.find(mx => mx.id === mixerId) : null;
    addItem(params.id, data.venue.name, data.venue.lat ?? 0, data.venue.lng ?? 0, {
      menuItemId: m.id, name: m.name,
      priceCents: m.priceCents + (mixer?.priceCents ?? 0),
      qty: 1, isAlcohol: m.isAlcohol,
      mixerId: mixer?.id,
      mixerName: mixer?.name,
    });
    setMixerModal(null);
  }

  function togglePromo(promoId: string, max: number) {
    setSelectedPromos(prev => {
      const cur = prev[promoId] ?? 0;
      if (max === 1) {
        if (cur > 0) { const n = { ...prev }; delete n[promoId]; return n; }
        return { ...prev, [promoId]: 1 };
      }
      if (cur >= max) return prev;
      return { ...prev, [promoId]: cur + 1 };
    });
  }

  function decrementPromo(promoId: string) {
    setSelectedPromos(prev => {
      const cur = prev[promoId] ?? 0;
      if (cur <= 1) { const n = { ...prev }; delete n[promoId]; return n; }
      return { ...prev, [promoId]: cur - 1 };
    });
  }

  async function checkIn() {
    setMsg(null);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId: params.id, lat, lng }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg({ text: j.error || "Check-in failed", ok: false }); return; }
    setMsg({ text: "Checked in!", ok: true });
    reload();
  }

  async function placeOrder() {
    setMsg(null);
    const venueCart = cart?.venueId === params.id ? cart.items : [];
    const items = venueCart.filter(i => i.qty > 0).map(i => ({
      menuItemId: i.menuItemId,
      qty: i.qty,
      mixerId: i.mixerId,
    }));
    const promotions = Object.entries(selectedPromos).map(([promotionId, qty]) => ({ promotionId, qty }));
    if (items.length === 0 && promotions.length === 0) {
      setMsg({ text: "Add items or a promotion first.", ok: false }); return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        venueId: params.id, items, promotions,
        note: orderNote.trim() || undefined,
      }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg({ text: j.error || "Order failed", ok: false }); return; }
    clearCart();
    setSelectedPromos({});
    setOrderNote("");
    reload();
    addActiveOrder({
      orderId: j.orderId,
      orderCode: j.orderCode ?? "----",
      orderNumber: j.orderNumber ?? "",
      venueName: j.venueName ?? data?.venue?.name ?? "",
      venueId: params.id,
      status: "PLACED",
      totalCents: j.totalCents ?? 0,
    });
    setMsg({ text: "Order placed!", ok: true });
  }

  if (!data) return (
    <div data-role="user">
      <Nav role="u" />
      <div style={{ padding: "60px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--muted-text)" }}>Loading...</p>
      </div>
    </div>
  );

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
  const crowd     = CROWD[data.crowdLevel] ?? CROWD[0];
  const cartTotal = cart?.venueId === params.id ? totalCents : 0;
  const promoTotal = Object.entries(selectedPromos).reduce((sum, [pid, qty]) => {
    const p = promotions.find(x => x.id === pid);
    return sum + (p ? p.priceCents * qty : 0);
  }, 0);
  const orderTotal = cartTotal + promoTotal;
  const hasOrder = cartTotal > 0 || Object.keys(selectedPromos).length > 0;

  return (
    <div data-role="user" style={{ paddingBottom: hasOrder ? (bannerShowing ? 232 : 164) : (bannerShowing ? 70 : 24) }}>
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .venue-tab { padding:8px 18px; border-radius:999px; font-size:13px; font-weight:700; cursor:pointer;
          border:1.5px solid var(--border); white-space:nowrap; transition:all 0.18s;
          background:transparent; color:var(--muted-text); }
        .venue-tab.active { background:var(--accent); color:#000; border-color:var(--accent); }
        .venue-tab:hover:not(.active) { border-color:rgba(8,218,244,0.4); color:var(--ink); }
        .mi-card { display:flex; gap:12px; padding:12px; background:var(--surface);
          border:1px solid var(--border); border-radius:16px; transition:box-shadow 0.2s;
          animation:fadeInUp 0.22s ease; }
        .mi-card:hover { box-shadow:0 4px 20px rgba(8,218,244,0.08); }
        .qty-btn { width:32px; height:32px; border-radius:8px; display:flex; align-items:center;
          justify-content:center; font-weight:800; font-size:18px; cursor:pointer; transition:all 0.15s; }
        .qty-minus { border:1px solid var(--border); background:var(--surface); color:var(--ink); }
        .qty-plus  { border:none; background:var(--accent); color:#000; }
        .qty-plus:disabled { background:rgba(255,255,255,0.08); color:var(--muted-text); cursor:default; }
      `}</style>

      <Nav role="u" />

      {/* Hero  landscape */}
      {data.venue.venueImageUrl ? (
        <div style={{ width:"100%", height:220, position:"relative", overflow:"hidden", background:"#0a0a0f" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.venue.venueImageUrl} alt={data.venue.name}
            style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }} />
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to top, rgba(8,10,18,0.92) 0%, rgba(0,0,0,0.1) 60%)" }} />
          {data.boostActive && (
            <div style={{ position:"absolute", top:12, right:12, background:"var(--accent)",
              color:"#000", padding:"4px 12px", borderRadius:8, fontSize:11, fontWeight:800 }}>BOOST</div>
          )}
          <div style={{ position:"absolute", bottom:14, left:16, right:60 }}>
            <h1 style={{ margin:0, fontSize:24, fontWeight:900, color:"#fff", lineHeight:1.1 }}>
              {data.venue.name}
            </h1>
            <p style={{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,0.65)" }}>
              {data.venue.type} &middot; {data.venue.address}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ padding:"24px 16px 8px" }}>
          <h1 style={{ margin:0, fontSize:26, fontWeight:900 }}>{data.venue.name}</h1>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--muted-text)" }}>
            {data.venue.type} &middot; {data.venue.address}
          </p>
        </div>
      )}

      <div style={{ padding:"0 16px" }}>

        {/* Paused venue banner */}
        {!data.venue.isEnabled && (
          <div style={{
            margin: "14px 0 10px",
            padding: "14px 16px",
            borderRadius: 14,
            background: "rgba(245,158,11,0.08)",
            border: "1.5px solid rgba(245,158,11,0.35)",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#f59e0b", marginBottom: 3 }}>
                This venue has temporarily paused service on Clicks
              </div>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Menu browsing is available but ordering is disabled until the venue resumes. Check back later.
              </div>
            </div>
          </div>
        )}

        {/* Crowd + actions */}
        <div style={{ paddingTop:data.venue.venueImageUrl ? 14 : 6, paddingBottom:4 }}>
          <div style={{ display:"flex", gap:3, marginBottom:5 }}>
            {Array.from({ length:10 }, (_, i) => (
              <div key={i} style={{
                flex:1, height:6, borderRadius:3,
                background: i < data.crowdLevel
                  ? (data.crowdLevel <= 3 ? "#2ecc71" : data.crowdLevel <= 6 ? "#f39c12" : "#e74c3c")
                  : "rgba(255,255,255,0.08)",
                transition:"background 0.3s",
              }} />
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ fontSize:12, fontWeight:600, color:crowd.color }}>{crowd.label}</span>
            {data.alcoholBlocked && (
              <span style={{ fontSize:11, color:"#f66", fontWeight:700 }}>Alcohol cutoff</span>
            )}
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <button onClick={checkIn}
              style={{ flex:1, padding:"11px 0", borderRadius:12, fontSize:13, fontWeight:700,
                background:"var(--accent)", border:"none", color:"#000", cursor:"pointer" }}>
              Check In
            </button>
            <a href={`https://www.google.com/maps?q=${data.venue.lat ?? 0},${data.venue.lng ?? 0}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex:1, padding:"11px 0", borderRadius:12, fontSize:13, fontWeight:700,
                background:"var(--surface)", border:"1.5px solid var(--border)", color:"var(--ink)",
                textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/maps.png" alt="" style={{ width:18, height:18, objectFit:"contain" }} />
              Directions
            </a>
          </div>
        </div>

        {msg && (
          <div style={{ marginBottom:14, padding:"10px 16px", borderRadius:12,
            background: msg.ok ? "rgba(46,204,113,0.1)" : "rgba(255,80,80,0.1)",
            border:`1px solid ${msg.ok ? "rgba(46,204,113,0.25)" : "rgba(255,80,80,0.25)"}`,
            color: msg.ok ? "#2ecc71" : "#f66", fontWeight:600, fontSize:14 }}>
            {msg.text}
          </div>
        )}

        {/* Promotions */}
        {promotions.length > 0 && (
          <div style={{ marginBottom:30 }}>
            <h2 style={{ margin:"0 0 14px", fontSize:18, fontWeight:800 }}>Promotions</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {promotions.map(p => {
                const qty        = selectedPromos[p.id] ?? 0;
                const isSelected = qty > 0;
                const isMaxed    = qty >= p.maxRedeemsPerNightPerUser;
                const regTotal   = p.items?.reduce((s, i) => s + i.qty * i.priceCents, 0) ?? 0;
                const promoBlocked = p.hasAlcohol && data.alcoholBlocked;
                return (
                  <div key={p.id} style={{
                    background:"var(--surface)",
                    border:`1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    borderRadius:16, overflow:"hidden",
                    boxShadow: isSelected ? "0 0 0 2px rgba(8,218,244,0.18)" : "none",
                    transition:"all 0.2s",
                    opacity: promoBlocked ? 0.5 : 1,
                  }}>
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.title}
                        style={{ width:"100%", height:150, objectFit:"cover", display:"block" }} />
                    )}
                    <div style={{ padding:"14px 16px" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:12, justifyContent:"space-between" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:800, fontSize:16, marginBottom:3 }}>{p.title}</div>
                          {p.description && (
                            <p style={{ margin:"0 0 6px", fontSize:13, color:"var(--muted-text)", lineHeight:1.5 }}>
                              {p.description}
                            </p>
                          )}
                          {p.items && p.items.length > 0 && (
                            <p style={{ margin:"0 0 6px", fontSize:12, color:"var(--muted-text)" }}>
                              {p.items.map(i => `${i.qty}\u00d7 ${i.name}`).join(" + ")}
                            </p>
                          )}
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginTop:4 }}>
                            <span style={{ fontSize:18, fontWeight:900,
                              color: p.priceCents === 0 ? "#2ecc71" : "var(--ink)" }}>
                              {p.priceCents === 0 ? "Free" : fmt(p.priceCents)}
                            </span>
                            {regTotal > 0 && regTotal > p.priceCents && (
                              <span style={{ fontSize:12, color:"var(--muted-text)", textDecoration:"line-through" }}>
                                {fmt(regTotal)}
                              </span>
                            )}
                            {regTotal > 0 && regTotal > p.priceCents && (
                              <span style={{ fontSize:11, color:"#22c55e", fontWeight:700,
                                background:"rgba(34,197,94,0.12)", padding:"2px 8px", borderRadius:20 }}>
                                Save {fmt(regTotal - p.priceCents)}
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop:4, fontSize:11, color:"var(--muted-text)" }}>
                            Max {p.maxRedeemsPerNightPerUser} per night
                          </div>
                          {promoBlocked && (
                            <div style={{ marginTop:4, fontSize:11, color:"#f66", fontWeight:600 }}>After cutoff</div>
                          )}
                        </div>
                        {promoBlocked ? (
                          <span style={{ fontSize:11, color:"#f66", fontWeight:600, flexShrink:0 }}>Unavailable</span>
                        ) : p.maxRedeemsPerNightPerUser === 1 ? (
                          <button onClick={() => togglePromo(p.id, 1)}
                            style={{ flexShrink:0, padding:"10px 20px", borderRadius:12, fontSize:13, fontWeight:700,
                              background: isSelected ? "rgba(8,218,244,0.12)" : "var(--accent)",
                              border: isSelected ? "1.5px solid var(--accent)" : "none",
                              color: isSelected ? "var(--accent)" : "#000", cursor:"pointer", transition:"all 0.2s" }}>
                            {isSelected ? "\u2713 Added" : "Add"}
                          </button>
                        ) : (
                          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                            {qty > 0 && (
                              <>
                                <button className="qty-btn qty-minus" onClick={() => decrementPromo(p.id)}>-</button>
                                <span style={{ minWidth:20, textAlign:"center", fontWeight:700 }}>{qty}</span>
                              </>
                            )}
                            <button className="qty-btn qty-plus" disabled={isMaxed}
                              onClick={() => !isMaxed && togglePromo(p.id, p.maxRedeemsPerNightPerUser)}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Menu */}
        {data.menu.length > 0 && (
          <>
            <h2 style={{ margin:"0 0 12px", fontSize:18, fontWeight:800 }}>Menu</h2>

            {sortedCats.length > 1 && (
              <div style={{
                position:"sticky", top:56, zIndex:50,
                background:"var(--bg, #080c12)",
                margin:"0 -16px", padding:"8px 16px 10px",
                borderBottom:"1px solid rgba(255,255,255,0.05)",
                marginBottom:16,
              }}>
                <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" } as React.CSSProperties}>
                  {sortedCats.map(cat => (
                    <button key={cat} className={`venue-tab${activeTab === cat ? " active" : ""}`}
                      onClick={() => {
                        setActiveTab(cat);
                        sectionRefs.current[cat]?.scrollIntoView({ behavior:"smooth", block:"start" });
                      }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sortedCats.map(cat => (
              <div key={cat} ref={el => { sectionRefs.current[cat] = el; }}
                style={{ marginBottom: 28, display: sortedCats.length <= 1 || activeTab === cat ? undefined : "none" }}>
                {sortedCats.length > 1 && (
                  <h3 style={{ margin:"0 0 12px", fontSize:13, fontWeight:800,
                    color:"var(--accent)", textTransform:"uppercase", letterSpacing:1.2 }}>
                    {cat}
                  </h3>
                )}
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {byCategory[cat].map(m => {
                    const blocked = m.isAlcohol && data.alcoholBlocked;
                    const unavail = !m.isAvailable || blocked;
                    const qty     = getQty(m.id);
                    return (
                      <div key={m.id} className="mi-card" style={{ opacity: unavail ? 0.5 : 1 }}>
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.imageUrl} alt={m.name}
                            style={{ width:82, height:82, objectFit:"cover", borderRadius:10, flexShrink:0 }} />
                        ) : (
                          <div style={{ width:82, height:82, borderRadius:10, flexShrink:0,
                            background:"rgba(255,255,255,0.04)",
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>
                            {m.isAlcohol ? "\ud83c\udf7a" : "\ud83c\udf7d\ufe0f"}
                          </div>
                        )}
                        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:15, lineHeight:1.3, marginBottom:2 }}>{m.name}</div>
                            {blocked && <div style={{ fontSize:11, color:"#f66", fontWeight:600 }}>After cutoff</div>}
                            {!m.isAvailable && !blocked && (
                              <div style={{ fontSize:11, color:"#f66", fontWeight:600 }}>Unavailable</div>
                            )}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:6 }}>
                            <span style={{ fontWeight:800, fontSize:15 }}>{fmt(m.priceCents)}</span>
                            {!unavail && (
                              qty > 0 ? (
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <button className="qty-btn qty-minus" onClick={() => adjustItem(m, qty - 1)}>-</button>
                                  <span style={{ minWidth:20, textAlign:"center", fontWeight:700, fontSize:15 }}>{qty}</span>
                                  <button className="qty-btn qty-plus" onClick={() => adjustItem(m, qty + 1)}>+</button>
                                </div>
                              ) : (
                                <button onClick={() => adjustItem(m, 1)}
                                  style={{ padding:"7px 18px", borderRadius:10, border:"none",
                                    background:"var(--accent)", color:"#000", fontWeight:700,
                                    cursor:"pointer", fontSize:13 }}>
                                  Add
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {data.menu.length === 0 && promotions.length === 0 && (
          <p style={{ color:"var(--muted-text)", textAlign:"center", paddingTop:32 }}>No menu items yet.</p>
        )}

      </div>

      {/* Sticky cart/order footer */}
      {hasOrder && (
        <div style={{
          position:"fixed", bottom: bannerShowing ? 64 : 0, left:0, right:0, zIndex:100,
          padding:"12px 16px env(safe-area-inset-bottom,12px)",
          background:"rgba(8,10,18,0.97)", backdropFilter:"blur(12px)",
          borderTop:"1px solid rgba(8,218,244,0.22)",
          boxShadow:"0 -8px 32px rgba(8,218,244,0.1)",
          transition:"bottom 0.25s",
        }}>
          <div style={{ maxWidth:640, margin:"0 auto" }}>
            {/* Order note input */}
            <div style={{ marginBottom:8 }}>
              <input
                value={orderNote}
                onChange={e => setOrderNote(e.target.value.slice(0, 50))}
                placeholder="Add a note for your order… (optional)"
                maxLength={50}
                style={{
                  width:"100%", boxSizing:"border-box",
                  background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:10, color:"var(--ink)", fontSize:13, padding:"8px 12px",
                }}
              />
              {orderNote.length > 0 && (
                <span style={{ float:"right", fontSize:11, color:"var(--muted-text)", marginTop:2 }}>
                  {orderNote.length}/50
                </span>
              )}
            </div>
            <button onClick={placeOrder}
              style={{ width:"100%", padding:"15px 0", borderRadius:14, fontSize:15, fontWeight:900,
                background:"var(--accent)", border:"none", color:"#000", cursor:"pointer",
                boxShadow:"0 4px 18px rgba(8,218,244,0.32)" }}>
              {orderTotal > 0 ? `Place Order · ${fmt(orderTotal)}` : "Place Order · Free"}
            </button>
            <p style={{ margin:"6px 0 0", fontSize:11, color:"var(--muted-text)", textAlign:"center" }}>
              Wallet debited &middot; Check-in required
            </p>
          </div>
        </div>
      )}

      {/* Mixer picker modal */}
      {mixerModal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", zIndex:200,
          display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 0 env(safe-area-inset-bottom,0)",
        }}
          onClick={() => setMixerModal(null)}
        >
          <div style={{
            background:"var(--surface)", borderRadius:"20px 20px 0 0",
            width:"100%", maxWidth:560, padding:"24px 20px 32px",
            border:"1px solid var(--border)",
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight:800, fontSize:17, marginBottom:4 }}>
              Choose a Mixer
            </div>
            <p style={{ margin:"0 0 16px", fontSize:13, color:"var(--muted-text)" }}>
              For: <strong>{mixerModal.item.name}</strong>
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <button
                onClick={() => confirmMixer(null)}
                style={{
                  padding:"12px 16px", borderRadius:12, textAlign:"left",
                  background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)",
                  color:"var(--ink)", fontSize:14, cursor:"pointer", fontWeight:600,
                }}
              >
                No mixer / Straight
              </button>
              {mixerModal.item.mixers.map(mx => (
                <button
                  key={mx.id}
                  onClick={() => confirmMixer(mx.id)}
                  style={{
                    padding:"12px 16px", borderRadius:12, textAlign:"left",
                    background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)",
                    color:"var(--ink)", fontSize:14, cursor:"pointer", fontWeight:600,
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                  }}
                >
                  <span>{mx.name}</span>
                  {mx.priceCents > 0
                    ? <span style={{ color:"var(--accent)", fontSize:13 }}>+{fmt(mx.priceCents)}</span>
                    : <span style={{ color:"#22c55e", fontSize:13 }}>Free</span>
                  }
                </button>
              ))}
            </div>
            <button
              onClick={() => setMixerModal(null)}
              style={{
                marginTop:16, width:"100%", padding:"11px 0", borderRadius:12,
                background:"transparent", border:"1px solid var(--border)",
                color:"var(--muted-text)", fontSize:14, cursor:"pointer",
              }}
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}