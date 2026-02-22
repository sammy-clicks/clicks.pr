"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { GuestPageBlock } from "@/components/GuestModeProvider";

export default function AccountPage() {
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
  const [ghost, setGhost] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [meR, ghostR] = await Promise.all([
      fetch("/api/me").then(r => r.json()),
      fetch("/api/me/ghost").then(r => r.json()),
    ]);
    if (meR.user) {
      setUser(meR.user);
      setAvatarUrl(meR.user.avatarUrl ?? "");
      setPaused(!!meR.user.pausedAt);
    }
    setGhost(ghostR.ghostMode ?? false);
  }
  useEffect(() => { load(); }, []);

  async function toggleGhost() {
    const r = await fetch("/api/me/ghost", { method: "POST" });
    const j = await r.json();
    if (r.ok) setGhost(j.ghostMode);
  }

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const cx = (img.width - min) / 2;
        const cy = (img.height - min) / 2;
        ctx.drawImage(img, cx, cy, min, min, 0, 0, SIZE, SIZE);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
          background: "var(--brand)", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: size * 0.4, fontWeight: 700, color: "var(--ink)",
        }}>
          {user.username[0].toUpperCase()}
        </div>
  );

  return (
    <div className="container">
      <h2>Account</h2>
      <Nav role="u" />
      <GuestPageBlock />

      {msg.text && (
        <p className="muted" style={{ color: msg.ok ? "var(--success, #059669)" : "var(--danger, #dc2626)", marginBottom: 12 }}>
          {msg.text}
        </p>
      )}

      {/* ── Profile ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Profile</h3>
        <div className="row" style={{ alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar size={72} />
            <button
              onClick={() => fileRef.current?.click()}
              title="Change photo"
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(0,0,0,0.7)", border: "2px solid rgba(255,255,255,0.3)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, padding: 0,
              }}
            >📷</button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div><strong>@{user.username}</strong></div>
            <div className="muted">{user.firstName} {user.lastName}</div>
            <div className="muted" style={{ fontSize: 11 }}>Member since {new Date(user.createdAt).toLocaleDateString()}</div>
            <button
              className="btn sm secondary"
              style={{ marginTop: 6, fontSize: 12 }}
              onClick={() => fileRef.current?.click()}
            >Change photo</button>
          </div>
          {/* Ghost mode toggle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, paddingTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Ghost mode</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label className="toggle-switch" title={ghost ? "Ghost ON — you are hidden" : "Ghost OFF — you are visible"}>
                <input type="checkbox" checked={!!ghost} onChange={toggleGhost} disabled={ghost === null} />
                <span className="toggle-track" />
              </label>
              <span className="muted" style={{ fontSize: 12 }}>{ghost ? "ON" : "OFF"}</span>
            </div>
            <span className="muted" style={{ fontSize: 11, maxWidth: 160 }}>Hides you from leaderboard & buddy radar.</span>
          </div>
        </div>
        </div>
        {avatarUrl && avatarUrl !== (user.avatarUrl ?? "") && (
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>New photo selected — save to apply.</p>
        )}
        <button className="btn" onClick={saveProfile} disabled={saving}>
          Save profile
        </button>
      </div>

      {/* ── Password ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Change password</h3>
        <label>Current password</label>
        <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
        <label>New password (min 8 chars)</label>
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
        <label>Confirm new password</label>
        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
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
      <div className="card" style={{ border: "1px solid var(--danger, #dc2626)", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px", color: "var(--danger, #dc2626)" }}>Danger zone</h3>
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

      {/* ── Log out ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px" }}>Log out</h3>
        <p className="muted">You'll be returned to the login screen.</p>
        <a className="btn secondary" href="/api/auth/logout">Log out</a>
      </div>
    </div>
  );
}
