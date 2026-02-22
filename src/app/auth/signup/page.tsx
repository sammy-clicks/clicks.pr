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
  const [agreed, setAgreed] = useState(false);
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
    if (!agreed) { setMsg("You must agree to the Terms of Service and Privacy Policy."); return; }
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
    <div className="auth-bg">
      <div className="auth-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Clicks" className="auth-logo-sm" />

        <a href="/role" className="auth-back">&#8592; Back</a>

        <div className="auth-card">
          <p className="auth-card-title">Create account</p>
          <p className="auth-card-sub">Join Clicks — Puerto Rico&apos;s nightlife radar</p>

          <form onSubmit={submit} autoComplete="on" noValidate>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="su-first">First name</label>
                <input
                  id="su-first"
                  name="given-name"
                  value={firstName}
                  onChange={e => setFirst(e.target.value)}
                  placeholder="Carlos"
                  autoComplete="given-name"
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="su-last">Last name</label>
                <input
                  id="su-last"
                  name="family-name"
                  value={lastName}
                  onChange={e => setLast(e.target.value)}
                  placeholder="Mendoza"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <label htmlFor="su-bday">Birthdate</label>
            <input id="su-bday" name="bday" type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} autoComplete="bday" />

            <label htmlFor="su-country">Country</label>
            <select id="su-country" name="country" value={country} onChange={e => setCountry(e.target.value)} autoComplete="country">
              <option value="PR">Puerto Rico</option>
              <option value="US">United States</option>
            </select>

            <label htmlFor="su-user">
              Username
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "rgba(255,255,255,0.25)", marginLeft: 6 }}>
                (shown on leaderboard)
              </span>
            </label>
            <input
              id="su-user"
              name="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nightrider_pr"
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
              onChange={e => setEmail(e.target.value)}
              placeholder="carlos@example.com"
              autoComplete="email"
            />

            <label htmlFor="su-pw">Password</label>
            <input
              id="su-pw"
              name="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              autoComplete="new-password"
            />

            <label htmlFor="su-cpw">Confirm password</label>
            <input
              id="su-cpw"
              name="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
            />

            <div className="auth-terms">
              <input
                type="checkbox"
                id="su-agree"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <label htmlFor="su-agree" className="auth-terms-label">
                I have read and agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                By creating an account you confirm you are 18 years of age or older.
              </label>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading || !agreed}>
              {loading ? "Creating…" : "Create account"}
            </button>
            {msg && <p className="auth-error">{msg}</p>}
          </form>

          <div className="auth-card-footer" style={{ marginTop: 18 }}>
            Already have an account?{" "}
            <a href="/auth/login">Log in →</a>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/copyright.png" alt="© Clicks" className="auth-copyright" />
      </div>
    </div>
  );
}
