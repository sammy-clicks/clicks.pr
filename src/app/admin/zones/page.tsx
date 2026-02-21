"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function ZonesAdmin() {
  const [data, setData] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [reason, setReason] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/zones");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    setMsg("");
    const r = await fetch("/api/admin/zones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const j = await r.json();
    setCreating(false);
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setNewName("");
    await load();
  }

  async function toggle(id: string, isEnabled: boolean, disabledReason?: string) {
    await fetch("/api/admin/zones", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, isEnabled, disabledReason }),
    });
    await load();
  }

  if (!data) return <div className="container"><Nav role="admin" /><p className="muted">Loading…</p></div>;

  const enabled = data.items.filter((z: any) => z.isEnabled);
  const disabled = data.items.filter((z: any) => !z.isEnabled);

  return (
    <div className="container">
      <h2>Zones ({data.items.length})</h2>
      <Nav role="admin" />

      {/* Create zone */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 12px" }}>Add new zone</h3>
        <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Zone name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && create()}
              placeholder="e.g. Santurce Arts District"
            />
          </div>
          <button className="btn" onClick={create} disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "Create zone"}
          </button>
        </div>
        {msg && <p className="muted" style={{ color: "var(--error,#f66)", marginTop: 6 }}>{msg}</p>}
      </div>

      {/* Enabled zones */}
      <h3>Enabled ({enabled.length})</h3>
      <table>
        <thead><tr><th>Zone</th><th>Venues</th><th>Action</th><th>Disable reason</th></tr></thead>
        <tbody>
          {enabled.map((z: any) => (
            <tr key={z.id}>
              <td><strong>{z.name}</strong></td>
              <td>{z._count?.venues ?? "—"}</td>
              <td>
                <button className="btn secondary"
                  onClick={() => toggle(z.id, false, reason[z.id] || undefined)}>
                  Disable
                </button>
              </td>
              <td>
                <input
                  value={reason[z.id] ?? ""}
                  onChange={e => setReason(r => ({ ...r, [z.id]: e.target.value }))}
                  placeholder="Optional reason"
                  style={{ minWidth: 200 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Disabled zones */}
      {disabled.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Disabled ({disabled.length})</h3>
          <table>
            <thead><tr><th>Zone</th><th>Reason</th><th>Action</th></tr></thead>
            <tbody>
              {disabled.map((z: any) => (
                <tr key={z.id}>
                  <td>{z.name}</td>
                  <td className="muted">{z.disabledReason || "—"}</td>
                  <td><button className="btn" onClick={() => toggle(z.id, true)}>Enable</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
