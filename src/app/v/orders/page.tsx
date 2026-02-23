"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

const OPEN = ["PLACED", "ACCEPTED", "PREPARING", "READY"];
const PERIODS = [
  { key: "24h", label: "24 h"     },
  { key: "7d",  label: "7 d"      },
  { key: "30d", label: "30 d"     },
  { key: "90d", label: "90 d"     },
  { key: "all", label: "All time" },
];

type CompletedInfo = {
  orderNumber: string;
  username: string;
  customer: string;
  totalCents: number;
  items: string;
};

export default function VenueOrders() {
  const [data, setData]           = useState<any>(null);
  const [error, setError]         = useState("");
  const [lastPoll, setLastPoll]   = useState<Date | null>(null);

  // Per-order 4-digit code inputs for READY → COMPLETED
  const [completeCodes, setCompleteCodes] = useState<Record<string, string>>({});
  const [completeMsgs, setCompleteMsgs]   = useState<Record<string, string>>({});
  const [completing, setCompleting]       = useState<string | null>(null);
  const [completed,     setCompleted]    = useState<CompletedInfo | null>(null);
  const prevOpenCount = useRef(0);

  // Analytics
  const [period,        setPeriod]        = useState("24h");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoad, setAnalyticsLoad] = useState(false);
  const [recentPage,    setRecentPage]    = useState(1);

  async function load() {
    const r = await fetch("/api/v/orders");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
    setLastPoll(new Date());
    const openNow = (j.orders ?? []).filter((o: any) => OPEN.includes(o.status)).length;
    if (openNow > prevOpenCount.current) {
      const original = document.title;
      document.title = `(${openNow}) New Order!`;
      setTimeout(() => { document.title = original; }, 4000);
    }
    prevOpenCount.current = openNow;
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAnalytics(p = period, pg = recentPage) {
    setAnalyticsLoad(true);
    const r = await fetch(`/api/v/orders/analytics?period=${p}&page=${pg}`);
    const j = await r.json();
    setAnalyticsLoad(false);
    if (r.ok) setAnalyticsData(j);
  }

  useEffect(() => { loadAnalytics(period, recentPage); }, [period, recentPage]);

  async function advance(id: string, to: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    load();
  }

  async function completeWithCode(orderId: string) {
    const code = (completeCodes[orderId] ?? "").trim();
    if (code.length !== 4) return;
    setCompleting(orderId);
    setCompleteMsgs(m => ({ ...m, [orderId]: "" }));
    const r = await fetch("/api/v/orders/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const j = await r.json();
    setCompleting(null);
    if (!r.ok) {
      setCompleteMsgs(m => ({ ...m, [orderId]: "Wrong code — try again" }));
    } else {
      setCompleteCodes(c => ({ ...c, [orderId]: "" }));
      setCompleted(j);
      load(); loadAnalytics();
    }
  }

  if (error) return <div className="container"><Nav role="v" /><p style={{ color: "var(--danger)" }}>{error}</p></div>;
  if (!data)  return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const open = data.orders.filter((o: any) =>  OPEN.includes(o.status));
  const ana  = analyticsData?.analytics;

  function fmt$(n: number) { return `$${(n / 100).toFixed(2)}`; }
  function fmtTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: "America/Puerto_Rico",
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0, color: "var(--venue-brand)", fontSize: "1.7rem" }}>Orders — {data.venueName}</h2>
          {lastPoll && (
            <span className="muted" style={{ fontSize: 12 }}>
              Updated {lastPoll.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--venue-brand)" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "var(--venue-brand)",
              display: "inline-block", boxShadow: "0 0 0 3px var(--venue-brand-glow)",
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
            Live
          </span>
          <button className="btn sm secondary" onClick={load}>Refresh</button>
        </div>
      </div>
      <Nav role="v" />

      {/* ── Completion popup ── */}
      {completed && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "var(--surface)", borderRadius: 20,
            border: "1px solid rgba(231,168,255,0.3)",
            boxShadow: "0 0 60px rgba(231,168,255,0.18)",
            padding: 28, maxWidth: 380, width: "100%", textAlign: "center",
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              background: "rgba(231,168,255,0.12)", border: "2px solid var(--venue-brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, margin: "0 auto 14px",
            }}>✓</div>
            <h2 style={{ color: "var(--ink)", margin: "0 0 6px" }}>Order Completed</h2>
            <p style={{ color: "var(--muted-text)", fontSize: 13, margin: "0 0 14px" }}>
              Order <strong style={{ color: "var(--brand)", fontSize: 16 }}>{completed.orderNumber}</strong>
            </p>
            <div style={{
              background: "var(--bg)", borderRadius: 12, padding: "12px 16px",
              textAlign: "left", marginBottom: 18,
            }}>
              <div className="muted" style={{ marginBottom: 4 }}>Customer: <strong>@{completed.username}</strong></div>
              <div className="muted" style={{ marginBottom: 4 }}>Items: {completed.items}</div>
              <div className="muted">Total: <strong style={{ color: "var(--brand)" }}>${(completed.totalCents / 100).toFixed(2)}</strong></div>
            </div>
            <button
              onClick={() => setCompleted(null)}
              style={{
                width: "100%", padding: 12, borderRadius: 12,
                background: "var(--brand)", border: "none", color: "#080c12",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >Acknowledge</button>
          </div>
        </div>
      )}

      {/* ── Open Orders ── */}
      <h3>Open ({open.length})</h3>
      {open.length === 0 && <p className="muted">No open orders right now.</p>}
      <div className="row">
        {open.map((o: any) => (
          <div key={o.id} className="card" style={{ flex: "1 1 300px" }}>
            <div className="header">
              <div>
                <strong>@{o.user.username}</strong>
                {o.orderNumber && (
                  <span style={{ display: "block", fontSize: 11, color: "var(--brand)", fontWeight: 600, marginTop: 2 }}>
                    {o.orderNumber}
                  </span>
                )}
              </div>
              <span className={`badge st-${o.status}`}>{o.status}</span>
            </div>
            <p className="muted" style={{ margin: "6px 0 2px" }}>
              {o.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}
            </p>
            <p className="muted" style={{ margin: "2px 0 10px" }}>${(o.totalCents / 100).toFixed(2)}</p>

            {/* PLACED → Accept or Reject */}
            {o.status === "PLACED" && (
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn sm"
                  style={{ background: "var(--brand)", color: "#080c12", fontWeight: 700 }}
                  onClick={() => advance(o.id, "ACCEPTED")}
                >Accept</button>
                <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Reject</button>
              </div>
            )}

            {/* ACCEPTED → Preparing or Cancel */}
            {o.status === "ACCEPTED" && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => advance(o.id, "PREPARING")}>Mark Preparing</button>
                <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
              </div>
            )}

            {/* PREPARING → Ready or Cancel */}
            {o.status === "PREPARING" && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => advance(o.id, "READY")}>Mark Ready</button>
                <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
              </div>
            )}

            {/* READY → enter 4-digit customer code to complete */}
            {o.status === "READY" && (
              <div style={{ marginTop: 4 }}>
                <p className="muted" style={{ margin: "0 0 6px", fontSize: 12, fontStyle: "italic" }}>
                  Ask customer for their 4-digit code to complete.
                </p>
                <div className="row" style={{ gap: 6, alignItems: "flex-start" }}>
                  <input
                    value={completeCodes[o.id] ?? ""}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCompleteCodes(c => ({ ...c, [o.id]: v }));
                      setCompleteMsgs(m => ({ ...m, [o.id]: "" }));
                    }}
                    placeholder="0000"
                    inputMode="numeric"
                    maxLength={4}
                    style={{ width: 82, letterSpacing: 5, fontSize: 20, fontWeight: 700, textAlign: "center", padding: "6px 8px" }}
                  />
                  <button
                    className="btn sm"
                    style={{ background: "var(--brand)", color: "#080c12", fontWeight: 700 }}
                    disabled={(completeCodes[o.id] ?? "").length !== 4 || completing === o.id}
                    onClick={() => completeWithCode(o.id)}
                  >{completing === o.id ? "…" : "Complete"}</button>
                  <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
                </div>
                {completeMsgs[o.id] && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>
                    {completeMsgs[o.id]}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ══════════════════ ANALYTICS ══════════════════ */}
      <div style={{ marginTop: 36 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1.5px solid var(--venue-brand)", paddingBottom: 8, marginBottom: 20,
        }}>
          <h3 style={{ margin: 0, color: "var(--venue-brand)" }}>Analytics</h3>
          {analyticsLoad && <span className="muted" style={{ fontSize: 12 }}>Loading…</span>}
        </div>

        {/* Period tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setRecentPage(1); }}
              style={{
                padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${period === p.key ? "var(--venue-brand)" : "var(--border)"}`,
                background: period === p.key ? "var(--venue-brand)" : "transparent",
                color: period === p.key ? "#1a003a" : "var(--muted-text)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >{p.label}</button>
          ))}
        </div>

        {/* KPI cards */}
        {ana && (
          <>
            <div className="row" style={{ marginBottom: 20, gap: 10 }}>
              {[
                { label: "Revenue",   value: fmt$(ana.revenue),         sub: "from completed orders" },
                { label: "Orders",    value: ana.orderCount,             sub: "total in period" },
                { label: "Completed", value: ana.completedCount,         sub: `${ana.orderCount > 0 ? Math.round(ana.completedCount / ana.orderCount * 100) : 0}% of orders` },
                { label: "Cancelled", value: ana.cancelledCount,         sub: `${ana.orderCount > 0 ? Math.round(ana.cancelledCount / ana.orderCount * 100) : 0}% of orders` },
                { label: "Avg Order", value: fmt$(ana.avgOrderCents),    sub: "per completed order" },
              ].map(card => (
                <div key={card.label} className="card" style={{ flex: "1 1 130px", textAlign: "center", padding: "14px 10px" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--venue-brand)", lineHeight: 1 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{card.label}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Top items */}
            {ana.topItems.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "var(--muted-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Top Items
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {ana.topItems.map((item: any, i: number) => {
                    const pct = ana.revenue > 0 ? item.revenueCents / ana.revenue : 0;
                    return (
                      <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, width: 18, color: "var(--muted-text)", flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                        <div style={{ flex: 2, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${(pct * 100).toFixed(1)}%`, height: "100%", background: "var(--venue-brand)", borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, color: "var(--muted-text)", width: 36, textAlign: "right", flexShrink: 0 }}>{item.qty}×</span>
                        <span style={{ fontSize: 13, fontWeight: 700, width: 64, textAlign: "right", flexShrink: 0, color: "var(--venue-brand)" }}>
                          {fmt$(item.revenueCents)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Recent orders table ── */}
        <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", color: "var(--muted-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Recent Orders
        </h4>
        {analyticsData?.recent?.length === 0 && <p className="muted">No closed orders in this period.</p>}
        {analyticsData?.recent?.length > 0 && (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
                    {["Order","Customer","Items","Total","Status","Time"].map(h => (
                      <th key={h} style={{ textAlign: h === "Total" || h === "Time" ? "right" : h === "Status" ? "center" : "left", padding: "6px 8px", fontWeight: 600, fontSize: 11, color: "var(--muted-text)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.recent.map((o: any) => (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 8px", fontFamily: "monospace", color: "var(--brand)", fontWeight: 700, fontSize: 12 }}>{o.orderNumber || "—"}</td>
                      <td style={{ padding: "8px 8px", fontWeight: 600 }}>@{o.user.username}</td>
                      <td style={{ padding: "8px 8px", color: "var(--muted-text)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: 700 }}>{fmt$(o.totalCents)}</td>
                      <td style={{ padding: "8px 8px", textAlign: "center" }}>
                        <span className={`st-${o.status}`} style={{ fontSize: 11, fontWeight: 600 }}>{o.status}</span>
                      </td>
                      <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--muted-text)", fontSize: 12, whiteSpace: "nowrap" }}>
                        {fmtTime(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {analyticsData.totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }}>
                <button className="btn sm secondary" disabled={recentPage <= 1} onClick={() => setRecentPage(p => p - 1)}>← Prev</button>
                <span className="muted" style={{ fontSize: 13 }}>
                  Page {analyticsData.page} of {analyticsData.totalPages}
                  <span style={{ marginLeft: 8, fontSize: 11 }}>({analyticsData.recentTotal} orders)</span>
                </span>
                <button className="btn sm secondary" disabled={recentPage >= analyticsData.totalPages} onClick={() => setRecentPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

