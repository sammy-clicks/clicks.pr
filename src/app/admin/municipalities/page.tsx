"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const DAYS = [
  { label: "Mon", startKey: "monStartMins",  cutoffKey: "monCutoffMins"  },
  { label: "Tue", startKey: "tueStartMins",  cutoffKey: "tueCutoffMins"  },
  { label: "Wed", startKey: "wedStartMins",  cutoffKey: "wedCutoffMins"  },
  { label: "Thu", startKey: "thuStartMins",  cutoffKey: "thuCutoffMins"  },
  { label: "Fri", startKey: "friStartMins",  cutoffKey: "friCutoffMins"  },
  { label: "Sat", startKey: "satStartMins",  cutoffKey: "satCutoffMins"  },
  { label: "Sun", startKey: "sunStartMins",  cutoffKey: "sunCutoffMins"  },
] as const;

function minsToTime(mins: number | null | undefined): string {
  if (mins == null) return "";
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMins(t: string): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmt(t: string) {
  if (!t) return "â€”";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default function Municipalities() {
  const [data, setData]       = useState<any>(null);
  const [msg, setMsg]         = useState("");
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch]   = useState("");

  async function load() {
    const r = await fetch("/api/admin/municipalities");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  function get(id: string, key: string, fallback: number | null | undefined, defVal: number) {
    if (editing[id]?.[key] !== undefined) return editing[id][key];
    if (fallback != null) return minsToTime(fallback);
    return minsToTime(defVal);
  }

  function setField(id: string, key: string, val: string) {
    setEditing(p => ({ ...p, [id]: { ...(p[id] ?? {}), [key]: val } }));
  }

  function isDirty(id: string) {
    return !!editing[id] && Object.keys(editing[id]).length > 0;
  }

  async function save(id: string, name: string) {
    setMsg("");
    const e = editing[id] ?? {};
    const patch: any = { id };
    for (const [k, v] of Object.entries(e)) {
      patch[k] = timeToMins(v);
    }
    const r = await fetch("/api/admin/municipalities", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg(`âœ“ Saved ${name}.`);
    setEditing(p => { const c = { ...p }; delete c[id]; return c; });
    load();
  }

  const filtered = (data?.items ?? []).filter((m: any) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!data) return <div className="container"><Nav role="admin" /><p className="muted">Loadingâ€¦</p></div>;

  return (
    <div className="container">
      <div className="header">
        <h2>Municipalities ({data.items.length})</h2>
        {msg && <span className="muted" style={{ color: msg.startsWith("âœ“") ? "#6f6" : "#f66" }}>{msg}</span>}
      </div>
      <Nav role="admin" />

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter municipalitiesâ€¦"
        style={{ maxWidth: 300, marginBottom: 16 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((m: any) => {
          const defStart  = get(m.id, "defaultAlcoholStartMins",  m.defaultAlcoholStartMins,  1140);
          const defCutoff = get(m.id, "defaultAlcoholCutoffMins", m.defaultAlcoholCutoffMins, 120);
          const dirty = isDirty(m.id);
          const open  = expanded[m.id];

          return (
            <div key={m.id} className="card" style={{ padding: "14px 16px" }}>
              {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ flex: 1, minWidth: 160, fontSize: 15 }}>{m.name}</strong>

                {/* Default window badge */}
                <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  Default: {fmt(defStart)} â†’ {fmt(defCutoff)}
                </span>

                <button
                  className={`btn sm${open ? "" : " secondary"}`}
                  style={{ fontSize: 11 }}
                  onClick={() => setExpanded(e => ({ ...e, [m.id]: !e[m.id] }))}
                >
                  {open ? "â–² Close" : "â–¼ Edit"}
                </button>

                {dirty && (
                  <button className="btn sm" style={{ background: "#27ae60" }} onClick={() => save(m.id, m.name)}>
                    Save
                  </button>
                )}
              </div>

              {/* â”€â”€ Expanded editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {open && (
                <div style={{ marginTop: 16 }}>
                  {/* Default row */}
                  <div style={{
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>
                      DEFAULT (applies to all days unless overridden below)
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>Start serving</span>
                        <input type="time" value={defStart} style={{ width: 110 }}
                          onChange={e => setField(m.id, "defaultAlcoholStartMins", e.target.value)} />
                        <div style={{ display: "flex", gap: 4 }}>
                          {["18:00","19:00","20:00","21:00"].map(t => (
                            <button key={t} className="btn sm secondary" style={{ fontSize: 10, padding: "2px 5px" }}
                              onClick={() => setField(m.id, "defaultAlcoholStartMins", t)}>{t.slice(0,2)}h</button>
                          ))}
                        </div>
                      </div>
                      <span style={{ fontSize: 18, opacity: 0.3, alignSelf: "center", marginTop: 12 }}>â†’</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 11, opacity: 0.6 }}>Alcohol cutoff</span>
                        <input type="time" value={defCutoff} style={{ width: 110 }}
                          onChange={e => setField(m.id, "defaultAlcoholCutoffMins", e.target.value)} />
                        <div style={{ display: "flex", gap: 4 }}>
                          {["01:00","02:00","03:00"].map(t => (
                            <button key={t} className="btn sm secondary" style={{ fontSize: 10, padding: "2px 5px" }}
                              onClick={() => setField(m.id, "defaultAlcoholCutoffMins", t)}>{t.slice(0,2)}h</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-day grid */}
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>
                    PER-DAY OVERRIDES
                    <span style={{ fontWeight: 400, marginLeft: 6 }}>â€” leave blank to use default</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 460 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <th style={{ textAlign: "left", padding: "4px 8px", width: 48 }}>Day</th>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>Start serving</th>
                          <th style={{ padding: "4px 4px", width: 20 }}></th>
                          <th style={{ textAlign: "left", padding: "4px 8px" }}>Alcohol cutoff</th>
                          <th style={{ padding: "4px 8px", width: 60 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(({ label, startKey, cutoffKey }) => {
                          const sv = editing[m.id]?.[startKey]  ?? (m[startKey]  != null ? minsToTime(m[startKey])  : "");
                          const cv = editing[m.id]?.[cutoffKey] ?? (m[cutoffKey] != null ? minsToTime(m[cutoffKey]) : "");
                          return (
                            <tr key={label} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "6px 8px", fontWeight: 600 }}>{label}</td>
                              <td style={{ padding: "4px 8px" }}>
                                <input type="time" value={sv} placeholder="â€”"
                                  style={{ width: 110 }}
                                  onChange={e => setField(m.id, startKey, e.target.value)} />
                              </td>
                              <td style={{ textAlign: "center", opacity: 0.3 }}>â†’</td>
                              <td style={{ padding: "4px 8px" }}>
                                <input type="time" value={cv} placeholder="â€”"
                                  style={{ width: 110 }}
                                  onChange={e => setField(m.id, cutoffKey, e.target.value)} />
                              </td>
                              <td style={{ padding: "4px 8px" }}>
                                <button className="btn sm secondary" style={{ fontSize: 10 }}
                                  onClick={() => {
                                    setField(m.id, startKey, defStart);
                                    setField(m.id, cutoffKey, defCutoff);
                                  }}>= Default</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => save(m.id, m.name)} disabled={!dirty}>
                      Save {m.name}
                    </button>
                    <button className="btn secondary" onClick={() => {
                      setEditing(p => { const c = { ...p }; delete c[m.id]; return c; });
                    }}>
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
