"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function VenuesAdmin() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "", type: "Bar", description: "", address: "",
    lat: "", lng: "", municipalityId: "", zoneId: "", plan: "FREE", managerId: "",
  });

  async function load() {
    const r = await fetch("/api/admin/venues");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function create() {
    setMsg("");
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
    setMsg("Venue created.");
    load();
  }

  async function setPlan(id: string, plan: string) {
    await fetch("/api/admin/venues", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, plan }),
    });
    load();
  }

  async function setManager(id: string, managerId: string | null) {
    await fetch("/api/admin/venues", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, managerId }),
    });
    load();
  }

  if (!data) return <div className="container"><Nav role="admin" /><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <h2>Venues ({data.venues.length})</h2>
      <Nav role="admin" />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Add venue</h3>
        <div className="row">
          <div style={{ flex: 2 }}><label>Name</label><input value={form.name} onChange={e => setF("name", e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Type</label><input value={form.type} onChange={e => setF("type", e.target.value)} /></div>
        </div>
        <label>Address</label><input value={form.address} onChange={e => setF("address", e.target.value)} />
        <div className="row">
          <div style={{ flex: 1 }}><label>Lat</label><input value={form.lat} onChange={e => setF("lat", e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Lng</label><input value={form.lng} onChange={e => setF("lng", e.target.value)} /></div>
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
        {msg && <p className="muted" style={{ marginTop: 6 }}>{msg}</p>}
      </div>

      <div className="row">
        {data.venues.map((v: any) => (
          <div key={v.id} className="card" style={{ flex: "1 1 320px" }}>
            <div className="header">
              <strong>{v.name}</strong>
              <span className="badge">{v.plan}</span>
            </div>
            <p className="muted">{v.type} · {v.zone.name} · {v.municipality.name}</p>
            <p className="muted">Manager: {v.manager ? `${v.manager.firstName} ${v.manager.lastName}` : "Unassigned"}</p>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn sm secondary" onClick={() => setPlan(v.id, v.plan === "FREE" ? "PRO" : "FREE")}>
                {v.plan === "FREE" ? "Upgrade PRO" : "Downgrade FREE"}
              </button>
              <select
                style={{ flex: 1, padding: "6px 8px", fontSize: 12 }}
                value={v.manager?.id || ""}
                onChange={e => setManager(v.id, e.target.value || null)}
              >
                <option value="">No manager</option>
                {data.managers.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
