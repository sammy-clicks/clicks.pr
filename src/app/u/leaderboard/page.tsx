"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function Leaderboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/leaderboard");
    setData(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="container">
      <div className="header">
        <h2>Leaderboard</h2>
        <button className="btn secondary" onClick={load} disabled={loading}>Refresh</button>
      </div>
      <Nav role="u" />

      {!data && <p className="muted">Loading…</p>}

      {data && (
        <>
          <h3>&#128293; Live — Top Zones by Crowd</h3>
          {data.topVenues.length === 0 && <p className="muted">No active crowds yet tonight.</p>}
          <div className="row">
            {data.topVenues.map((v: any, i: number) => (
              <div key={v.venueId} className="card" style={{ flex: "1 1 280px" }}>
                <div className="header">
                  <strong>#{i + 1} {v.name}</strong>
                  <span className="badge">{v.type}</span>
                </div>
                <p className="muted">{v.crowd} people active</p>
              </div>
            ))}
          </div>

          <h3>&#127942; Top Clickers This Week</h3>
          <p className="muted" style={{ marginBottom: 8 }}>Ghost-mode users are hidden.</p>
          {data.topClickers.length === 0 && <p className="muted">No clicks recorded yet this week.</p>}
          <table>
            <thead>
              <tr><th>#</th><th>Player</th><th>Clicks</th></tr>
            </thead>
            <tbody>
              {data.topClickers.map((u: any) => (
                <tr key={u.rank}>
                  <td>{u.rank}</td>
                  <td>{u.name}</td>
                  <td>{u.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
