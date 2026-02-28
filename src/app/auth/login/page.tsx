"use client";
import { useState } from "react";

interface BanInfo { until: string; reason: string; isPermanent: boolean; }

function BanModal({ info, onClose }: { info: BanInfo; onClose: () => void }) {
  const untilDate = new Date(info.until);
  const isPerm = untilDate.getFullYear() >= 2090;
  const formatted = isPerm
    ? "Permanently"
    : untilDate.toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.80)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: "var(--card,#1a1a2e)",
          border: "1.5px solid #f66",
          borderRadius: 16,
          padding: "28px 20px",
          width: "100%",
          maxWidth: 380,
          textAlign: "center",
          boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 12 }}>🚫</div>
        <h2 style={{ color: "#f66", margin: "0 0 10px", fontSize: 20 }}>
          Account Suspended
        </h2>
        <p style={{ lineHeight: 1.65, fontSize: 14, margin: "0 0 16px" }}>
          You have been temporarily banned from the usage of{" "}
          <strong>Clicks</strong> due to a violation of our Terms of Service
          and Privacy Policy.
        </p>

        <div
          style={{
            background: "rgba(246,102,102,0.1)",
            border: "1px solid rgba(246,102,102,0.3)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 16,
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            <span style={{ opacity: 0.55 }}>Termination date: </span>
            <strong>{formatted}</strong>
          </div>
          <div style={{ fontSize: 13 }}>
            <span style={{ opacity: 0.55 }}>Reason: </span>
            <strong>{info.reason}</strong>
          </div>
        </div>

        <p style={{ fontSize: 11, opacity: 0.40, marginBottom: 18, lineHeight: 1.6 }}>
          If you believe this was made in error, please contact{" "}
          <a href="mailto:nightclickspr@gmail.com" style={{ color: "inherit", textDecoration: "underline" }}>
            nightclickspr@gmail.com
          </a>
          <br />
           Clicks PR 2026 &mdash; All rights reserved.
        </p>

        <button
          className="btn secondary"
          style={{ width: "100%", fontSize: 14 }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [banned, setBanned] = useState<BanInfo | null>(null);
  const [staySignedIn, setStaySignedIn] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg("");
    setBanned(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password, staySignedIn }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.status === 403 && data.bannedUntil) {
      setBanned({
        until: data.bannedUntil,
        reason: data.banReason ?? "Violation of Terms of Service",
        isPermanent: new Date(data.bannedUntil).getFullYear() >= 2090,
      });
      return;
    }
    if (!res.ok) { setMsg(data.error || "Invalid credentials"); return; }
    if (data.role === "ADMIN") window.location.href = "/admin/analytics";
    else if (data.role === "VENUE") window.location.href = "/v/dashboard";
    else window.location.href = "/u/dashboard";
  }

  return (
    <>
      {banned && <BanModal info={banned} onClose={() => setBanned(null)} />}
      <div className="auth-bg">
        <div className="auth-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Clicks" className="auth-logo-sm" />

          <a href="/role" className="auth-back">&#8592; Back</a>

          {/* Flow diagram */}
          <div style={{ width: "100%", marginBottom: 22, marginTop: 4 }}>
            <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.45, marginBottom: 10 }}>How it works</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
              {["/flow-1.png", "/flow-2.png", "/flow-3.png"].map((src, i) => (
                <div key={src} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Step ${i + 1}`} style={{ width: 96, height: "auto", display: "block" }} />
                  </div>
                  {i < 2 && (
                    <div style={{ padding: "0 6px", fontSize: 16, opacity: 0.4, flexShrink: 0 }}>›</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="auth-card">
            <p className="auth-card-title">Welcome back</p>
            <p className="auth-card-sub">Log in to your Clicks account</p>

            <form onSubmit={submit} autoComplete="on" noValidate>
              <label htmlFor="login-id">Email or username</label>
              <input
                id="login-id"
                name="username"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder=""
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
              />
              <label htmlFor="login-pw">Password</label>
              <input
                id="login-pw"
                name="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder=""
              />
              {/* Stay signed in toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  margin: "14px 0 4px",
                }}
              >
                <span style={{ fontSize: 13, opacity: 0.75 }}>Stay signed in</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={staySignedIn}
                  onClick={() => setStaySignedIn(v => !v)}
                  style={{
                    width: 42,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: staySignedIn ? "#08daf4" : "rgba(255,255,255,0.15)",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: staySignedIn ? 21 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}
                  />
                </button>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 14 }}>
                {loading ? "Logging in…" : "Log in"}
              </button>
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <a href="/auth/forgot-password" style={{ fontSize: 12, color: "#08daf4", opacity: 0.8 }}>
                  Forgot password?
                </a>
              </div>
              {msg && <p className="auth-error">{msg}</p>}
            </form>

            <div className="auth-card-footer" style={{ marginTop: 18 }}>
              No account yet?{" "}
              <a href="/auth/signup">Create one →</a>
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/copyright.png" alt="© Clicks" className="auth-copyright" />
        </div>
      </div>
    </>
  );
}
