"use client";
import { useState } from "react";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [birthdate, setBirthdate] = useState("2000-01-01");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("PR");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg("");
    if (!username.trim()) { setMsg("Username is required."); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setMsg("Username: 3-20 chars, letters/numbers/underscore only."); return; }
    if (!email) { setMsg("Email is required."); return; }
    if (password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setMsg("Passwords do not match."); return; }
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), firstName, lastName, birthdate, email, password, country }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error || "Failed"); return; }
    window.location.href = "/u/zones";
  }

  return (
    <div className="container">
      <h2>Create Account</h2>
      <div className="card">
        <div className="row">
          <div style={{flex:1}}><label>First name</label><input value={firstName} onChange={e=>setFirst(e.target.value)} /></div>
          <div style={{flex:1}}><label>Last name</label><input value={lastName} onChange={e=>setLast(e.target.value)} /></div>
        </div>
        <label>Birthdate</label>
        <input type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} />
        <label>Country</label>
        <select value={country} onChange={e=>setCountry(e.target.value)}>
          <option value="PR">Puerto Rico</option>
          <option value="US">USA</option>
        </select>
        <label>Username <span className="muted" style={{fontWeight:400}}>(public — shown on leaderboard)</span></label>
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. nightrider_pr" maxLength={20} />
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters" />
        <label>Confirm password</label>
        <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password" />
        <div className="row" style={{marginTop:12}}>
          <button className="btn" onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
        </div>
        {msg && <p className="muted" style={{color:"var(--error,#f66)"}}>{msg}</p>}
      </div>
    </div>
  );
}
