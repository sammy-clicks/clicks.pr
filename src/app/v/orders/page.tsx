"use client";
import { useEffect, useState, useRef } from "react";
import { Nav } from "@/components/Nav";

const NEXT_STATUS: Record<string, string> = {
  PLACED: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const OPEN = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

export default function VenueOrders() {
  const [data, setData]         = useState<any>(null);
  const [error, setError]       = useState("");
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const prevOpenCount = useRef(0);

  async function load() {
    const r = await fetch("/api/v/orders");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
    setLastPoll(new Date());
    // Flash browser tab if new open orders arrived
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

  function toggleCode(id: string) {
    setVisibleCodes(p => ({ ...p, [id]: !p[id] }));
  }

  async function advance(id: string, to: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    load();
  }

  if (error) return <div className="container"><Nav role="v" /><p style={{ color: "#f66" }}>{error}</p></div>;
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loading...</p></div>;

  const open   = data.orders.filter((o: any) =>  OPEN.includes(o.status));
  const closed = data.orders.filter((o: any) => !OPEN.includes(o.status)).slice(0, 20);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>Orders — {data.venueName}</h2>
          {lastPoll && (
            <span className="muted" style={{ fontSize: 12 }}>
              Last updated {lastPoll.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Live pulse dot */}
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#08daf4" }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "#08daf4",
              display: "inline-block",
              boxShadow: "0 0 0 3px rgba(8,218,244,0.25)",
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
            Live
          </span>
          <button className="btn sm secondary" onClick={load}>Refresh</button>
        </div>
      </div>
      <Nav role="v" />

      <h3>Open ({open.length})</h3>
      {open.length === 0 && <p className="muted">No open orders right now.</p>}
      <div className="row">
        {open.map((o: any) => (
          <div key={o.id} className="card" style={{ flex: "1 1 300px" }}>
            <div className="header">
              <strong>@{o.user.username}</strong>
              <span className={`badge st-${o.status}`}>{o.status}</span>
            </div>

            {/* Order code with show/hide toggle */}
            {o.orderCode && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                <span style={{
                  fontSize: 22, fontWeight: 800, letterSpacing: 4,
                  color: visibleCodes[o.id] ? "#08daf4" : "transparent",
                  textShadow: visibleCodes[o.id] ? "none" : "0 0 12px rgba(0,0,0,0.6)",
                  background: visibleCodes[o.id] ? "none" : "#111",
                  borderRadius: 6, padding: "2px 6px",
                  userSelect: visibleCodes[o.id] ? "auto" : "none",
                  transition: "all 0.2s",
                  filter: visibleCodes[o.id] ? "none" : "blur(4px)",
                }}>#{o.orderCode}</span>
                <button className="btn sm secondary" style={{ fontSize: 11 }}
                  onClick={() => toggleCode(o.id)}>
                  {visibleCodes[o.id] ? "Hide" : "Show"}
                </button>
              </div>
            )}

            <p className="muted" style={{ margin: "4px 0" }}>{o.items.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}</p>
            <p className="muted" style={{ margin: "4px 0" }}>${(o.totalCents / 100).toFixed(2)}</p>
            <div className="row" style={{ marginTop: 10, gap: 6 }}>
              {NEXT_STATUS[o.status] && (
                <button className="btn sm" onClick={() => advance(o.id, NEXT_STATUS[o.status])}>
                  Mark {NEXT_STATUS[o.status]}
                </button>
              )}
              <button className="btn sm" style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
                onClick={() => advance(o.id, "CANCELLED")}>Cancel</button>
            </div>
          </div>
        ))}
      </div>

      {closed.length > 0 && (
        <>
          <h3>Recent</h3>
          <table>
            <thead>
              <tr>
                <th>Customer</th><th>Code</th><th>Total</th><th>Status</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((o: any) => (
                <tr key={o.id}>
                  <td>{o.user.firstName} {o.user.lastName ? `${o.user.lastName[0]}.` : ""}</td>
                  <td style={{ fontSize: 13, fontFamily: "monospace", color: "#08daf4" }}>#{o.orderCode}</td>
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
