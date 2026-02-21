"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const NEXT_STATUS: Record<string, string> = {
  PLACED: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const OPEN = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

export default function VenueOrders() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/v/orders");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
  }

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  async function advance(id: string, to: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    load();
  }

  if (error) return <div className="container"><Nav role="v" /><p className="muted">{error}</p></div>;
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const open = data.orders.filter((o: any) => OPEN.includes(o.status));
  const closed = data.orders.filter((o: any) => !OPEN.includes(o.status)).slice(0, 10);

  return (
    <div className="container">
      <div className="header">
        <h2>Orders — {data.venueName}</h2>
        <button className="btn secondary" onClick={load}>Refresh</button>
      </div>
      <Nav role="v" />

      <h3>Open ({open.length})</h3>
      {open.length === 0 && <p className="muted">No open orders.</p>}
      <div className="row">
        {open.map((o: any) => (
          <div key={o.id} className="card" style={{ flex: "1 1 300px" }}>
            <div className="header">
              <strong>{o.user.firstName} {o.user.lastName[0]}.</strong>
              <span className={`badge st-${o.status}`}>{o.status}</span>
            </div>
            <p className="muted">{o.items.map((i: any) => `${i.qty}× ${i.name}`).join(", ")}</p>
            <p className="muted">${(o.totalCents / 100).toFixed(2)}</p>
            <div className="row" style={{ marginTop: 8 }}>
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

      {closed.length > 0 && (
        <>
          <h3>Recent Completed / Cancelled</h3>
          <table>
            <thead><tr><th>Customer</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>
              {closed.map((o: any) => (
                <tr key={o.id}>
                  <td>{o.user.firstName} {o.user.lastName[0]}.</td>
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
