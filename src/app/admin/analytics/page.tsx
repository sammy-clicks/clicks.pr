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
  const [voteYear, setVoteYear] = useState<string>("");
  const [voteWeek, setVoteWeek] = useState<string>("");

  async function load(d = days, vy = voteYear, vw = voteWeek) {
    setLoading(true);
    const params = new URLSearchParams({ days: String(d) });
    if (vy) params.set("voteYear", vy);
    if (vy && vw) params.set("voteWeek", vw);
    const r = await fetch(`/api/admin/analytics?${params}`);
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
        <button className="btn secondary" onClick={() => load(days)} disabled={loading} style={{ padding: "6px 10px", fontSize: 15 }}>↺</button>
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
            <Stat label="PRO venues"     value={data.totals.proVenues} sub="active subscriptions" />
            <Stat label="Total orders"   value={data.totals.orders} />
            <Stat label="Active now"     value={data.totals.activeNow} sub="checked-in last 2h" />
          </div>

          {/* Time range selector — controls Revenue and everything below */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 4, marginBottom: 16, marginTop: 8, width: "fit-content",
            flexWrap: "wrap",
          }}>
            {[1, 7, 14, 30, 90, 0].map(d => (
              <button key={d}
                onClick={() => changeRange(d)}
                disabled={loading}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: "none", cursor: loading ? "default" : "pointer",
                  background: days === d ? "var(--accent)" : "transparent",
                  color: days === d ? "#000" : "var(--muted-text)",
                  transition: "background 0.15s, color 0.15s",
                }}>
                {d === 0 ? "All" : d === 1 ? "24h" : `${d}d`}
              </button>
            ))}
          </div>

          <h3>Revenue &mdash; {days === 0 ? "all-time" : days === 1 ? "last 24h" : `last ${days}d`}</h3>
          <div className="row">
            <Stat label="Gross Orders Revenue"  value={$$(data.revenue.grossOrdersCents)} sub="total completed orders value" />
            <Stat label="Our Cut (15%)"          value={$$(data.revenue.orderCommissionCents)} sub="15% of gross orders" />
            <Stat label="Gross Promo Revenue"    value={$$(data.revenue.grossPromosCents)} sub="paid promo redemptions" />
            <Stat label="Promo Cut (15%)"        value={$$(data.revenue.promoCommissionCents)} sub="15% of promo revenue" />
            <Stat label="Subscription Revenue"  value={$$(data.revenue.subscriptionRevenueCents)} sub="PRO plan payments" />
            <Stat label="Total Clicks Revenue"  value={$$(data.revenue.totalRevenueCents)} sub={`Today: ${$$(data.revenue.todayRevenueCents)}`} />
          </div>

          {/* ── Daily charts ───────────────────────────────────────────── */}
          <h3>Last {days === 0 ? "12 months" : days === 1 ? "24 hours" : `${days} days`}</h3>
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
              <h3>Top Clickers &mdash; {days === 0 ? "all-time" : days === 1 ? "24h" : `${days}d`}</h3>
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
          <h3>Votes</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            {/* Year filter */}
            <select
              value={voteYear}
              onChange={e => {
                const y = e.target.value;
                setVoteYear(y);
                setVoteWeek("");
                load(days, y, "");
              }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontSize: 13 }}
            >
              <option value="">All years</option>
              {Array.from(new Set((data.availableWeeks ?? []).map((wk: any) => wk.year))).map((y: any) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            {/* Week filter — only relevant when a year is selected */}
            <select
              value={voteWeek}
              onChange={e => {
                const w = e.target.value;
                setVoteWeek(w);
                load(days, voteYear, w);
              }}
              disabled={!voteYear}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--ink)", fontSize: 13, opacity: voteYear ? 1 : 0.4 }}
            >
              <option value="">All weeks{voteYear ? ` in ${voteYear}` : ""}</option>
              {(data.availableWeeks ?? [])
                .filter((wk: any) => !voteYear || String(wk.year) === voteYear)
                .map((wk: any) => (
                  <option key={wk.id} value={String(wk.week)}>Week {wk.week} ({new Date(wk.startsAt).toLocaleDateString()})</option>
                ))}
            </select>

            {(voteYear || voteWeek) && (
              <button
                className="btn secondary"
                style={{ fontSize: 12, padding: "5px 10px" }}
                onClick={() => { setVoteYear(""); setVoteWeek(""); load(days, "", ""); }}
              >Clear</button>
            )}
          </div>
          {data.topVotes.length > 0 && (
            <>
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
          {data.topVotes.length === 0 && <p className="muted" style={{ marginBottom: 16 }}>No votes recorded{voteYear && voteWeek ? ` for week ${voteWeek}, ${voteYear}` : voteYear ? ` in ${voteYear}` : ""}.</p>}

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

          {/* ── Active promotions ──────────────────────────────────────── */}
          <h3>Active Promotions ({data.activePromotions?.length ?? 0})</h3>
          {data.activePromotions?.length === 0
            ? <p className="muted">No active promotions right now.</p>
            : (
              <table>
                <thead>
                  <tr>
                    <th>Promo</th>
                    <th>Venue</th>
                    <th>Zone</th>
                    <th>Price</th>
                    <th>Redeems</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activePromotions?.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td className="muted">{p.venueName}</td>
                      <td className="muted">{p.zoneName}</td>
                      <td>{p.priceCents > 0 ? $$(p.priceCents) : <span className="muted">Free</span>}</td>
                      <td>{p.redeemsCount}</td>
                      <td className="muted" style={{ fontSize: 11 }}>
                        {p.expiresAt ? new Date(p.expiresAt).toLocaleString("en-US", { timeZone: "America/Puerto_Rico", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </>
      )}
    </div>
  );
}
