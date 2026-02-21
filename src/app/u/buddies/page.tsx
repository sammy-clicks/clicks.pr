"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function Buddies() {
  const [data, setData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/buddies");
    setData(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function send() {
    setMsg("");
    const r = await fetch("/api/buddies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "Failed"); return; }
    setMsg("Request sent!");
    setEmail("");
    load();
  }

  async function respond(buddyId: string, action: "accept" | "block") {
    await fetch("/api/buddies", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buddyId, action }),
    });
    load();
  }

  return (
    <div className="container">
      <h2>Buddies</h2>
      <Nav role="u" />

      <div className="card" style={{ marginBottom: 16 }}>
        <label>Send buddy request by email</label>
        <div className="row" style={{ marginTop: 8 }}>
          <input style={{ flex: 1 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@example.com" />
          <button className="btn" onClick={send}>Add</button>
        </div>
        {msg && <p className="muted" style={{ marginTop: 6 }}>{msg}</p>}
      </div>

      {data?.requests?.length > 0 && (
        <>
          <h3>Incoming Requests</h3>
          <div className="row">
            {data.requests.map((r: any) => (
              <div key={r.buddyId} className="card" style={{ flex: "1 1 280px" }}>
                <strong>{r.name}</strong>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn sm" onClick={() => respond(r.buddyId, "accept")}>Accept</button>
                  <button className="btn sm secondary" onClick={() => respond(r.buddyId, "block")}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3>My Buddies {data ? `(${data.buddies.length})` : ""}</h3>
      {data?.buddies?.length === 0 && <p className="muted">No buddies yet. Add some!</p>}
      <div className="row">
        {data?.buddies?.map((b: any) => (
          <div key={b.buddyId} className="card" style={{ flex: "1 1 240px" }}>
            <strong>{b.name}</strong>
            {b.ghostMode && <p className="muted">&#128123; Ghost mode</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
