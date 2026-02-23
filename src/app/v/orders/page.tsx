"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

const OPEN = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

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
  const [completed, setCompleted]         = useState<CompletedInfo | null>(null);
  const prevOpenCount = useRef(0);

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
      load();
    }
  }

  if (error) return <div className="container"><Nav role="v" /><p style={{ color: "var(--danger)" }}>{error}</p></div>;
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const open   = data.orders.filter((o: any) =>  OPEN.includes(o.status));
  const closed = data.orders.filter((o: any) => !OPEN.includes(o.status)).slice(0, 20);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>Orders — {data.venueName}</h2>
          {lastPoll && (
            <span className="muted" style={{ fontSize: 12 }}>
              Updated {lastPoll.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--brand)" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "var(--brand)",
              display: "inline-block", boxShadow: "0 0 0 3px var(--brand-glow)",
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
            border: "1px solid rgba(8,218,244,0.3)",
            boxShadow: "0 0 60px rgba(8,218,244,0.2)",
            padding: 28, maxWidth: 380, width: "100%", textAlign: "center",
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: "50%",
              background: "rgba(8,218,244,0.12)", border: "2px solid var(--brand)",
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

      {/* ── Recent (closed) ── */}
      {closed.length > 0 && (
        <>
          <h3>Recent</h3>
          <table>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {closed.map((o: any) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "monospace", color: "var(--brand)", fontWeight: 700 }}>
                    {o.orderNumber || "—"}
                  </td>
                  <td>{o.user.firstName} {o.user.lastName ? `${o.user.lastName[0]}.` : ""}</td>
                  <td>${(o.totalCents / 100).toFixed(2)}</td>
                  <td><span className={`st-${o.status}`}>{o.status}</span></td>
                  <td>{new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

