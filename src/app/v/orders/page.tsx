"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

const NEXT_STATUS: Record<string, string> = {
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const OPEN = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

type AcceptedInfo = {
  orderNumber: string;
  customer: string;
  username: string;
  totalCents: number;
  items: string;
};

export default function VenueOrders() {
  const [data, setData]           = useState<any>(null);
  const [error, setError]         = useState("");
  const [lastPoll, setLastPoll]   = useState<Date | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyOk, setVerifyOk]   = useState(false);
  const [accepted, setAccepted]   = useState<AcceptedInfo | null>(null);
  const [verifying, setVerifying] = useState(false);
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

  async function verifyOrder() {
    if (verifyCode.length !== 6) return;
    setVerifying(true);
    setVerifyMsg("");
    setVerifyOk(false);
    const r = await fetch("/api/v/orders/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: verifyCode }),
    });
    const j = await r.json();
    setVerifying(false);
    if (!r.ok) {
      setVerifyMsg("Wrong code");
      setVerifyOk(false);
    } else {
      setVerifyMsg("");
      setVerifyOk(true);
      setAccepted(j);
      setVerifyCode("");
      load();
    }
  }

  async function advance(id: string, to: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    load();
  }

  if (error) return <div className="container"><Nav role="v" /><p style={{ color: "var(--danger)" }}>{error}</p></div>;
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loadingâ€¦</p></div>;

  const open   = data.orders.filter((o: any) =>  OPEN.includes(o.status));
  const closed = data.orders.filter((o: any) => !OPEN.includes(o.status)).slice(0, 20);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>Orders â€” {data.venueName}</h2>
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

      {/* â”€â”€ Code Verification â”€â”€ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 10px" }}>Verify Customer Code</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Ask the customer for their 6-digit code and enter it here to accept their order.
        </p>
        <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <input
              value={verifyCode}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setVerifyCode(v);
                setVerifyMsg("");
                setVerifyOk(false);
              }}
              placeholder="Enter 6-digit code"
              style={{ letterSpacing: 4, fontSize: 20, fontWeight: 700, textAlign: "center" }}
              maxLength={6}
              inputMode="numeric"
            />
            {verifyMsg && (
              <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>
                {verifyMsg}
              </p>
            )}
          </div>
          <button
            className="btn"
            onClick={verifyOrder}
            disabled={verifyCode.length !== 6 || verifying}
            style={{ flexShrink: 0, marginTop: 0 }}
          >
            {verifying ? "Verifyingâ€¦" : "Verify"}
          </button>
        </div>
      </div>

      {/* â”€â”€ Code accepted popup â”€â”€ */}
      {accepted && (
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
            }}>âœ“</div>
            <h2 style={{ color: "var(--ink)", margin: "0 0 6px" }}>Code Accepted</h2>
            <p style={{ color: "var(--muted-text)", fontSize: 13, margin: "0 0 14px" }}>
              Order <strong style={{ color: "var(--brand)", fontSize: 16 }}>{accepted.orderNumber}</strong>
            </p>
            <div style={{
              background: "var(--bg)", borderRadius: 12, padding: "12px 16px",
              textAlign: "left", marginBottom: 18,
            }}>
              <div className="muted" style={{ marginBottom: 4 }}>Customer: <strong>@{accepted.username}</strong> ({accepted.customer})</div>
              <div className="muted" style={{ marginBottom: 4 }}>Items: {accepted.items}</div>
              <div className="muted">Total: <strong style={{ color: "var(--brand)" }}>${(accepted.totalCents / 100).toFixed(2)}</strong></div>
            </div>
            <button
              onClick={() => setAccepted(null)}
              style={{
                width: "100%", padding: 12, borderRadius: 12,
                background: "var(--brand)", border: "none", color: "#080c12",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >Acknowledge</button>
          </div>
        </div>
      )}

      {/* â”€â”€ Open Orders â”€â”€ */}
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
              {o.items.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}
            </p>
            <p className="muted" style={{ margin: "2px 0 10px" }}>${(o.totalCents / 100).toFixed(2)}</p>
            <div className="row" style={{ gap: 6 }}>
              {/* PLACED orders can only be advanced via code verification */}
              {o.status === "PLACED" && (
                <p className="muted" style={{ fontSize: 12, margin: 0, fontStyle: "italic" }}>
                  Awaiting code verification
                </p>
              )}
              {NEXT_STATUS[o.status] && (
                <button className="btn sm" onClick={() => advance(o.id, NEXT_STATUS[o.status])}>
                  Mark {NEXT_STATUS[o.status]}
                </button>
              )}
              <button className="btn sm danger" onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
            </div>
          </div>
        ))}
      </div>

      {/* â”€â”€ Recent (closed) â”€â”€ */}
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
                    {o.orderNumber || "â€”"}
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
