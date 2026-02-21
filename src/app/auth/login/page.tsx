"use client";
import { useState } from "react";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error || "Invalid credentials"); return; }
    if (data.role === "ADMIN") window.location.href = "/admin/analytics";
    else if (data.role === "VENUE") window.location.href = "/v/dashboard";
    else window.location.href = "/u/zones";
  }

  return (
    <div className="container">
      <a href="/role" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, opacity: 0.7, fontSize: 14 }}>← Back</a>
      <h2>Log in</h2>
      <div className="card">
        <label>Email or username</label>
        <input
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="you@example.com or @nightrider_pr"
          autoCapitalize="none"
          autoCorrect="off"
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={submit} disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
          <a href="/auth/signup" className="btn secondary">Create account</a>
        </div>
        {msg && <p className="muted" style={{ color: "var(--error,#f66)" }}>{msg}</p>}
      </div>
    </div>
  );
}
