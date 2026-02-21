"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function Venue({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/venues/${params.id}`).then(r=>r.json()).then(setData);
  }, [params.id]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => { setLat(p.coords.latitude); setLng(p.coords.longitude); },
      () => {}
    );
  }, []);

  async function checkIn() {
    setMsg("");
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ venueId: params.id, lat, lng })
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Checked in.");
    fetch(`/api/venues/${params.id}`).then(r=>r.json()).then(setData);
  }

  async function clickIt() {
    setMsg("");
    const res = await fetch("/api/clicks", {
      method: "POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ venueId: params.id })
    });
    const j = await res.json();
    if (!res.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Clicks recorded.");
    fetch(`/api/venues/${params.id}`).then(r=>r.json()).then(setData);
  }

  if (!data) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="header">
        <h2>{data.venue.name}</h2>
        <span className="badge">{data.crowdLevel}/10</span>
      </div>
      <Nav role="u" />
      <p className="muted">{data.venue.type} • {data.venue.address}</p>
      <p className="muted">Alcohol cutoff mins: {data.alcoholCutoffMins} (admin editable)</p>

      <div className="row">
        <button className="btn" onClick={checkIn}>Check in</button>
        <button className="btn secondary" onClick={clickIt}>Clicks</button>
        <a className="btn secondary" href={`https://www.google.com/maps?q=${data.venue.lat},${data.venue.lng}`} target="_blank">Maps</a>
      </div>
      {msg && <p className="muted">{msg}</p>}

      <h3 style={{marginTop:16}}>Menu</h3>
      <div className="row">
        {data.menu.map((m:any)=>(
          <div key={m.id} className="card" style={{flex:"1 1 260px", opacity: m.isAvailable ? 1 : 0.5}}>
            <strong>{m.name}</strong>
            <div className="muted">${(m.priceCents/100).toFixed(2)} {m.isAlcohol ? "• Alcohol" : ""}</div>
            {!m.isAvailable && <div className="muted">Unavailable</div>}
          </div>
        ))}
      </div>
      <p className="muted">Ordering endpoints are stubbed; implement in /api/orders with check-in + cutoff enforcement.</p>
    </div>
  );
}
