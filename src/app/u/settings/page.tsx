"use client";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [paused, setPaused] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/me");
    const j = await r.json();
    if (j.user) {
      setUser(j.user);
      setAvatarUrl(j.user.avatarUrl ?? "");
      setPaused(!!j.user.pausedAt);
    }
  }
  useEffect(() => { load(); }, []);

  function setMsg2(text: string, ok = true) { setMsg({ text, ok }); }

  async function saveProfile() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ avatarUrl: avatarUrl || null }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    setMsg2("Profile saved.");
    load();
  }

  async function changePassword() {
    if (newPw !== confirmPw) { setMsg2("New passwords don't match.", false); return; }
    setSaving(true); setMsg2("");
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    setMsg2("Password changed.");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  }

  async function togglePause() {
    const r = await fetch("/api/me/pause", { method: "POST" });
    const j = await r.json();
    if (r.ok) { setPaused(j.paused); setMsg2(j.paused ? "Account paused." : "Account resumed."); }
  }

  async function deleteAccount() {
    if (deleteConfirm !== user?.username) {
      setMsg2("Type your username exactly to confirm.", false);
      return;
    }
    const r = await fetch("/api/me", { method: "DELETE" });
    if (r.ok) window.location.href = "/auth/login";
  }

  if (!user) return <div className="container"><Nav role="u" /><p className="muted">Loading…</p></div>;

  const Avatar = ({ size = 48 }: { size?: number }) => (
    user.avatarUrl
      ? <img src={user.avatarUrl} alt="avatar" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
      : <div style={{
          width: size, height: size, borderRadius: "50%",
          background: "var(--accent, #9b5de5)", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: size * 0.4, fontWeight: 700, color: "#fff",
        }}>
          {user.username[0].toUpperCase()}
        </div>
  );

  return (
    <div className="container">
      <h2>Account Settings</h2>
      <Nav role="u" />

      {msg.text && (
        <p className="muted" style={{ color: msg.ok ? "var(--green, #0f0)" : "var(--error, #f66)", marginBottom: 12 }}>
          {msg.text}
        </p>
      )}

      {/* ── Profile ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Profile</h3>
        <div className="row" style={{ alignItems: "center", gap: 16, marginBottom: 16 }}>
          <Avatar size={64} />
          <div>
            <div><strong>@{user.username}</strong></div>
            <div className="muted">{user.firstName} {user.lastName}</div>
            <div className="muted" style={{ fontSize: 11 }}>Member since {new Date(user.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
        <label>Profile picture URL</label>
        <input
          value={avatarUrl}
          onChange={e => setAvatarUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
        <p className="muted" style={{ fontSize: 11, marginBottom: 0 }}>
          Paste any public image URL. Leave empty for initial avatar.
        </p>
        <button className="btn" style={{ marginTop: 10 }} onClick={saveProfile} disabled={saving}>
          Save profile
        </button>
      </div>

      {/* ── Password ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Change password</h3>
        <label>Current password</label>
        <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} />
        <label>New password (min 8 chars)</label>
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
        <label>Confirm new password</label>
        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
        <button className="btn" style={{ marginTop: 10 }} onClick={changePassword} disabled={saving || !currentPw || !newPw}>
          Change password
        </button>
      </div>

      {/* ── Account status ───────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px" }}>Account status</h3>
        <p className="muted">
          {paused
            ? "Your account is paused. You're hidden from leaderboards and can't receive buddy requests."
            : "Your account is active."}
        </p>
        <button className={`btn${paused ? "" : " secondary"}`} onClick={togglePause}>
          {paused ? "Resume account" : "Pause account"}
        </button>
      </div>

      {/* ── Danger zone ─────────────────────────────────────── */}
      <div className="card" style={{ border: "1px solid var(--error, #f66)", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px", color: "var(--error, #f66)" }}>Danger zone</h3>
        {!showDelete ? (
          <button className="btn danger" onClick={() => setShowDelete(true)}>Delete account</button>
        ) : (
          <>
            <p className="muted">This is permanent. All your data will be erased. Type your username <strong>@{user.username}</strong> to confirm.</p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={user.username}
            />
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <button className="btn danger" onClick={deleteAccount} disabled={deleteConfirm !== user.username}>
                Delete permanently
              </button>
              <button className="btn secondary" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
