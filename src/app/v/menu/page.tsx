"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { PinGate } from "@/components/PinGate";

type Item = {
  id: string; name: string; priceCents: number;
  isAlcohol: boolean; isAvailable: boolean;
  category: string | null; imageUrl: string | null;
};

const EMPTY_FORM = { name: "", price: "5.00", category: "", isAlcohol: false, imageUrl: "" };

export default function VenueMenu() {
  const [data, setData]   = useState<any>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [msg, setMsg]                 = useState("");
  const [saving, setSaving]           = useState(false);

  // Category management
  const [localCats, setLocalCats]     = useState<string[]>([]);   // user-added names not yet in items
  const [catInput, setCatInput]       = useState("");
  const [catMsg, setCatMsg]           = useState("");
  const [showNoCatModal, setShowNoCatModal] = useState(false);

  const imgInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/v/menu");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
  }
  useEffect(() => { load(); }, []);

  function pickImage(file: File, onDone: (url: string) => void) {
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        onDone(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    pickImage(f, url => setForm(p => ({ ...p, imageUrl: url })));
    e.target.value = "";
  }

  // All available categories (from items + locally created ones)
  function allCategories(items: Item[]): string[] {
    const fromItems = items.map(m => m.category ?? "").filter(Boolean);
    const merged = Array.from(new Set([...fromItems, ...localCats]));
    return merged;
  }

  function addCategory() {
    const name = catInput.trim();
    if (!name) { setCatMsg("Enter a category name."); return; }
    const cats = data ? allCategories(data.items) : localCats;
    if (cats.map((c: string) => c.toLowerCase()).includes(name.toLowerCase())) {
      setCatMsg("Category already exists."); return;
    }
    setLocalCats(p => [...p, name]);
    setCatInput("");
    setCatMsg("");
  }

  function removeLocalCat(name: string) {
    setLocalCats(p => p.filter(c => c !== name));
  }

  function openAdd(category?: string) {
    const cats = data ? allCategories(data.items) : localCats;
    if (cats.length === 0) { setShowNoCatModal(true); return; }
    setEditId(null);
    setForm({ ...EMPTY_FORM, category: category ?? cats[0] });
    setMsg(""); setShowForm(true);
  }

  function openEdit(m: Item) {
    setEditId(m.id);
    setForm({ name: m.name, price: (m.priceCents / 100).toFixed(2), category: m.category ?? "", isAlcohol: m.isAlcohol, imageUrl: m.imageUrl ?? "" });
    setMsg(""); setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); }

  async function saveItem() {
    const priceCents = Math.round(parseFloat(form.price) * 100);
    if (!form.name.trim() || isNaN(priceCents)) { setMsg("Name and price are required."); return; }
    if (!form.category.trim()) { setMsg("Please select a category."); return; }
    setSaving(true); setMsg("");
    const body = {
      name: form.name.trim(),
      priceCents,
      isAlcohol: form.isAlcohol,
      category: form.category.trim(),
      imageUrl: form.imageUrl || null,
    };
    const url    = editId ? `/api/v/menu/${editId}` : "/api/v/menu";
    const method = editId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    // Once an item is saved, we can drop it from localCats (it's now in DB items)
    setLocalCats(p => p.filter(c => c !== form.category.trim()));
    cancelForm(); load();
  }

  async function toggleAvail(id: string, isAvailable: boolean) {
    await fetch(`/api/v/menu/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ isAvailable }) });
    load();
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this item?")) return;
    await fetch(`/api/v/menu/${id}`, { method: "DELETE" });
    load();
  }

  if (error) return <div className="container"><Nav role="v" /><p className="muted">{error}</p></div>;
  if (!data)  return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const items: Item[] = data.items;
  const cats = allCategories(items);

  // items already in DB, grouped by category
  const dbCats = Array.from(new Set(items.map((m: Item) => m.category ?? "Uncategorized")));
  const allDisplayCats = Array.from(new Set([...dbCats, ...localCats]));

  function itemsByCategory(cat: string) {
    return items.filter((m: Item) => (m.category ?? "Uncategorized") === cat);
  }

  return (
    <PinGate>
    <div className="container">
      <div className="header">
        <h2 style={{ color: "var(--venue-brand)", fontSize: "1.7rem" }}>Menu — {data.venueName}</h2>
      </div>
      <Nav role="v" />

      {/* ── Add category row ──────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: catMsg ? 4 : 24, alignItems: "center" }}>
        <input
          value={catInput}
          onChange={e => { setCatInput(e.target.value); setCatMsg(""); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
          placeholder="New category (e.g. Cocktails, Beer, Food…)"
          style={{ flex: 1 }}
          maxLength={40}
        />
        <button className="btn" style={{ flexShrink: 0 }} onClick={addCategory}>+ Category</button>
      </div>
      {catMsg && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--danger)" }}>{catMsg}</p>}

      {allDisplayCats.length === 0 && (
        <p className="muted" style={{ textAlign: "center", padding: "32px 0" }}>
          No categories yet — add one above to start building your menu.
        </p>
      )}

      {allDisplayCats.map(cat => {
        const catItems = itemsByCategory(cat);
        const isLocal  = localCats.includes(cat);
        return (
          <div key={cat} style={{ marginBottom: 28 }}>
            {/* Category header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: "1.5px solid var(--venue-brand)", paddingBottom: 6, marginBottom: 10,
            }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--venue-brand)", flex: 1 }}>
                {cat}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>{catItems.length} item{catItems.length !== 1 ? "s" : ""}</span>
              {isLocal && catItems.length === 0 && (
                <button
                  onClick={() => removeLocalCat(cat)}
                  style={{ background: "none", border: "none", color: "var(--muted-text)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 4px" }}
                  title="Remove category"
                >×</button>
              )}
              <button className="btn sm" onClick={() => openAdd(cat)}>+ Add Item</button>
            </div>

            {/* Items — compact list rows */}
            {catItems.length === 0 && (
              <p className="muted" style={{ fontSize: 13, marginLeft: 2 }}>No items yet.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {catItems.map((m: Item) => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10,
                  background: "var(--surface)", opacity: m.isAvailable ? 1 : 0.55,
                  border: "1px solid var(--border)",
                }}>
                  {m.imageUrl
                    ? <img src={m.imageUrl} alt={m.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--venue-brand-dim)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                        {m.isAlcohol ? "🍺" : "🧃"}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.name}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      ${(m.priceCents / 100).toFixed(2)} · {m.isAlcohol ? "Alcohol" : "Non-alc"} · {m.isAvailable ? "Available" : "Off"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="btn sm secondary" onClick={() => openEdit(m)}>Edit</button>
                    <button
                      className={`btn sm ${m.isAvailable ? "secondary" : ""}`}
                      onClick={() => toggleAvail(m.id, !m.isAvailable)}
                    >{m.isAvailable ? "Disable" : "Enable"}</button>
                    <button className="btn sm danger" onClick={() => deleteItem(m.id)}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* ── No Category modal ── */}
      {showNoCatModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{
            background: "var(--surface)", borderRadius: 16, padding: 32, maxWidth: 400, width: "100%",
            border: "1.5px solid var(--venue-brand)",
            boxShadow: "0 0 40px rgba(231,168,255,0.18)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12, textAlign: "center" }}>🗂️</div>
            <h3 style={{ margin: "0 0 10px", color: "var(--venue-brand)", textAlign: "center" }}>Create a Category First</h3>
            <p className="muted" style={{ textAlign: "center", marginBottom: 24 }}>
              Before adding items to your menu, please create at least one category — for example <em>Cocktails</em>, <em>Beer</em>, or <em>Food</em>. Categories keep your menu organized for your customers.
            </p>
            <button
              className="btn"
              style={{ width: "100%" }}
              onClick={() => setShowNoCatModal(false)}
            >Got it — add a category</button>
          </div>
        </div>
      )}

      {/* ── Add / Edit form modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, overflowY: "auto", padding: "24px 16px" }}>
          <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
            <h3 style={{ marginTop: 0 }}>{editId ? "Edit Item" : "New Item"}</h3>

            <label>Category *</label>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            >
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label>Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Corona" maxLength={80} />

            <label>Price (USD) *</label>
            <input type="number" value={form.price} step="0.01" min="0" onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox" id="alc-chk" checked={form.isAlcohol}
                onChange={e => setForm(p => ({ ...p, isAlcohol: e.target.checked }))}
                style={{ width: "auto" }}
              />
              <label htmlFor="alc-chk" style={{ margin: 0 }}>Alcohol item</label>
            </div>

            <label style={{ marginTop: 16 }}>Photo (optional)</label>
            {form.imageUrl && (
              <div style={{ position: "relative", marginBottom: 8, display: "inline-block" }}>
                <img src={form.imageUrl} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8 }} />
                <button
                  onClick={() => setForm(p => ({ ...p, imageUrl: "" }))}
                  style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, padding: "3px 8px", cursor: "pointer" }}
                >Remove</button>
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn sm secondary" onClick={() => { const inp = imgInputRef.current; if (inp) { inp.setAttribute("capture", "environment"); inp.click(); } }}>📷 Camera</button>
              <button className="btn sm secondary" onClick={() => { const inp = imgInputRef.current; if (inp) { inp.removeAttribute("capture"); inp.click(); } }}>🖼️ Choose File</button>
            </div>
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImgFile} />

            {msg && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--danger)" }}>{msg}</p>}

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn" onClick={saveItem} disabled={saving}>{saving ? "Saving…" : editId ? "Save Changes" : "Add Item"}</button>
              <button className="btn secondary" onClick={cancelForm} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PinGate>
  );
}


