"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card" style={{ flex: "1 1 160px", textAlign: "center" }}>
      <div style={{ fontSize: 30, fontWeight: 700 }}>{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/admin/analytics");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
  }

  useEffect(() => { load(); }, []);

  if (error) return <div className="container"><Nav role="admin" /><p className="muted">{error}</p></div>;
  if (!data) return <div className="container"><Nav role="admin" /><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <div className="header">
        <h2>Analytics</h2>
        <button className="btn secondary" onClick={load}>Refresh</button>
      </div>
      <Nav role="admin" />

      <h3>Platform</h3>
      <div className="row">
        <Stat label="Total users" value={data.totals.users} />
        <Stat label="Venues" value={data.totals.venues} />
        <Stat label="Active now" value={data.totals.activeNow} />
      </div>

      <h3>Last 7 days</h3>
      <div className="row">
        <Stat label="New signups" value={data.week.signups} />
        <Stat label="Check-ins" value={data.week.checkins} />
        <Stat label="Clicks" value={data.week.clicks} />
      </div>

      <h3>Today (24h)</h3>
      <div className="row">
        <Stat label="Check-ins" value={data.today.checkins} />
        <Stat label="Clicks" value={data.today.clicks} />
      </div>

      {data.topVotes.length > 0 && (
        <>
          <h3>Weekly Votes — Top 5</h3>
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

      <h3>Zone Activity (live)</h3>
      <table>
        <thead><tr><th>Zone</th><th>Status</th><th>Active</th></tr></thead>
        <tbody>
          {data.zones.map((z: any) => (
            <tr key={z.name}>
              <td>{z.name}</td>
              <td>{z.isEnabled ? <span className="green">Enabled</span> : <span className="red">Disabled</span>}</td>
              <td>{z.active}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
