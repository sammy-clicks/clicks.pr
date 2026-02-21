"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function Municipalities() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/municipalities");
    setData(await r.json());
  }
  useEffect(()=>{ load(); }, []);

  async function update(id: string, mins: number) {
    setMsg("");
    const r = await fetch("/api/admin/municipalities", {
      method: "PATCH",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ id, defaultAlcoholCutoffMins: mins })
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Updated.");
    await load();
  }

  if (!data) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>Municipalities (78)</h2>
      <Nav role="admin" />
      {msg && <p className="muted">{msg}</p>}
      <div className="row">
        {data.items.map((m:any)=>(
          <div key={m.id} className="card" style={{flex:"1 1 320px"}}>
            <strong>{m.name}</strong>
            <div className="muted">Default cutoff mins: {m.defaultAlcoholCutoffMins}</div>
            <div className="row" style={{marginTop:8}}>
              <button className="btn secondary" onClick={()=>update(m.id, 60)}>1:00am</button>
              <button className="btn secondary" onClick={()=>update(m.id, 120)}>2:00am</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
