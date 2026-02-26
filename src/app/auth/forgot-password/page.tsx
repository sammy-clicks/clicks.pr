"use client";
import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setMsg("Enter your email address."); return; }
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error || "Something went wrong. Try again."); return; }
    setSent(true);
  }

  return (
    <div className="auth-bg">
      <div className="auth-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Clicks" className="auth-logo-sm" />
        <a href="/auth/login" className="auth-back">&#8592; Back to login</a>

        <div className="auth-card">
          <p className="auth-card-title">Forgot password?</p>
          <p className="auth-card-sub">
            {sent
              ? "Check your email for a reset link. It expires in 1 hour."
              : "Enter your email and we'll send you a password reset link."}
          </p>

          {!sent && (
            <form onSubmit={submit} noValidate>
              <label htmlFor="fp-email">Email address</label>
              <input
                id="fp-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder=""
                autoComplete="email"
                autoFocus
              />
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
              {msg && <p className="auth-error">{msg}</p>}
            </form>
          )}

          {sent && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Clicks" style={{ height: 48, marginBottom: 16 }} />
              <p style={{ fontSize: 13, opacity: 0.65 }}>
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  style={{ background: "none", border: "none", padding: 0, color: "#08daf4", fontWeight: 600, fontSize: "inherit", cursor: "pointer" }}
                >
                  try again
                </button>.
              </p>
            </div>
          )}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/copyright.png" alt="© Clicks" className="auth-copyright" />
      </div>
    </div>
  );
}
