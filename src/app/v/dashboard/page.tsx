"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

const OPEN_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

function customerLabel(user: any) {
  const first = user?.firstName?.trim();
  const last  = user?.lastName?.trim();
  if (first && last)  return `${first} ${last[0]}.`;
  if (first)          return first;
  return null;
}

type CompletedInfo = { orderNumber: string; username: string; totalCents: number; items: string };

export default function VenueDashboard() {
  const [data, setData]   = useState<any>(null);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<CompletedInfo | null>(null);

  const [completeCodes, setCompleteCodes] = useState<Record<string, string>>({});
  const [completeMsgs,  setCompleteMsgs]  = useState<Record<string, string>>({});
  const [completing,    setCompleting]    = useState<string | null>(null);
  const prevOpenCount = useRef(0);

  const [boostUntil, setBoostUntil] = useState<Date | null>(null);
  const [boosting,   setBoosting]   = useState(false);
  const [boostMsg,   setBoostMsg]   = useState("");

  async function load() {
    const r = await fetch("/api/v/orders");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
    if (j.venueBoostUntil) setBoostUntil(new Date(j.venueBoostUntil));
    const openNow = (j.orders ?? []).filter((o: any) => OPEN_STATUSES.includes(o.status)).length;
    if (openNow > prevOpenCount.current) {
      const orig = document.title;
      document.title = `(${openNow}) New Order!`;
      setTimeout(() => { document.title = orig; }, 4000);
    }
    prevOpenCount.current = openNow;
  }

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  async function advance(id: string, to: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
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
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const j = await r.json();
    setCompleting(null);
    if (!r.ok) {
      setCompleteMsgs(m => ({ ...m, [orderId]: "Wrong code — try again" }));
    } else {
      setCompleteCodes(c => ({ ...c, [orderId]: "" }));
      setCompleted({ orderNumber: j.orderNumber, username: j.username, totalCents: j.totalCents, items: j.items });
      load();
    }
  }

  async function activateBoost() {
    setBoosting(true);
    setBoostMsg("");
    const r = await fetch("/api/v/boost", { method: "POST" });
    const j = await r.json();
    setBoosting(false);
    if (r.ok) {
      setBoostUntil(new Date(j.boostActiveUntil));
    } else {
      setBoostMsg(j.error || "Failed to activate Boost Hour.");
    }
  }

  if (error) return <div className="container"><Nav role="v" /><p className="muted">{error}</p></div>;
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const open = data.orders.filter((o: any) => OPEN_STATUSES.includes(o.status));
  const byStatus: Record<string, number> = {};
  for (const o of open) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

  return (
    <div className="container">
      <div className="header">
        <h2 style={{ color: "var(--venue-brand)", fontSize: "1.7rem" }}>Dashboard — {data.venueName}</h2>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--venue-brand)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--venue-brand)", display: "inline-block", boxShadow: "0 0 0 3px var(--venue-brand-glow)", animation: "pulse 1.4s ease-in-out infinite" }} />
          Live
        </span>
      </div>
      <Nav role="v" />

      {/* ── Completion popup ── */}
      {completed && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--surface)", borderRadius: 20, border: "1.5px solid var(--venue-brand)", boxShadow: "0 0 60px rgba(231,168,255,0.18)", padding: 28, maxWidth: 360, width: "100%", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(231,168,255,0.12)", border: "2px solid var(--venue-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px" }}>✓</div>
            <h3 style={{ color: "var(--venue-brand)", margin: "0 0 6px" }}>Order Completed</h3>
            <p className="muted" style={{ margin: "0 0 12px" }}><strong>{completed.orderNumber}</strong> · @{completed.username}</p>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{completed.items} · <strong>${(completed.totalCents / 100).toFixed(2)}</strong></p>
            <button className="btn" style={{ width: "100%" }} onClick={() => setCompleted(null)}>Acknowledge</button>
          </div>
        </div>
      )}

      {/* ── Active Orders Hero ── */}
      <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, color: open.length > 0 ? "var(--venue-brand)" : "var(--muted-text)", transition: "color 0.3s" }}>
          {open.length}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--venue-brand)", marginTop: 8, opacity: open.length > 0 ? 1 : 0.45 }}>
          Active Orders
        </div>
      </div>

      {/* ── Boost Hour (PRO only) ── */}
      {data.venuePlan === "PRO" && (() => {
        const now = new Date();
        const active = boostUntil && boostUntil > now;
        const remaining = active ? Math.ceil((boostUntil!.getTime() - now.getTime()) / 60000) : 0;
        return (
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            {active ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(231,168,255,0.1)", border: "1.5px solid var(--venue-brand)", borderRadius: 12, padding: "10px 18px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--venue-brand)", display: "inline-block", boxShadow: "0 0 0 3px var(--venue-brand-glow)", animation: "pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--venue-brand)" }}>Boost Hour active — {remaining} min remaining</span>
              </div>
            ) : (
              <>
                <button
                  className="btn"
                  style={{ background: "linear-gradient(135deg,#e7a8ff,#c478f0)", color: "#0d0019", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: 12, border: "none" }}
                  disabled={boosting}
                  onClick={activateBoost}
                >
                  {boosting ? "Activating…" : "Activate Boost Hour"}
                </button>
                {boostMsg && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>{boostMsg}</p>}
              </>
            )}
          </div>
        );
      })()}

      {/* ── Status breakdown ── */}
      <div className="row" style={{ marginBottom: 24 }}>
        {["PLACED", "ACCEPTED", "PREPARING", "READY"].map(s => (
          <div key={s} className="card" style={{ flex: "1 1 120px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{byStatus[s] || 0}</div>
            <div className={`muted st-${s}`} style={{ fontSize: 11, marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── Open Order cards ── */}
      <h3 style={{ margin: "0 0 12px" }}>Open Orders</h3>
      {open.length === 0 && <p className="muted">No open orders right now.</p>}
      <div className="row">
        {open.map((o: any) => (
          <div key={o.id} className="card" style={{ flex: "1 1 300px" }}>
            <div className="header">
              <div>
                <strong>@{o.user.username}</strong>
                {o.orderNumber && <span style={{ display: "block", fontSize: 11, color: "var(--brand)", fontWeight: 600, marginTop: 2 }}>{o.orderNumber}</span>}
                {customerLabel(o.user) && (
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted-text)", marginTop: 2 }}>
                    Customer: <strong style={{ color: "var(--ink)" }}>{customerLabel(o.user)}</strong>
                  </span>
                )}
              </div>
              <span className={`badge st-${o.status}`}>{o.status}</span>
            </div>
            <p className="muted" style={{ margin: "6px 0 2px", fontSize: 13 }}>{o.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}</p>
            {o.note && (
              <p style={{ margin: "2px 0 4px", fontSize: 12, color: "var(--ink)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px" }}>
                <span style={{ fontWeight: 600, color: "var(--muted-text)" }}>Note: </span>{o.note}
              </p>
            )}
            <p className="muted" style={{ margin: "2px 0 10px", fontWeight: 700 }}>${(o.totalCents / 100).toFixed(2)}</p>

            {o.status === "PLACED" && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" style={{ background: "var(--brand)", color: "#080c12", fontWeight: 700 }} onClick={() => advance(o.id, "ACCEPTED")}>Accept</button>
                <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Reject</button>
              </div>
            )}
            {o.status === "ACCEPTED" && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => advance(o.id, "PREPARING")}>Mark Preparing</button>
                <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
              </div>
            )}
            {o.status === "PREPARING" && (
              <div className="row" style={{ gap: 6 }}>
                <button className="btn sm" onClick={() => advance(o.id, "READY")}>Mark Ready</button>
                <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
              </div>
            )}
            {o.status === "READY" && (
              <div style={{ marginTop: 4 }}>
                <p className="muted" style={{ margin: "0 0 6px", fontSize: 12, fontStyle: "italic" }}>Ask customer for their 4-digit code.</p>
                <div className="row" style={{ gap: 6, alignItems: "flex-start" }}>
                  <input
                    value={completeCodes[o.id] ?? ""}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCompleteCodes(c => ({ ...c, [o.id]: v }));
                      setCompleteMsgs(m => ({ ...m, [o.id]: "" }));
                    }}
                    placeholder="0000" inputMode="numeric" maxLength={4}
                    style={{ width: 80, letterSpacing: 6, fontSize: 20, fontWeight: 700, textAlign: "center", padding: "6px 8px" }}
                  />
                  <button className="btn sm" style={{ background: "var(--brand)", color: "#080c12", fontWeight: 700 }}
                    disabled={(completeCodes[o.id] ?? "").length !== 4 || completing === o.id}
                    onClick={() => completeWithCode(o.id)}
                  >{completing === o.id ? "…" : "Complete"}</button>
                  <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
                </div>
                {completeMsgs[o.id] && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>{completeMsgs[o.id]}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



