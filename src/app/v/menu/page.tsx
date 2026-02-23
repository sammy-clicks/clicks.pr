"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";

type Item = {
  id: string; name: string; priceCents: number;
  isAlcohol: boolean; isAvailable: boolean;
  category: string | null; imageUrl: string | null;
};

const EMPTY_FORM = { name: "", price: "5.00", category: "", isAlcohol: false, imageUrl: "" };

export default function VenueMenu() {
  const [data, setData]   = useState<any>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [msg, setMsg]             = useState("");
  const [saving, setSaving]       = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/v/menu");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
  }
  useEffect(() => { load(); }, []);

  // Resize image via canvas → base64
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

  function openAdd() { setEditId(null); setForm({ ...EMPTY_FORM }); setMsg(""); setShowForm(true); }
  function openEdit(m: Item) {
    setEditId(m.id);
    setForm({ name: m.name, price: (m.priceCents / 100).toFixed(2), category: m.category ?? "", isAlcohol: m.isAlcohol, imageUrl: m.imageUrl ?? "" });
    setMsg(""); setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); }

  async function saveItem() {
    const priceCents = Math.round(parseFloat(form.price) * 100);
    if (!form.name.trim() || isNaN(priceCents)) { setMsg("Name and price are required."); return; }
    setSaving(true); setMsg("");
    const body = {
      name: form.name.trim(),
      priceCents,
      isAlcohol: form.isAlcohol,
      category: form.category.trim() || null,
      imageUrl: form.imageUrl || null,
    };
    const url    = editId ? `/api/v/menu/${editId}` : "/api/v/menu";
    const method = editId ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
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
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const items: Item[] = data.items;

  // Get unique categories in order
  const categories = Array.from(new Set(items.map((m: Item) => m.category ?? "Uncategorized")));
  const existingCats = Array.from(new Set(items.map((m: Item) => m.category ?? "").filter(Boolean)));

  function itemsByCategory(cat: string) {
    return items.filter((m: Item) => (m.category ?? "Uncategorized") === cat);
  }

  return (
    <div className="container">
      <div className="header">
        <h2>Menu — {data.venueName}</h2>
        <button className="btn" onClick={openAdd}>+ Add Item</button>
      </div>
      <Nav role="v" />

      {items.length === 0 && <p className="muted">No items yet. Add your first item to get started.</p>}

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 10px", color: "var(--brand)", display: "flex", alignItems: "center", gap: 8 }}>
            {cat}
            <span style={{ fontSize: 12, color: "var(--muted-text)", fontWeight: 400 }}>{itemsByCategory(cat).length} item{itemsByCategory(cat).length !== 1 ? "s" : ""}</span>
          </h3>
          <div className="row">
            {itemsByCategory(cat).map((m: Item) => (
              <div key={m.id} className="card" style={{ flex: "1 1 240px", opacity: m.isAvailable ? 1 : 0.6 }}>
                {m.imageUrl && (
                  <img src={m.imageUrl} alt={m.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 10 }} />
                )}
                <div className="header" style={{ marginBottom: 4 }}>
                  <strong>{m.name}</strong>
                  <span className="badge">${(m.priceCents / 100).toFixed(2)}</span>
                </div>
                <p className="muted" style={{ margin: "0 0 8px", fontSize: 12 }}>
                  {m.isAlcohol ? "🍺 Alcohol" : "🧃 Non-alcoholic"} · {m.isAvailable ? "Available" : "Unavailable"}
                </p>
                <div className="row" style={{ gap: 6 }}>
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
      ))}

      {/* ── Add / Edit form modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, overflowY: "auto", padding: "24px 16px" }}>
          <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
            <h3 style={{ marginTop: 0 }}>{editId ? "Edit Item" : "New Item"}</h3>

            <label style={{ display: "block", marginBottom: 4, fontSize: 13 }}>Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Corona" maxLength={80} />

            <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13 }}>Price (USD) *</label>
            <input type="number" value={form.price} step="0.01" min="0" onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />

            <label style={{ display: "block", margin: "12px 0 4px", fontSize: 13 }}>Category</label>
            <input
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Beer, Cocktails, Food…"
              list="cat-list"
              maxLength={40}
            />
            <datalist id="cat-list">
              {existingCats.map(c => <option key={c} value={c} />)}
            </datalist>

            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox" id="alc-chk" checked={form.isAlcohol}
                onChange={e => setForm(p => ({ ...p, isAlcohol: e.target.checked }))}
                style={{ width: "auto" }}
              />
              <label htmlFor="alc-chk" style={{ margin: 0 }}>Alcohol item</label>
            </div>

            <label style={{ display: "block", margin: "16px 0 8px", fontSize: 13 }}>Photo (optional)</label>
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
              <button
                className="btn sm secondary"
                onClick={() => {
                  const inp = imgInputRef.current;
                  if (inp) { inp.setAttribute("capture", "environment"); inp.click(); }
                }}
              >📷 Camera</button>
              <button
                className="btn sm secondary"
                onClick={() => {
                  const inp = imgInputRef.current;
                  if (inp) { inp.removeAttribute("capture"); inp.click(); }
                }}
              >🖼️ Choose File</button>
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
  );
}