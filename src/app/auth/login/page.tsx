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
          <a href="mailto:support@clickspr.com" style={{ color: "inherit", textDecoration: "underline" }}>
            support@clickspr.com
          </a>
          <br />
          © Clicks PR 2026 — All rights reserved.
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

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setMsg("");
    setBanned(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier, password }),
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
    else window.location.href = "/u/zones";
  }

  return (
    <>
      {banned && <BanModal info={banned} onClose={() => setBanned(null)} />}
      <div className="container">
        <a href="/role" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, opacity: 0.7, fontSize: 14 }}>← Back</a>
        <h2>Log in</h2>
        <form className="card" onSubmit={submit} autoComplete="on" noValidate>
          <label htmlFor="login-id">Email or username</label>
          <input
            id="login-id"
            name="username"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="you@example.com or @nightrider_pr"
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
          />
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
            <a href="/auth/signup" className="btn secondary">Create account</a>
          </div>
          {msg && <p className="muted" style={{ color: "var(--error,#f66)" }}>{msg}</p>}
        </form>
      </div>
    </>
  );
}
