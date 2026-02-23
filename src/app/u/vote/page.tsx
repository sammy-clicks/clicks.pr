"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function Vote() {
  const [data, setData] = useState<any>(null);
  const [venueId, setVenueId] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/vote");
    setData(await r.json());
  }
  useEffect(()=>{ load(); }, []);

  async function submit() {
    setMsg("");
    const r = await fetch("/api/vote", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ venueId }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Vote recorded.");
    await load();
  }

  if (!data) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="header">
        <h2>Vote</h2>
        <span className="badge">Week {data.week.week} • {data.week.year}</span>
      </div>
      <Nav role="u" />
      <div className="card">
        <label>Pick your favorite venue this week</label>
        <select value={venueId} onChange={e=>setVenueId(e.target.value)}>
          <option value="">Select…</option>
          {data.venues.map((v:any)=>(<option key={v.id} value={v.id}>{v.name}</option>))}
        </select>
        <button className="btn" style={{marginTop:10}} onClick={submit}>Vote</button>
        {msg && <p className="muted">{msg}</p>}
      </div>

      <h3 style={{marginTop:16}}>Current week results (public)</h3>
      <div className="row">
        {data.results.map((r:any)=>(
          <div key={r.venueId} className="card" style={{flex:"1 1 320px"}}>
            <strong>{r.venueName}</strong>
            <div className="muted">{r.votes} votes</div>
          </div>
        ))}
      </div>
    </div>
  );
}
