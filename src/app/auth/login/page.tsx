"use client";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("admin@clicks.local");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "Failed"); return; }
    if (data.role === "ADMIN") window.location.href = "/admin/analytics";
    else if (data.role === "VENUE") window.location.href = "/v/dashboard";
    else window.location.href = "/u/zones";
  }

  return (
    <div className="container">
      <h2>Login (Venue/Admin)</h2>
      <div className="card">
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <div className="row" style={{marginTop:12}}>
          <button className="btn" onClick={submit}>Login</button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </div>
      <p className="muted">Create admin via <code>npm run create:admin</code>.</p>
    </div>
  );
}
