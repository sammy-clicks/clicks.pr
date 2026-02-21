"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

// ── tiny inline bar chart (pure CSS, no deps) ────────────────────────────────
function BarChart({ data, color = "var(--accent, #9b5de5)" }: {
  data: { label: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, padding: "4px 0" }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
            <div style={{
              width: "100%",
              height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%`,
              background: color,
              borderRadius: "3px 3px 0 0",
              minHeight: d.count > 0 ? 4 : 0,
              transition: "height 0.3s ease",
            }} title={`${d.count}`} />
          </div>
          <span style={{ fontSize: 9, color: "var(--muted, #888)", whiteSpace: "nowrap" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card" style={{ flex: "1 1 150px", textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function $$(n: number) { return `$${(n / 100).toFixed(2)}`; }

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  async function load(d = days) {
    setLoading(true);
    const r = await fetch(`/api/admin/analytics?days=${d}`);
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
  }

  useEffect(() => { load(); }, []);

  function changeRange(d: number) { setDays(d); load(d); }

  if (error) return <div className="container"><Nav role="admin" /><p className="muted">{error}</p></div>;

  return (
    <div className="container">
      <div className="header">
        <h2>Analytics</h2>
        <div className="row" style={{ gap: 6 }}>
          {[7, 14, 30, 90, 0].map(d => (
            <button key={d} className={`btn${days === d ? "" : " secondary"}`}
              onClick={() => changeRange(d)} disabled={loading}>
              {d === 0 ? "All" : `${d}d`}
            </button>
          ))}
          <button className="btn secondary" onClick={() => load(days)} disabled={loading}>↺</button>
        </div>
      </div>
      <Nav role="admin" />

      {!data && <p className="muted">Loading…</p>}
      {data && (
        <>
          {/* ── Totals ─────────────────────────────────────────────────── */}
          <h3>Platform totals</h3>
          <div className="row">
            <Stat label="Total users"    value={data.totals.users} />
            <Stat label="Venues"         value={data.totals.venues} />
            <Stat label="Total orders"   value={data.totals.orders} />
            <Stat label="Active now"     value={data.totals.activeNow} sub="checked-in last 2h" />
          </div>

          <h3>Revenue ({days}d window)</h3>
          <div className="row">
            <Stat label="Total revenue"  value={$$(data.revenue.totalCents)} />
            <Stat label="Revenue today"  value={$$(data.revenue.todayCents)} />
          </div>

          {/* ── Daily charts ───────────────────────────────────────────── */}
          <h3>Last {days === 0 ? "12 months" : `${days} days`}</h3>
          <div className="row" style={{ flexWrap: "wrap", gap: 16 }}>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                New signups — total {data.daily.signups.reduce((s:number,d:any) => s+d.count,0)}
              </div>
              <BarChart data={data.daily.signups} color="#9b5de5" />
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Check-ins — total {data.daily.checkins.reduce((s:number,d:any) => s+d.count,0)}
              </div>
              <BarChart data={data.daily.checkins} color="#f15bb5" />
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Clicks — total {data.daily.clicks.reduce((s:number,d:any) => s+d.count,0)}
              </div>
              <BarChart data={data.daily.clicks} color="#00bbf9" />
            </div>

            <div className="card" style={{ flex: "1 1 260px" }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                Orders — total {data.daily.orders.reduce((s:number,d:any) => s+d.count,0)}
              </div>
              <BarChart data={data.daily.orders} color="#fee440" />
            </div>

          </div>

          {/* ── Top clickers ───────────────────────────────────────────── */}
          {data.topClickers.length > 0 && (
            <>
              <h3>Top Clickers ({days === 0 ? "all-time" : `${days}d`})</h3>
              <table>
                <thead><tr><th>#</th><th>Username</th><th>Clicks</th><th>Bar</th></tr></thead>
                <tbody>
                  {data.topClickers.map((u: any) => {
                    const pct = Math.round((u.clicks / data.topClickers[0].clicks) * 100);
                    return (
                      <tr key={u.rank}>
                        <td>{u.rank}</td>
                        <td>@{u.username}</td>
                        <td>{u.clicks}</td>
                        <td style={{ width: 140 }}>
                          <div style={{ background: "var(--muted,#333)", borderRadius: 4, overflow: "hidden", height: 10 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#00bbf9", borderRadius: 4 }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          {/* ── Weekly votes ───────────────────────────────────────────── */}
          {data.topVotes.length > 0 && (
            <>
              <h3>Weekly Votes — Top 5</h3>
              <table>
                <thead><tr><th>#</th><th>Venue</th><th>Votes</th></tr></thead>
                <tbody>
                  {data.topVotes.map((v: any, i: number) => (
                    <tr key={v.venueId}>
                      <td>{i + 1}</td>
                      <td>{v.name}</td>
                      <td>{v.votes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── Zone activity ──────────────────────────────────────────── */}
          <h3>Zone Activity (live)</h3>
          <table>
            <thead><tr><th>Zone</th><th>Venues</th><th>Status</th><th>Active now</th></tr></thead>
            <tbody>
              {data.zones.map((z: any) => (
                <tr key={z.name}>
                  <td>{z.name}</td>
                  <td className="muted">{z.venueCount}</td>
                  <td>
                    <span className={`badge${z.isEnabled ? " active" : ""}`}>
                      {z.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td>{z.active > 0 ? <strong>{z.active}</strong> : <span className="muted">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
