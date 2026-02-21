"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const OPEN_STATUSES = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

export default function VenueDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/v/orders");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
  }

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  if (error) return <div className="container"><Nav role="v" /><p className="muted">{error}</p></div>;
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const open = data.orders.filter((o: any) => OPEN_STATUSES.includes(o.status));
  const byStatus: Record<string, number> = {};
  for (const o of open) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

  return (
    <div className="container">
      <div className="header">
        <h2>{data.venueName}</h2>
        <span className="badge">{open.length} open orders</span>
      </div>
      <Nav role="v" />

      <div className="row" style={{ marginBottom: 16 }}>
        {["PLACED", "ACCEPTED", "PREPARING", "READY"].map(s => (
          <div key={s} className="card" style={{ flex: "1 1 140px", textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{byStatus[s] || 0}</div>
            <div className={`muted st-${s}`}>{s}</div>
          </div>
        ))}
      </div>

      <h3>Open Orders</h3>
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
          </div>
        ))}
      </div>
    </div>
  );
}
