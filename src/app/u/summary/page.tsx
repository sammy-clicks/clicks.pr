"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export default function Summary() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/night-summary")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load."));
  }, []);

  if (error) return <div className="container"><Nav role="u" /><p className="muted">{error}</p></div>;
  if (!data) return <div className="container"><Nav role="u" /><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <div className="header">
        <h2>Night Summary</h2>
        <span className="badge">Since {fmtTime(data.nightStart)}</span>
      </div>
      <Nav role="u" />

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="card" style={{ flex: "1 1 180px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{data.checkins.length}</div>
          <div className="muted">Venues visited</div>
        </div>
        <div className="card" style={{ flex: "1 1 180px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{data.orders.length}</div>
          <div className="muted">Orders placed</div>
        </div>
        <div className="card" style={{ flex: "1 1 180px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{data.clicks}</div>
          <div className="muted">Clicks sent</div>
        </div>
        <div className="card" style={{ flex: "1 1 180px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(data.totalSpentCents)}</div>
          <div className="muted">Spent tonight</div>
        </div>
      </div>

      {data.checkins.length > 0 && (
        <>
          <h3>&#128205; Venues Visited</h3>
          <div className="row">
            {data.checkins.map((c: any) => (
              <div key={c.id} className="card" style={{ flex: "1 1 260px" }}>
                <strong>{c.venueName}</strong>
                <p className="muted">{c.venueType} &bull; In {fmtTime(c.startAt)}{c.endAt ? ` · Out ${fmtTime(c.endAt)}` : " · Active"}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {data.orders.length > 0 && (
        <>
          <h3>&#127860; Orders</h3>
          <div className="row">
            {data.orders.map((o: any) => (
              <div key={o.id} className="card" style={{ flex: "1 1 260px" }}>
                <strong>{o.venueName}</strong>
                <p className="muted">{o.itemCount} item{o.itemCount !== 1 ? "s" : ""} &bull; {fmt(o.totalCents)}</p>
                <p className={`muted st-${o.status}`}>{o.status}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {data.checkins.length === 0 && data.orders.length === 0 && (
        <p className="muted">No activity recorded yet tonight. Go out and explore a zone!</p>
      )}
    </div>
  );
}
