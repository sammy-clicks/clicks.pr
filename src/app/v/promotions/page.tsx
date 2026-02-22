"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }

const EMPTY_FORM = {
  title: "", description: "", priceCents: 0, imageUrl: "",
  maxRedeemsPerNightPerUser: 1, isDraft: false,
};

interface Promo {
  id: string; title: string; description?: string;
  priceCents: number; imageUrl?: string; active: boolean;
  isDraft: boolean; expiresAt?: string;
  maxRedeemsPerNightPerUser: number; createdAt: string;
}

interface ConfirmInfo {
  title: string; description?: string; priceCents: number;
  expiresAt?: string; venueName?: string;
  draftId?: string; // set when publishing a draft
}

export default function VenuePromotions() {
  const [active, setActive]   = useState<Promo[]>([]);
  const [drafts, setDrafts]   = useState<Promo[]>([]);
  const [isPro, setIsPro]     = useState(false);
  const [venueName, setVenueName] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [editId, setEditId]       = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [confirmInfo, setConfirmInfo]     = useState<ConfirmInfo | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [rPromos, rPlan] = await Promise.all([
      fetch("/api/v/promotions"),
      fetch("/api/v/plan"),
    ]);
    const jPromos = await rPromos.json();
    const jPlan   = await rPlan.json();
    if (rPromos.ok) { setActive(jPromos.active ?? []); setDrafts(jPromos.drafts ?? []); }
    if (rPlan.ok)   { setIsPro(jPlan.plan === "PRO"); setVenueName(jPlan.venueName ?? ""); }
    else if (jPromos.error) setError(jPromos.error);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate() { setEditId(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }
  function startEdit(p: Promo) {
    setEditId(p.id);
    setForm({ title: p.title, description: p.description ?? "", priceCents: p.priceCents,
      imageUrl: p.imageUrl ?? "", maxRedeemsPerNightPerUser: p.maxRedeemsPerNightPerUser, isDraft: p.isDraft });
    setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); }

  /** Save as draft â€” no confirmation needed */
  async function saveDraft() {
    setSaving(true);
    const body = { ...form, isDraft: true, priceCents: Number(form.priceCents) * 100 };
    const url  = editId ? `/api/v/promotions/${editId}` : "/api/v/promotions";
    const method = editId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { alert(j.error || "Failed to save draft."); return; }
    cancelForm(); load();
  }

  /** Open confirmation popup before publishing */
  async function requestPublish() {
    // Fetch next expiry info from a preview so we can show it in the popup
    setConfirmInfo({
      title: form.title,
      description: form.description || undefined,
      priceCents: Number(form.priceCents) * 100,
      venueName,
      // expiresAt will be filled by the API on actual publish
    });
  }

  /** Actually publish (after confirm) */
  async function confirmPublish() {
    setPublishing(true);
    const body = confirmInfo?.draftId
      ? { isDraft: false }  // publishing existing draft
      : { ...form, isDraft: false, priceCents: Number(form.priceCents) * 100 };
    const url    = confirmInfo?.draftId ? `/api/v/promotions/${confirmInfo.draftId}` : (editId ? `/api/v/promotions/${editId}` : "/api/v/promotions");
    const method = (confirmInfo?.draftId || editId) ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setPublishing(false);
    if (!r.ok) { alert(j.error || "Failed to publish."); return; }
    setConfirmInfo(null); cancelForm(); load();
  }

  /** Publish button on a draft card */
  function requestPublishDraft(p: Promo) {
    setConfirmInfo({ title: p.title, description: p.description, priceCents: p.priceCents, venueName, draftId: p.id });
  }

  async function deletePromo(id: string) {
    if (!window.confirm(`Delete this promotion? This cannot be undone.`)) return;
    const r = await fetch(`/api/v/promotions/${id}`, { method: "DELETE" });
    if (!r.ok) { const j = await r.json(); alert(j.error || "Failed to delete."); return; }
    load();
  }

  function fmtExpiry(iso?: string) {
    if (!iso) return "tonight at cutoff";
    const d = new Date(iso);
    const tz = "America/Puerto_Rico";
    return d.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" })
      + " at "
      + d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  }

  if (error) return <div className="container"><Nav role="v" /><p className="muted">{error}</p></div>;

  return (
    <div className="container">
      <Nav role="v" />
      <div className="header">
        <h2>Promotions</h2>
        {isPro
          ? <button className="btn" onClick={startCreate}>+ New Promo</button>
          : <a href="/v/plan"><button className="btn secondary">â­ Upgrade to PRO</button></a>
        }
      </div>

      {loading && <p className="muted">Loadingâ€¦</p>}

      {!isPro && !loading && (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>â­</div>
          <h3 style={{ margin: "0 0 8px" }}>PRO feature</h3>
          <p className="muted">Upgrade to PRO ($49/mo) to create and manage nightly promotions.</p>
          <a href="/v/plan"><button className="btn" style={{ marginTop: 12 }}>See Plan Details</button></a>
        </div>
      )}

      {isPro && !loading && (
        <>
          {/* â”€â”€ Active promotions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <h3>Active ({active.length})</h3>
          {active.length === 0
            ? <p className="muted">No active promotions right now.</p>
            : active.map(p => (
              <div key={p.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt="" style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{p.title}</strong>
                      <span className="badge active" style={{ fontSize: 11 }}>Live</span>
                      {p.priceCents > 0 && <span className="badge" style={{ fontSize: 11 }}>{$$(p.priceCents)}</span>}
                    </div>
                    {p.description && <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{p.description}</p>}
                    <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      Expires {fmtExpiry(p.expiresAt)} Â· max {p.maxRedeemsPerNightPerUser} redeem{p.maxRedeemsPerNightPerUser !== 1 ? "s" : ""}/user/night
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn sm secondary" onClick={() => startEdit(p)}>Edit</button>
                    <button className="btn sm secondary" style={{ color: "#f55" }} onClick={() => deletePromo(p.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          }

          {/* â”€â”€ Drafts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <h3>Drafts ({drafts.length})</h3>
          {drafts.length === 0
            ? <p className="muted">No saved drafts.</p>
            : drafts.map(p => (
              <div key={p.id} className="card" style={{ marginBottom: 12, opacity: 0.85, borderStyle: "dashed" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{p.title}</strong>
                      <span className="badge" style={{ fontSize: 11 }}>Draft</span>
                      {p.priceCents > 0 && <span className="muted" style={{ fontSize: 12 }}>{$$(p.priceCents)}</span>}
                    </div>
                    {p.description && <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{p.description}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="btn sm" onClick={() => requestPublishDraft(p)}>Publish</button>
                    <button className="btn sm secondary" onClick={() => startEdit(p)}>Edit</button>
                    <button className="btn sm secondary" style={{ color: "#f55" }} onClick={() => deletePromo(p.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          }
        </>
      )}

      {/* â”€â”€ Create / Edit form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, overflowY: "auto", padding: "24px 16px" }}>
          <div className="card" style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}>
            <h3 style={{ marginTop: 0 }}>{editId ? "Edit Promotion" : "New Promotion"}</h3>

            <label htmlFor="promo-title" style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Title *</label>
            <input id="promo-title" className="input" placeholder="e.g. Happy Hour 2x1" maxLength={80}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

            <label htmlFor="promo-desc" style={{ display: "block", margin: "12px 0 4px", fontSize: 13 }}>Description</label>
            <textarea id="promo-desc" className="input" placeholder="Briefly describe the promoâ€¦" rows={3} maxLength={400}
              style={{ resize: "vertical", fontFamily: "inherit", fontSize: 14 }}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            <label htmlFor="promo-price" style={{ display: "block", margin: "12px 0 4px", fontSize: 13 }}>Price (USD) â€” leave 0 for free</label>
            <input id="promo-price" type="number" className="input" min={0} step={0.01} placeholder="0.00"
              value={form.priceCents === 0 ? "" : (form.priceCents)} onChange={e => setForm(f => ({ ...f, priceCents: parseFloat(e.target.value) || 0 }))} />

            <label htmlFor="promo-image" style={{ display: "block", margin: "12px 0 4px", fontSize: 13 }}>Image URL (optional)</label>
            <input id="promo-image" type="url" className="input" placeholder="https://â€¦"
              value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
            {form.imageUrl && (
              <img src={form.imageUrl} alt="" style={{ marginTop: 8, width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }} />
            )}

            <label htmlFor="promo-redeems" style={{ display: "block", margin: "12px 0 4px", fontSize: 13 }}>Max redeems per user per night</label>
            <input id="promo-redeems" type="number" className="input" min={1} max={99}
              value={form.maxRedeemsPerNightPerUser} onChange={e => setForm(f => ({ ...f, maxRedeemsPerNightPerUser: parseInt(e.target.value) || 1 }))} />

            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              <button className="btn" onClick={requestPublish} disabled={saving || !form.title}>
                {saving ? "â€¦" : editId ? "Update & Publish" : "Publish Now"}
              </button>
              <button className="btn secondary" onClick={saveDraft} disabled={saving || !form.title}>
                {saving ? "â€¦" : "Save as Draft"}
              </button>
              <button className="btn secondary" onClick={cancelForm} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Confirmation popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {confirmInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ maxWidth: 400, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>Confirm Promotion</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              You are creating a promotion for <strong>{confirmInfo.venueName || "your venue"}</strong>:
            </p>
            <div className="card" style={{ background: "#1a1a2e", marginBottom: 12 }}>
              <div><strong>{confirmInfo.title}</strong></div>
              {confirmInfo.description && <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{confirmInfo.description}</p>}
              <div style={{ marginTop: 6, fontSize: 13 }}>
                Price: <strong>{confirmInfo.priceCents > 0 ? $$(confirmInfo.priceCents) : "Free"}</strong>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              â° This promotion will <strong>take effect immediately</strong> and will be <strong>automatically removed at your municipality&rsquo;s alcohol cutoff time</strong> tonight.
            </p>
            <p className="muted" style={{ fontSize: 12, fontStyle: "italic" }}>
              Note: if your cutoff is after midnight (e.g. 2:00 AM), it will expire the following calendar day.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={confirmPublish} disabled={publishing}>
                {publishing ? "Publishingâ€¦" : "Confirm & Publish"}
              </button>
              <button className="btn secondary" onClick={() => setConfirmInfo(null)} disabled={publishing}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

