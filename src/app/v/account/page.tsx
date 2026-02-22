"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";

export default function VenueAccount() {
  const [user, setUser]       = useState<any>(null);
  const [venue, setVenue]     = useState<any>(null);

  // Photo state
  const [avatarUrl, setAvatarUrl]         = useState("");
  const [venueImageUrl, setVenueImageUrl] = useState("");
  const avatarRef     = useRef<HTMLInputElement>(null);
  const venueImgRef   = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");

  // UI state
  const [msg, setMsg]         = useState({ text: "", ok: true });
  const [saving, setSaving]   = useState(false);

  // Pause modal
  const [showPauseModal, setShowPauseModal] = useState(false);

  // Delete modal
  const [showDelete, setShowDelete]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function load() {
    const r = await fetch("/api/v/account");
    const j = await r.json();
    if (j.user) {
      setUser(j.user);
      setAvatarUrl(j.user.avatarUrl ?? "");
    }
    if (j.venue) {
      setVenue(j.venue);
      setVenueImageUrl(j.venue.venueImageUrl ?? "");
    }
  }
  useEffect(() => { load(); }, []);

  function setMsg2(text: string, ok = true) { setMsg({ text, ok }); }

  // ── Image file picker + canvas resize ─────────────────────
  function pickImage(
    file: File,
    size: { w: number; h: number },
    onDone: (dataUrl: string) => void
  ) {
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const { w, h } = size;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        // crop to target aspect ratio from center
        const srcRatio = img.width / img.height;
        const tgtRatio = w / h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (srcRatio > tgtRatio) { sw = sh * tgtRatio; sx = (img.width - sw) / 2; }
        else                     { sh = sw / tgtRatio; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        onDone(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    pickImage(file, { w: 200, h: 200 }, setAvatarUrl);
    e.target.value = "";
  }

  function handleVenueImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    pickImage(file, { w: 600, h: 400 }, setVenueImageUrl);
    e.target.value = "";
  }

  // ── Save profile pic ───────────────────────────────────────
  async function saveAvatar() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ avatarUrl: avatarUrl || null }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    setMsg2("Profile photo saved."); load();
  }

  // ── Save venue photo ───────────────────────────────────────
  async function saveVenueImage() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueImageUrl: venueImageUrl || null }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    setMsg2("Venue photo saved."); load();
  }

  // ── Change password ────────────────────────────────────────
  async function changePassword() {
    if (newPw !== confirmPw) { setMsg2("New passwords don't match.", false); return; }
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account", {
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

  // ── Pause / Resume venue ───────────────────────────────────
  async function togglePause() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account/pause", { method: "POST" });
    const j = await r.json();
    setSaving(false);
    setShowPauseModal(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    if (j.paused) {
      setMsg2(`Venue paused. ${j.cancelledOrders} active order(s) cancelled with full refunds.`);
    } else {
      setMsg2("Venue resumed. You're open for orders.");
    }
    load();
  }

  // ── Delete account ─────────────────────────────────────────
  async function deleteAccount() {
    if (deleteConfirm !== user?.username) {
      setMsg2("Type your username exactly to confirm.", false); return;
    }
    const r = await fetch("/api/v/account", { method: "DELETE" });
    if (r.ok) window.location.href = "/auth/login";
    else { const j = await r.json(); setMsg2(j.error || "Failed", false); }
  }

  if (!user) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const paused = venue && !venue.isEnabled;

  const AvatarEl = ({ size = 48 }: { size?: number }) => (
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
      <h2>Account</h2>
      <Nav role="v" />

      {msg.text && (
        <p className="muted" style={{ color: msg.ok ? "var(--green, #0f0)" : "var(--error, #f66)", marginBottom: 12 }}>
          {msg.text}
        </p>
      )}

      {/* ── Profile photo ────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Your photo</h3>
        <div className="row" style={{ alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <AvatarEl size={72} />
            <button
              onClick={() => avatarRef.current?.click()}
              title="Change photo"
              style={{
                position: "absolute", bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: "50%",
                background: "rgba(0,0,0,0.7)", border: "2px solid rgba(255,255,255,0.3)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, padding: 0,
              }}
            >📷</button>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>
          <div>
            <div><strong>@{user.username}</strong></div>
            <div className="muted">{user.firstName} {user.lastName}</div>
            <button className="btn sm secondary" style={{ marginTop: 6, fontSize: 12 }} onClick={() => avatarRef.current?.click()}>
              Change photo
            </button>
          </div>
        </div>
        {avatarUrl !== (user.avatarUrl ?? "") && (
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>New photo selected — save to apply.</p>
        )}
        <button className="btn" onClick={saveAvatar} disabled={saving}>Save photo</button>
      </div>

      {/* ── Venue photo ──────────────────────────────────────── */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 4px" }}>Venue photo</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            This photo is shown to customers browsing your venue. Recommended: 600×400.
          </p>
          {venueImageUrl ? (
            <img
              src={venueImageUrl}
              alt="Venue"
              style={{ width: "100%", maxWidth: 360, height: 200, objectFit: "cover", borderRadius: 10, marginBottom: 12 }}
            />
          ) : (
            <div style={{
              width: "100%", maxWidth: 360, height: 160,
              background: "rgba(255,255,255,0.05)", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12, border: "2px dashed rgba(255,255,255,0.15)",
            }}>
              <span className="muted" style={{ fontSize: 13 }}>No photo yet</span>
            </div>
          )}
          <div className="row" style={{ gap: 10 }}>
            <button className="btn sm secondary" onClick={() => venueImgRef.current?.click()}>
              📷 {venueImageUrl ? "Change photo" : "Upload photo"}
            </button>
            {venueImageUrl && (
              <button className="btn sm secondary" onClick={() => setVenueImageUrl("")}>Remove</button>
            )}
          </div>
          <input ref={venueImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleVenueImgChange} />
          {venueImageUrl !== (venue.venueImageUrl ?? "") && (
            <p className="muted" style={{ fontSize: 12, margin: "8px 0" }}>New photo selected — save to apply.</p>
          )}
          <button className="btn" style={{ marginTop: 10 }} onClick={saveVenueImage} disabled={saving}>Save venue photo</button>
        </div>
      )}

      {/* ── Change password ───────────────────────────────────── */}
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

      {/* ── Pause / Resume venue ─────────────────────────────── */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 8px" }}>Venue status</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            {paused
              ? "Your venue is currently paused. Customers cannot place new orders."
              : "Your venue is open and accepting orders."}
          </p>
          {paused ? (
            <button className="btn" onClick={togglePause} disabled={saving}>Resume venue</button>
          ) : (
            <button className="btn secondary" onClick={() => setShowPauseModal(true)} disabled={saving}>
              Pause venue
            </button>
          )}
        </div>
      )}

      {/* ── Danger zone ──────────────────────────────────────── */}
      <div className="card" style={{ border: "1px solid var(--error, #f66)", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px", color: "var(--error, #f66)" }}>Danger zone</h3>
        {!showDelete ? (
          <button className="btn danger" onClick={() => setShowDelete(true)}>Delete account</button>
        ) : (
          <>
            <p className="muted">
              Your account will be permanently deleted. Any active orders will be cancelled with full refunds.
              Your venue listing will remain but without a manager.
              Type your username <strong>@{user.username}</strong> to confirm.
            </p>
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

      {/* ── Log out ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px" }}>Log out</h3>
        <p className="muted">You'll be returned to the login screen.</p>
        <a className="btn secondary" href="/api/auth/logout">Log out</a>
      </div>

      {/* ── Pause confirm modal ──────────────────────────────── */}
      {showPauseModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
        }}>
          <div style={{ background: "var(--surface,#1a1a2e)", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%" }}>
            <h3 style={{ margin: "0 0 10px" }}>Pause your venue?</h3>
            <p className="muted" style={{ marginBottom: 20 }}>
              Your venue will be temporarily disabled — no new orders can be placed.
              All active orders will be <strong>cancelled with full wallet refunds</strong>
              {" "}to your customers.
            </p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" style={{ background: "#c0392b" }} onClick={togglePause} disabled={saving}>
                Pause & cancel orders
              </button>
              <button className="btn secondary" onClick={() => setShowPauseModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
