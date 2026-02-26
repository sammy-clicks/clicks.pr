"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setMsg("Invalid or missing reset link.");
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setMsg("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setMsg("Passwords do not match."); return; }
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error || "Failed to reset password."); return; }
    setDone(true);
  }

  return (
    <div className="auth-bg">
      <div className="auth-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Clicks" className="auth-logo-sm" />

        <div className="auth-card">
          <p className="auth-card-title">Reset password</p>
          <p className="auth-card-sub">
            {done ? "Password updated! You can now log in." : "Enter your new password."}
          </p>

          {!done && (
            <form onSubmit={submit} noValidate>
              <label htmlFor="rp-pw">New password</label>
              <input
                id="rp-pw"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
              <label htmlFor="rp-cpw">Confirm new password</label>
              <input
                id="rp-cpw"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
              <button type="submit" className="auth-submit-btn" disabled={loading || !token}>
                {loading ? "Saving…" : "Set new password"}
              </button>
              {msg && <p className="auth-error">{msg}</p>}
            </form>
          )}

          {done && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <a href="/auth/login" className="auth-submit-btn" style={{ display: "block", textAlign: "center", marginTop: 8 }}>
                Log in →
              </a>
            </div>
          )}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/copyright.png" alt="© Clicks" className="auth-copyright" />
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
