"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { PinGate } from "@/components/PinGate";

function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }

interface PromoItem {
  menuItemId: string;
  name: string;
  qty: number;
  priceCents: number;
}

interface MenuItem {
  id: string;
  name: string;
  priceCents: number;
  category?: string | null;
  isAlcohol: boolean;
  isAvailable: boolean;
  imageUrl?: string | null;
}

const EMPTY_FORM = {
  title: "",
  priceCents: 0,
  items: [] as PromoItem[],
  maxRedeemsPerNightPerUser: 1,
  isDraft: false,
};

interface Promo {
  id: string; title: string;
  priceCents: number; active: boolean;
  isDraft: boolean; expiresAt?: string;
  maxRedeemsPerNightPerUser: number; createdAt: string;
  items?: PromoItem[];
}

interface ConfirmInfo {
  title: string; priceCents: number;
  items?: PromoItem[];
  venueName?: string;
  draftId?: string;
}

export default function VenuePromotions() {
  const [active, setActive]       = useState<Promo[]>([]);
  const [drafts, setDrafts]       = useState<Promo[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isPro, setIsPro]         = useState<boolean | null>(null);
  const [venueName, setVenueName] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [editId, setEditId]       = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [confirmInfo, setConfirmInfo] = useState<ConfirmInfo | null>(null);
  const [publishing, setPublishing]  = useState(false);
  const [error, setError]    = useState("");
  const [loading, setLoading] = useState(true);
  const [nextCutoff, setNextCutoff] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [rPromos, rPlan] = await Promise.all([
      fetch("/api/v/promotions"),
      fetch("/api/v/plan"),
    ]);
    const jPromos = await rPromos.json();
    const jPlan   = await rPlan.json();
    if (rPromos.ok) {
      setActive(jPromos.active ?? []);
      setDrafts(jPromos.drafts ?? []);
      setNextCutoff(jPromos.nextCutoff ?? null);
      setMenuItems(jPromos.menuItems ?? []);
    }
    if (rPlan.ok) { setIsPro(jPlan.plan === "PRO"); setVenueName(jPlan.venueName ?? ""); }
    else if (jPromos.error) setError(jPromos.error);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditId(null); setForm({ ...EMPTY_FORM }); setItemSearch(""); setShowForm(true);
    setTimeout(() => searchRef.current?.focus(), 120);
  }
  function startEdit(p: Promo) {
    setEditId(p.id);
    setForm({
      title: p.title,
      priceCents: p.priceCents / 100,
      items: p.items ?? [],
      maxRedeemsPerNightPerUser: p.maxRedeemsPerNightPerUser,
      isDraft: p.isDraft,
    });
    setItemSearch(""); setShowForm(true);
  }
  function cancelForm() {
    setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); setItemSearch("");
  }

  //  Item management 
  function addItem(m: MenuItem) {
    setForm(f => {
      const exists = f.items.find(i => i.menuItemId === m.id);
      if (exists) {
        return { ...f, items: f.items.map(i => i.menuItemId === m.id ? { ...i, qty: i.qty + 1 } : i) };
      }
      return { ...f, items: [...f.items, { menuItemId: m.id, name: m.name, qty: 1, priceCents: m.priceCents }] };
    });
  }
  function removeItem(menuItemId: string) {
    setForm(f => ({ ...f, items: f.items.filter(i => i.menuItemId !== menuItemId) }));
  }
  function setItemQty(menuItemId: string, qty: number) {
    if (qty <= 0) { removeItem(menuItemId); return; }
    setForm(f => ({ ...f, items: f.items.map(i => i.menuItemId === menuItemId ? { ...i, qty } : i) }));
  }

  const regularTotal = form.items.reduce((s, i) => s + i.qty * i.priceCents, 0);
  const promoTotalCents = Math.round(form.priceCents * 100);
  const savings = regularTotal - promoTotalCents;
  const savingsPct = regularTotal > 0 && savings > 0 ? Math.round((savings / regularTotal) * 100) : 0;

  const filteredMenuItems = itemSearch
    ? menuItems.filter(m =>
        m.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        (m.category ?? "").toLowerCase().includes(itemSearch.toLowerCase()))
    : menuItems;
  const groupedItems: Record<string, MenuItem[]> = {};
  for (const m of filteredMenuItems) { const cat = m.category || "Menu"; if (!groupedItems[cat]) groupedItems[cat] = []; groupedItems[cat].push(m); }
  const groupedCats = Object.keys(groupedItems).sort();

  async function saveDraft() {
    if (!form.title.trim()) { alert("Please enter a promotion title."); return; }
    setSaving(true);
    const body = {
      title: form.title,
      priceCents: promoTotalCents,
      items: JSON.stringify(form.items),
      maxRedeemsPerNightPerUser: form.maxRedeemsPerNightPerUser,
      isDraft: true,
    };
    const url    = editId ? `/api/v/promotions/${editId}` : "/api/v/promotions";
    const method = editId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { alert(j.error || "Failed to save draft."); return; }
    cancelForm(); load();
  }

  function requestPublish() {
    if (!form.title.trim()) { alert("Please enter a promotion title."); return; }
    if (form.items.length === 0) { alert("Add at least one menu item to the promotion."); return; }
    setConfirmInfo({ title: form.title, priceCents: promoTotalCents, items: form.items, venueName });
  }

  async function confirmPublish() {
    setPublishing(true);
    const body = confirmInfo?.draftId
      ? { isDraft: false }
      : {
          title: form.title,
          priceCents: promoTotalCents,
          items: JSON.stringify(form.items),
          maxRedeemsPerNightPerUser: form.maxRedeemsPerNightPerUser,
          isDraft: false,
        };
    const url    = confirmInfo?.draftId ? `/api/v/promotions/${confirmInfo.draftId}` : (editId ? `/api/v/promotions/${editId}` : "/api/v/promotions");
    const method = (confirmInfo?.draftId || editId) ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setPublishing(false);
    if (!r.ok) { alert(j.error || "Failed to publish."); return; }
    setConfirmInfo(null); cancelForm(); load();
  }

  function requestPublishDraft(p: Promo) {
    setConfirmInfo({ title: p.title, priceCents: p.priceCents, items: p.items, venueName, draftId: p.id });
  }

  async function deletePromo(id: string) {
    if (!window.confirm("Delete this promotion? This cannot be undone.")) return;
    const r = await fetch(`/api/v/promotions/${id}`, { method: "DELETE" });
    if (!r.ok) { const j = await r.json(); alert(j.error || "Failed to delete."); return; }
    load();
  }

  function fmtCutoff(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: "America/Puerto_Rico",
      weekday: "long", month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }

  function fmtExpiry(iso?: string) {
    if (!iso) return "tonight at cutoff";
    const d = new Date(iso);
    const tz = "America/Puerto_Rico";
    return d.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" }) + " at " +
      d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  }

  function ItemsLine({ items }: { items?: PromoItem[] }) {
    if (!items || items.length === 0) return null;
    return (
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
        {items.map(i => `${i.qty}x ${i.name}`).join(" + ")}
      </div>
    );
  }

  if (error) return <div className="container"><Nav role="v" /><p className="muted">{error}</p></div>;

  return (
    <PinGate alwaysPrompt>
    <div className="container">
      <div className="header">
        <h2 style={{ color: "var(--venue-brand)", fontSize: "1.7rem" }}>Promotions &mdash; {venueName}</h2>
        {isPro === false && !loading && <a href="/v/plan"><button className="btn secondary">{"⭐"} Upgrade to PRO</button></a>}
      </div>
      <Nav role="v" />

      {loading && <p className="muted">Loading...</p>}

      {isPro === false && !loading && (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{"⭐"}</div>
          <h3 style={{ margin: "0 0 8px" }}>PRO feature</h3>
          <p className="muted">Upgrade to PRO ($49/mo) to create and manage nightly promotions.</p>
          <a href="/v/plan"><button className="btn" style={{ marginTop: 12 }}>See Plan Details</button></a>
        </div>
      )}

      {isPro === true && !loading && (
        <>
          {/* Active */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Active ({active.length})</h3>
            <button className="btn" onClick={startCreate}>+ New Promo</button>
          </div>
          {active.length === 0
            ? <p className="muted" style={{ marginBottom: 20 }}>No active promotions right now.</p>
            : active.map(p => {
              const items: PromoItem[] = p.items ?? [];
              const regTotal = items.reduce((s, i) => s + i.qty * i.priceCents, 0);
              const savings = regTotal - p.priceCents;
              return (
                <div key={p.id} style={{ borderRadius: 14, background: "var(--surface)", border: "1px solid rgba(34,197,94,0.3)", marginBottom: 10, display: "flex", overflow: "hidden" }}>
                  {/* Green left bar */}
                  <div style={{ width: 4, background: "#22c55e", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "13px 14px 12px" }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{p.title}</span>
                      <span className="badge active" style={{ fontSize: 10 }}>Live</span>
                      {p.priceCents > 0 && <span className="badge" style={{ fontSize: 11, fontWeight: 700 }}>{$$(p.priceCents)}</span>}
                      {savings > 0 && <span style={{ backgroundColor: "#22c55e22", border: "1px solid #22c55e55", borderRadius: 6, padding: "2px 7px", fontSize: 10, color: "#22c55e", fontWeight: 700 }}>Save {$$(savings)}</span>}
                    </div>
                    {/* Items */}
                    {items.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        {items.map(i => (
                          <span key={i.menuItemId} style={{ display: "inline-block", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 8px", fontSize: 11, marginRight: 5, marginBottom: 4 }}>
                            {i.qty}× {i.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Pricing line */}
                    {regTotal > 0 && p.priceCents > 0 && (
                      <div className="muted" style={{ fontSize: 11, marginBottom: 5 }}>
                        Regular <strong>{$$(regTotal)}</strong> → Promo <strong style={{ color: "#22c55e" }}>{$$(p.priceCents)}</strong>
                      </div>
                    )}
                    {/* Footer */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      <span className="muted" style={{ fontSize: 11 }}>
                        Expires {fmtExpiry(p.expiresAt)} · max {p.maxRedeemsPerNightPerUser}/user/night
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn sm secondary" onClick={() => startEdit(p)}>Edit</button>
                        <button className="btn sm secondary" style={{ color: "#f55" }} onClick={() => deletePromo(p.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          }

          {/* Drafts */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 8 }}>
            <h3 style={{ margin: 0 }}>Drafts ({drafts.length})</h3>
          </div>
          {drafts.length === 0
            ? <p className="muted">No saved drafts.</p>
            : drafts.map(p => {
              const items: PromoItem[] = p.items ?? [];
              return (
                <div key={p.id} style={{ borderRadius: 14, background: "var(--surface)", border: "1px dashed rgba(245,158,11,0.45)", marginBottom: 10, display: "flex", overflow: "hidden", opacity: 0.92 }}>
                  {/* Amber left bar */}
                  <div style={{ width: 4, background: "#f59e0b", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "13px 14px 12px" }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{p.title}</span>
                      <span style={{ background: "#f59e0b22", border: "1px solid #f59e0b66", borderRadius: 6, padding: "2px 7px", fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>Draft</span>
                      {p.priceCents > 0 && <span className="muted" style={{ fontSize: 12 }}>{$$(p.priceCents)}</span>}
                    </div>
                    {/* Items */}
                    {items.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        {items.map(i => (
                          <span key={i.menuItemId} style={{ display: "inline-block", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "2px 8px", fontSize: 11, marginRight: 5, marginBottom: 4 }}>
                            {i.qty}× {i.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn sm" style={{ background: "#f59e0b", color: "#000", fontWeight: 700 }} onClick={() => requestPublishDraft(p)}>Publish</button>
                      <button className="btn sm secondary" onClick={() => startEdit(p)}>Edit</button>
                      <button className="btn sm secondary" style={{ color: "#f55" }} onClick={() => deletePromo(p.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </>
      )}

      {/*  Create / Edit form modal  */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, overflowY: "auto", padding: "24px 16px" }}>
          <div className="card" style={{ maxWidth: 520, margin: "0 auto", position: "relative" }}>
            <h3 style={{ marginTop: 0 }}>{editId ? "Edit Promotion" : "New Promotion"}</h3>

            {/* Title */}
            <label htmlFor="promo-title" style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Title *</label>
            <input id="promo-title" className="input" placeholder="e.g. Happy Hour Bundle" maxLength={80}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

            {/* Selected items */}
            <div style={{ margin: "16px 0 8px" }}>
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Bundle Items</div>

              {form.items.length === 0 && (
                <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>No items added yet. Select from your menu below.</p>
              )}

              {form.items.map(item => (
                <div key={item.menuItemId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "8px 10px", borderRadius: 8, background: "rgba(231,168,255,0.06)", border: "1px solid rgba(231,168,255,0.2)" }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                  <span className="muted" style={{ fontSize: 12, minWidth: 52 }}>{$$(item.qty * item.priceCents)}</span>
                  <button className="btn sm secondary" onClick={() => setItemQty(item.menuItemId, item.qty - 1)} style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>&minus;</button>
                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700 }}>{item.qty}</span>
                  <button className="btn sm secondary" onClick={() => setItemQty(item.menuItemId, item.qty + 1)} style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  <button onClick={() => removeItem(item.menuItemId)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>&times;</button>
                </div>
              ))}

              {regularTotal > 0 && (
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted-text)", marginTop: 4 }}>
                  Regular total: <strong>{$$(regularTotal)}</strong>
                </div>
              )}
            </div>

            {/* Menu item picker */}
            <div style={{ marginBottom: 16 }}>
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Add from Menu</div>
              {menuItems.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>No menu items found. Add items to your menu first.</p>
              ) : (
                <>
                  <input
                    ref={searchRef}
                    className="input"
                    placeholder="Search..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    style={{ marginBottom: 8, fontSize: 13, padding: "6px 10px" }}
                  />
                  <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                    {groupedCats.map(cat => (
                      <div key={cat}>
                        {groupedCats.length > 1 && (
                          <div style={{ padding: "6px 12px 3px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-text)", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            {cat}
                          </div>
                        )}
                        {groupedItems[cat].map(m => {
                          const bundled = form.items.find(i => i.menuItemId === m.id);
                          return (
                            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: bundled ? "rgba(231,168,255,0.05)" : "transparent" }}>
                              {m.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.imageUrl} alt={m.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                                  {m.isAlcohol ? "🍺" : "🍽️"}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                                <div className="muted" style={{ fontSize: 11 }}>{$$(m.priceCents)}</div>
                              </div>
                              {bundled ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                  <button className="btn sm secondary" onClick={() => setItemQty(m.id, bundled.qty - 1)} style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>&minus;</button>
                                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700, fontSize: 14 }}>{bundled.qty}</span>
                                  <button className="btn sm secondary" onClick={() => setItemQty(m.id, bundled.qty + 1)} style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                                </div>
                              ) : (
                                <button className="btn sm" onClick={() => addItem(m)} style={{ flexShrink: 0, padding: "4px 12px", fontSize: 12 }}>Add</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {filteredMenuItems.length === 0 && <p className="muted" style={{ fontSize: 13, padding: "12px 16px", margin: 0 }}>No items match.</p>}
                  </div>
                </>
              )}
            </div>

            {/* Promotion price */}
            <label htmlFor="promo-price" style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
              Promotion Price (USD)
              {regularTotal > 0 && <span className="muted" style={{ fontSize: 11, marginLeft: 8 }}>Regular: {$$(regularTotal)}</span>}
            </label>
            <input id="promo-price" type="number" className="input" min={0} step={0.01} placeholder="0.00"
              value={form.priceCents === 0 ? "" : form.priceCents}
              onChange={e => setForm(f => ({ ...f, priceCents: parseFloat(e.target.value) || 0 }))} />
            {regularTotal > 0 && promoTotalCents > 0 && (
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {savings > 0
                  ? <span style={{ color: "#22c55e" }}>Customers save {$$(savings)} ({savingsPct}% off)</span>
                  : savings < 0
                  ? <span style={{ color: "#f59e0b" }}>\u26a0\ufe0f Promo price exceeds regular total.</span>
                  : "No discount."}
              </p>
            )}

            {/* Max redeems */}
            <label htmlFor="promo-redeems" style={{ display: "block", margin: "12px 0 4px", fontSize: 13 }}>Max redeems per user per night</label>
            <input id="promo-redeems" type="number" className="input" min={1} max={99}
              value={form.maxRedeemsPerNightPerUser}
              onChange={e => setForm(f => ({ ...f, maxRedeemsPerNightPerUser: parseInt(e.target.value) || 1 }))} />

            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button className="btn" onClick={requestPublish} disabled={saving || !form.title || form.items.length === 0}>
                {saving ? "..." : editId ? "Update & Publish" : "Publish Now"}
              </button>
              <button className="btn secondary" onClick={saveDraft} disabled={saving || !form.title}>
                {saving ? "..." : "Save as Draft"}
              </button>
              <button className="btn secondary" onClick={cancelForm} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/*  Confirmation popup  */}
      {confirmInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 420, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>Confirm Promotion</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              Create this promotion for <strong>{confirmInfo.venueName || "your venue"}</strong>?
            </p>
            <div className="card" style={{ background: "var(--surface)", marginBottom: 12 }}>
              <h4 style={{ margin: "0 0 8px", fontWeight: 700 }}>{confirmInfo.title}</h4>
              {confirmInfo.items && confirmInfo.items.length > 0 && (
                <div>
                  {confirmInfo.items.map(i => (
                    <div key={i.menuItemId} style={{ fontSize: 13, color: "var(--muted-text)", marginBottom: 2 }}>
                      {i.qty}&times; {i.name} <span style={{ marginLeft: 8 }}>{$$(i.qty * i.priceCents)}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, marginTop: 6, color: "var(--muted-text)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
                    Regular total: {$$(confirmInfo.items.reduce((s, i) => s + i.qty * i.priceCents, 0))}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: "var(--venue-brand)" }}>
                Promo Price: {confirmInfo.priceCents > 0 ? $$(confirmInfo.priceCents) : "Free"}
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>Active until:</p>
            {nextCutoff && (
              <div style={{ background: "var(--venue-brand-dim)", border: "1.5px solid var(--venue-brand)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 14, fontWeight: 600, color: "var(--venue-brand)" }}>
                {fmtCutoff(nextCutoff)}
              </div>
            )}
            <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>It will be automatically deleted at that time.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={confirmPublish} disabled={publishing}>
                {publishing ? "Publishing..." : "Confirm & Publish"}
              </button>
              <button className="btn secondary" onClick={() => setConfirmInfo(null)} disabled={publishing}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PinGate>
  );
}
