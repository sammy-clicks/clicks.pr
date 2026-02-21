"use client";
import { useState } from "react";

export default function Signup() {
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [birthdate, setBirthdate] = useState("2000-01-01");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("PR");
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName, lastName, birthdate, email, country }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "Failed"); return; }
    window.location.href = "/u/zones";
  }

  return (
    <div className="container">
      <h2>Signup (User)</h2>
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
        <label>Email (optional)</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} />
        <div className="row" style={{marginTop:12}}>
          <button className="btn" onClick={submit}>Create account</button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </div>
    </div>
  );
}
