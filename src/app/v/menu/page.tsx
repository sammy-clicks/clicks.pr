"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function VenueMenu() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("5.00");
  const [isAlcohol, setIsAlcohol] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/v/menu");
    const j = await r.json();
    if (!r.ok) { setError(j.error || "Unauthorized"); return; }
    setData(j);
  }
  useEffect(() => { load(); }, []);

  async function addItem() {
    setMsg("");
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!name || isNaN(priceCents)) { setMsg("Fill in all fields."); return; }
    const r = await fetch("/api/v/menu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, priceCents, isAlcohol }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Item added.");
    setName(""); setPrice("5.00"); setIsAlcohol(false);
    load();
  }

  async function toggleAvail(id: string, isAvailable: boolean) {
    await fetch(`/api/v/menu/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isAvailable }),
    });
    load();
  }

  async function deleteItem(id: string) {
    await fetch(`/api/v/menu/${id}`, { method: "DELETE" });
    load();
  }

  if (error) return <div className="container"><Nav role="v" /><p className="muted">{error}</p></div>;
  if (!data) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <h2>Menu — {data.venueName}</h2>
      <Nav role="v" />

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px" }}>Add item</h3>
        <div className="row">
          <div style={{ flex: 2 }}><label>Name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Price ($)</label><input type="number" value={price} step="0.01" min="0" onChange={e => setPrice(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="alc" checked={isAlcohol} onChange={e => setIsAlcohol(e.target.checked)} style={{ width: "auto" }} />
          <label htmlFor="alc" style={{ margin: 0 }}>Alcohol item</label>
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={addItem}>Add</button>
        {msg && <p className="muted" style={{ marginTop: 6 }}>{msg}</p>}
      </div>

      <table>
        <thead><tr><th>Name</th><th>Price</th><th>Type</th><th>Available</th><th></th></tr></thead>
        <tbody>
          {data.items.map((m: any) => (
            <tr key={m.id}>
              <td><strong>{m.name}</strong></td>
              <td>${(m.priceCents / 100).toFixed(2)}</td>
              <td>{m.isAlcohol ? "\ud83c\udf7a Alcohol" : "\ud83e\udd64 N/A"}</td>
              <td>
                <button className={`btn sm ${m.isAvailable ? "secondary" : ""}`} onClick={() => toggleAvail(m.id, !m.isAvailable)}>
                  {m.isAvailable ? "On" : "Off"}
                </button>
              </td>
              <td><button className="btn sm danger" onClick={() => deleteItem(m.id)}>Del</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
