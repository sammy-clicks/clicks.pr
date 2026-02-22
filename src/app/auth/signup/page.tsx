"use client";
import { useState } from "react";

// Example suggestions shown to the user (they still have to type their real info)
const SUGGESTIONS = {
  firstName: "e.g. Carlos",
  lastName: "e.g. Mendoza",
  username: "e.g. nightrider_pr",
  email: "e.g. carlos@example.com",
};

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

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
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
      <a href="/role" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, opacity: 0.7, fontSize: 14 }}>← Back</a>
      <h2>Create Account</h2>
      <form className="card" onSubmit={submit} autoComplete="on" noValidate>
        <div className="row">
          <div style={{flex:1}}>
            <label htmlFor="su-first">First name</label>
            <input
              id="su-first"
              name="given-name"
              value={firstName}
              onChange={e=>setFirst(e.target.value)}
              placeholder={SUGGESTIONS.firstName}
              autoComplete="given-name"
            />
          </div>
          <div style={{flex:1}}>
            <label htmlFor="su-last">Last name</label>
            <input
              id="su-last"
              name="family-name"
              value={lastName}
              onChange={e=>setLast(e.target.value)}
              placeholder={SUGGESTIONS.lastName}
              autoComplete="family-name"
            />
          </div>
        </div>
        <label htmlFor="su-bday">Birthdate</label>
        <input id="su-bday" name="bday" type="date" value={birthdate} onChange={e=>setBirthdate(e.target.value)} autoComplete="bday" />
        <label htmlFor="su-country">Country</label>
        <select id="su-country" name="country" value={country} onChange={e=>setCountry(e.target.value)} autoComplete="country">
          <option value="PR">Puerto Rico</option>
          <option value="US">USA</option>
        </select>
        <label htmlFor="su-user">
          Username{" "}
          <span className="muted" style={{fontWeight:400}}>(public — shown on leaderboard)</span>
        </label>
        <input
          id="su-user"
          name="username"
          value={username}
          onChange={e=>setUsername(e.target.value)}
          placeholder={SUGGESTIONS.username}
          maxLength={20}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
        />
        <label htmlFor="su-email">Email</label>
        <input
          id="su-email"
          name="email"
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          placeholder={SUGGESTIONS.email}
          autoComplete="email"
        />
        <label htmlFor="su-pw">Password</label>
        <input
          id="su-pw"
          name="new-password"
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          placeholder="Min 8 characters"
          autoComplete="new-password"
        />
        <label htmlFor="su-cpw">Confirm password</label>
        <input
          id="su-cpw"
          name="confirm-password"
          type="password"
          value={confirm}
          onChange={e=>setConfirm(e.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
        />
        <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
          💡 Your browser may suggest saved info — you can accept it or type your own.
        </p>
        <div className="row" style={{marginTop:12}}>
          <button type="submit" className="btn" disabled={loading}>{loading ? "Creating…" : "Create account"}</button>
        </div>
        {msg && <p className="muted" style={{color:"var(--error,#f66)"}}>{msg}</p>}
      </form>
    </div>
  );
}
