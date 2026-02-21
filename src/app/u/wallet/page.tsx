"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function Wallet() {
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/wallet");
    setData(await r.json());
  }

  useEffect(()=>{ load(); }, []);

  async function topup() {
    setMsg("");
    const r = await fetch("/api/wallet/topup", {
      method:"POST",
      headers: {"content-type":"application/json"},
      body: JSON.stringify({ dollars: amount })
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Top-up recorded (mock).");
    await load();
  }

  if (!data) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>Wallet</h2>
      <Nav role="u" />
      <p className="muted">Balance: ${(data.balanceCents/100).toFixed(2)}</p>
      <div className="card">
        <label>Top-up amount (min $10)</label>
        <input type="number" value={amount} min={10} onChange={e=>setAmount(parseInt(e.target.value||"10",10))} />
        <button className="btn" style={{marginTop:10}} onClick={topup}>Top up (mock)</button>
        {msg && <p className="muted">{msg}</p>}
      </div>

      <h3 style={{marginTop:16}}>Transactions</h3>
      <div className="row">
        {data.txns.map((t:any)=>(
          <div key={t.id} className="card" style={{flex:"1 1 320px"}}>
            <strong>{t.type}</strong>
            <div className="muted">${(t.amountCents/100).toFixed(2)} • {new Date(t.createdAt).toLocaleString()}</div>
            <div className="muted">{t.memo || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
