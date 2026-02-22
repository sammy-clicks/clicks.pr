"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const DAYS = [
  { key: "monCutoffMins", label: "Monday" },
  { key: "tueCutoffMins", label: "Tuesday" },
  { key: "thuCutoffMins", label: "Thursday" },
  { key: "friCutoffMins", label: "Friday" },
  { key: "satCutoffMins", label: "Saturday" },
] as const;

type DayKey = typeof DAYS[number]["key"];

function minsToTime(mins: number | null | undefined) {
  if (mins == null) return "";
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMins(t: string) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function Municipalities() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  async function load() {
    const r = await fetch("/api/admin/municipalities");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  function getEditing(id: string, field: string, fallback: number | null | undefined) {
    return editing[id]?.[field] ?? minsToTime(fallback ?? 120);
  }

  function setField(id: string, field: string, value: string) {
    setEditing(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }));
  }

  function isDirty(id: string) {
    return !!editing[id] && Object.keys(editing[id]).length > 0;
  }

  async function save(id: string, m: any) {
    setMsg("");
    const patch: any = { id };
    const e = editing[id] ?? {};

    // default cutoff
    if ("defaultAlcoholCutoffMins" in e) {
      const v = timeToMins(e.defaultAlcoholCutoffMins);
      if (v != null) patch.defaultAlcoholCutoffMins = v;
    }
    // per-day
    for (const { key } of DAYS) {
      if (key in e) patch[key] = timeToMins(e[key]);
    }

    const r = await fetch("/api/admin/municipalities", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg(`Saved ${m.name}.`);
    setEditing(prev => { const c = { ...prev }; delete c[id]; return c; });
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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((m: any) => {
          const defaultTime = getEditing(m.id, "defaultAlcoholCutoffMins", m.defaultAlcoholCutoffMins);
          const dirty = isDirty(m.id);
          const open = expanded[m.id];

          return (
            <div key={m.id} className="card" style={{ padding: "14px 16px" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ flex: 1, minWidth: 160 }}>{m.name}</strong>

                {/* Default cutoff */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <label style={{ fontSize: 12, margin: 0 }}>Default</label>
                  <input
                    type="time"
                    value={defaultTime}
                    style={{ width: 110 }}
                    onChange={e => setField(m.id, "defaultAlcoholCutoffMins", e.target.value)}
                  />
                  {["01:00", "02:00", "03:00"].map(t => (
                    <button key={t} className="btn sm secondary" style={{ fontSize: 11 }}
                      onClick={() => setField(m.id, "defaultAlcoholCutoffMins", t)}>{t}</button>
                  ))}
                </div>

                {/* Per-day toggle */}
                <button
                  className={`btn sm${open ? "" : " secondary"}`}
                  style={{ fontSize: 11 }}
                  onClick={() => setExpanded(e => ({ ...e, [m.id]: !e[m.id] }))}
                >
                  {open ? "▲ Days" : "▼ Per day"}
                </button>

                {dirty && <button className="btn sm" onClick={() => save(m.id, m)}>Save</button>}
              </div>

              {/* Per-day rows */}
              {open && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <p className="muted" style={{ margin: "0 0 6px", fontSize: 12 }}>
                    Leave a day unchanged to use the default cutoff above.
                  </p>
                  {DAYS.map(({ key, label }) => {
                    const val = editing[m.id]?.[key] ?? (m[key] != null ? minsToTime(m[key]) : defaultTime);
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 80, fontSize: 13 }}>{label}</span>
                        <input
                          type="time"
                          value={val}
                          style={{ width: 110 }}
                          onChange={e => setField(m.id, key, e.target.value)}
                        />
                        {["01:00", "02:00", "03:00"].map(t => (
                          <button key={t} className="btn sm secondary" style={{ fontSize: 11 }}
                            onClick={() => setField(m.id, key, t)}>{t}</button>
                        ))}
                        <button className="btn sm secondary" style={{ fontSize: 11 }}
                          onClick={() => setField(m.id, key, defaultTime)}>= Default</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

