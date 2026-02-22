"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";

type Venue = {
  id: string; name: string; type: string; description?: string; address: string;
  lat: number; lng: number; plan: string; municipalityId: string; zoneId: string;
  alcoholCutoffOverrideMins?: number | null;
  municipality: { name: string }; zone: { name: string };
  manager: { id: string; firstName: string; lastName: string; email: string } | null;
};

const TYPES = ["Bar", "Club", "Lounge", "Restaurant", "Rooftop", "Beach Bar", "Other"];

function DeleteVenueModal({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  const [confirm, setConfirm] = useState("");
  const required = `CONFIRM delete ${name}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "var(--surface,#1a1a2e)", borderRadius: 14, padding: 28, maxWidth: 440, width: "100%" }}>
        <h3 style={{ margin: "0 0 10px", color: "#f66" }}>Delete "{name}"?</h3>
        <p className="muted" style={{ marginBottom: 16 }}>All orders, menu items, check-ins and stats for this venue will be permanently deleted.</p>
        <p className="muted" style={{ fontSize: 13 }}>Type <strong>{required}</strong> to confirm:</p>
        <input value={confirm} onChange={e => setConfirm(e.target.value)} style={{ marginTop: 6 }} autoFocus />
        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className="btn" style={{ background: "#c0392b" }} onClick={onConfirm} disabled={confirm !== required}>Delete permanently</button>
          <button className="btn secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function VenuesAdmin() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null);
  const [form, setForm] = useState({
    name: "", type: "Bar", description: "", address: "",
    lat: "", lng: "", municipalityId: "", zoneId: "", plan: "FREE", managerId: "",
  });
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  async function load() {
    const r = await fetch("/api/admin/venues");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function setEF(k: string, v: string) { setEditForm(f => ({ ...f, [k]: v })); }

  async function create() {
    setMsg("");
    if (!form.name.trim()) { setMsg("Name is required."); return; }
    if (!form.municipalityId) { setMsg("Select a municipality."); return; }
    if (!form.zoneId) { setMsg("Select a zone."); return; }
    if (!form.lat || !form.lng) { setMsg("Lat and Lng are required."); return; }
    const payload = {
      ...form,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      managerId: form.managerId || undefined,
    };
    const r = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Venue created!");
    setForm({ name: "", type: "Bar", description: "", address: "", lat: "", lng: "", municipalityId: "", zoneId: "", plan: "FREE", managerId: "" });
    load();
  }

  function startEdit(v: Venue) {
    setEditId(v.id);
    setEditForm({
      name: v.name, type: v.type, description: v.description ?? "",
      address: v.address, lat: String(v.lat), lng: String(v.lng),
      municipalityId: v.municipalityId, zoneId: v.zoneId, plan: v.plan,
      managerId: v.manager?.id ?? "",
    });
  }

  async function saveEdit(id: string) {
    setMsg("");
    const payload: any = {
      id,
      name: editForm.name, type: editForm.type, description: editForm.description,
      address: editForm.address, lat: parseFloat(editForm.lat), lng: parseFloat(editForm.lng),
      municipalityId: editForm.municipalityId, zoneId: editForm.zoneId,
      plan: editForm.plan, managerId: editForm.managerId || null,
    };
    const r = await fetch("/api/admin/venues", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setEditId(null); setMsg("Saved."); load();
  }

  async function deleteVenue(id: string) {
    const r = await fetch(`/api/admin/venues?id=${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Delete failed"); return; }
    setDeleteTarget(null); setEditId(null); setMsg("Venue deleted."); load();
  }

  async function setPlan(id: string, plan: string) {
    await fetch("/api/admin/venues", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, plan }),
    });
    load();
  }

  if (!data) return <div className="container"><Nav role="admin" /><p className="muted">Loading…</p></div>;

  const q = search.toLowerCase();
  const filtered: Venue[] = (data.venues ?? []).filter((v: Venue) =>
    !q ||
    v.name.toLowerCase().includes(q) ||
    v.type.toLowerCase().includes(q) ||
    v.address.toLowerCase().includes(q) ||
    v.zone.name.toLowerCase().includes(q) ||
    v.municipality.name.toLowerCase().includes(q) ||
    (v.manager ? `${v.manager.firstName} ${v.manager.lastName}`.toLowerCase().includes(q) : false)
  );

  return (
    <div className="container">
      {deleteTarget && (
        <DeleteVenueModal
          name={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteVenue(deleteTarget.id)}
        />
      )}

      <div className="header">
        <h2>Venues ({data.venues.length})</h2>
        {msg && <span className="muted" style={{ color: msg.includes("!") || msg === "Saved." ? "var(--green,#6f6)" : "#f66" }}>{msg}</span>}
      </div>
      <Nav role="admin" />

      {/* ── Create form ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Add venue</h3>
        <div className="row">
          <div style={{ flex: 2 }}><label>Name</label><input value={form.name} onChange={e => setF("name", e.target.value)} /></div>
          <div style={{ flex: 1 }}>
            <label>Type</label>
            <select value={form.type} onChange={e => setF("type", e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <label>Address</label><input value={form.address} onChange={e => setF("address", e.target.value)} />
        <div className="row">
          <div style={{ flex: 1 }}><label>Lat</label><input value={form.lat} onChange={e => setF("lat", e.target.value)} placeholder="18.4655" /></div>
          <div style={{ flex: 1 }}><label>Lng</label><input value={form.lng} onChange={e => setF("lng", e.target.value)} placeholder="-66.1057" /></div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Municipality</label>
            <select value={form.municipalityId} onChange={e => setF("municipalityId", e.target.value)}>
              <option value="">Select…</option>
              {data.municipalities.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Zone</label>
            <select value={form.zoneId} onChange={e => setF("zoneId", e.target.value)}>
              <option value="">Select…</option>
              {data.zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Plan</label>
            <select value={form.plan} onChange={e => setF("plan", e.target.value)}>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Manager (VENUE user)</label>
            <select value={form.managerId} onChange={e => setF("managerId", e.target.value)}>
              <option value="">None</option>
              {data.managers.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.email})</option>)}
            </select>
          </div>
        </div>
        <label>Description (optional)</label>
        <textarea rows={2} value={form.description} onChange={e => setF("description", e.target.value)} />
        <button className="btn" style={{ marginTop: 12 }} onClick={create}>Create venue</button>
      </div>

      {/* ── Search + list ────────────────────────────────── */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, type, address, zone, municipality, manager…"
        style={{ marginBottom: 16, maxWidth: 480 }}
        autoComplete="off"
      />

      <div className="row">
        {filtered.map((v: Venue) => (
          <div key={v.id} className="card" style={{ flex: "1 1 320px" }}>
            {editId === v.id ? (
              /* ── Edit panel ── */
              <div>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                  <strong>Editing: {v.name}</strong>
                  <button className="btn sm secondary" onClick={() => setEditId(null)}>✕ Cancel</button>
                </div>
                <label>Name</label><input value={editForm.name} onChange={e => setEF("name", e.target.value)} />
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <label>Type</label>
                    <select value={editForm.type} onChange={e => setEF("type", e.target.value)}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Plan</label>
                    <select value={editForm.plan} onChange={e => setEF("plan", e.target.value)}>
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                    </select>
                  </div>
                </div>
                <label>Address</label><input value={editForm.address} onChange={e => setEF("address", e.target.value)} />
                <div className="row">
                  <div style={{ flex: 1 }}><label>Lat</label><input value={editForm.lat} onChange={e => setEF("lat", e.target.value)} /></div>
                  <div style={{ flex: 1 }}><label>Lng</label><input value={editForm.lng} onChange={e => setEF("lng", e.target.value)} /></div>
                </div>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <label>Municipality</label>
                    <select value={editForm.municipalityId} onChange={e => setEF("municipalityId", e.target.value)}>
                      {data.municipalities.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Zone</label>
                    <select value={editForm.zoneId} onChange={e => setEF("zoneId", e.target.value)}>
                      {data.zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Manager</label>
                  <select value={editForm.managerId} onChange={e => setEF("managerId", e.target.value)}>
                    <option value="">No manager</option>
                    {data.managers.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
                  </select>
                </div>
                <div className="row" style={{ marginTop: 12, gap: 8 }}>
                  <button className="btn sm" onClick={() => saveEdit(v.id)}>Save changes</button>
                  <button className="btn sm" style={{ background: "#c0392b" }} onClick={() => setDeleteTarget(v)}>Delete venue</button>
                </div>
              </div>
            ) : (
              /* ── Card view ── */
              <>
                <div className="header">
                  <strong>{v.name}</strong>
                  <span className="badge">{v.plan}</span>
                </div>
                <p className="muted">{v.type} · {v.zone.name} · {v.municipality.name}</p>
                <p className="muted">Manager: {v.manager ? `${v.manager.firstName} ${v.manager.lastName}` : "Unassigned"}</p>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn sm secondary" onClick={() => startEdit(v)}>Edit</button>
                  <button className="btn sm secondary" onClick={() => setPlan(v.id, v.plan === "FREE" ? "PRO" : "FREE")}>
                    {v.plan === "FREE" ? "→ PRO" : "→ FREE"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
