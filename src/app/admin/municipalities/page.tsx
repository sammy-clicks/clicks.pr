"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function minsToTime(mins: number) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function Municipalities() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  async function load() {
    const r = await fetch("/api/admin/municipalities");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function save(id: string) {
    setMsg("");
    const mins = timeToMins(editing[id]);
    const r = await fetch("/api/admin/municipalities", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, defaultAlcoholCutoffMins: mins }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Saved.");
    setEditing(e => { const copy = { ...e }; delete copy[id]; return copy; });
    load();
  }

  const filtered = (data?.items ?? []).filter((m: any) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!data) return <div className="container"><Nav role="admin" /><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <div className="header">
        <h2>Municipalities ({data.items.length})</h2>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <Nav role="admin" />

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter…"
        style={{ maxWidth: 280, marginBottom: 16 }}
      />

      <table>
        <thead>
          <tr><th>Municipality</th><th>Cutoff time</th><th>Quick set</th><th></th></tr>
        </thead>
        <tbody>
          {filtered.map((m: any) => {
            const current = editing[m.id] ?? minsToTime(m.defaultAlcoholCutoffMins);
            const isDirty = editing[m.id] !== undefined;
            return (
              <tr key={m.id}>
                <td><strong>{m.name}</strong></td>
                <td>
                  <input
                    type="time"
                    value={current}
                    style={{ width: 120 }}
                    onChange={e => setEditing(prev => ({ ...prev, [m.id]: e.target.value }))}
                  />
                </td>
                <td>
                  <div className="row">
                    {["01:00", "02:00", "03:00"].map(t => (
                      <button
                        key={t}
                        className="btn sm secondary"
                        onClick={() => setEditing(prev => ({ ...prev, [m.id]: t }))}
                      >{t}</button>
                    ))}
                  </div>
                </td>
                <td>
                  {isDirty && (
                    <button className="btn sm" onClick={() => save(m.id)}>Save</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
