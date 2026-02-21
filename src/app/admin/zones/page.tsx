"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function ZonesAdmin() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const r = await fetch("/api/admin/zones");
    setData(await r.json());
  }
  useEffect(()=>{ load(); }, []);

  async function toggle(id: string, isEnabled: boolean) {
    await fetch("/api/admin/zones", {
      method:"PATCH",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ id, isEnabled })
    });
    await load();
  }

  if (!data) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>Zones</h2>
      <Nav role="admin" />
      <div className="row">
        {data.items.map((z:any)=>(
          <div key={z.id} className="card" style={{flex:"1 1 320px"}}>
            <strong>{z.name}</strong>
            <div className="muted">{z.isEnabled ? "Enabled" : "Disabled"}</div>
            <div className="row" style={{marginTop:8}}>
              <button className="btn" onClick={()=>toggle(z.id, !z.isEnabled)}>{z.isEnabled ? "Disable" : "Enable"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
