"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { PinGate, usePinManager } from "@/components/PinGate";

const CROWD_LABELS  = ["Off",   "Quiet",    "Moderate", "Busy",    "Packed",  "Full"];
const CROWD_COLORS  = ["#555",  "#22c55e",  "#a3e635",  "#f59e0b", "#f97316", "#ef4444"];
const CROWD_EMOJIS  = ["—",     "🟢",       "🟡",       "🟠",      "🔴",      "🔴"];

export default function VenueAccount() {
  const [user, setUser]   = useState<any>(null);
  const [venue, setVenue] = useState<any>(null);

  // Photo state
  const [avatarUrl, setAvatarUrl]         = useState("");
  const [venueImageUrl, setVenueImageUrl] = useState("");
  const avatarRef    = useRef<HTMLInputElement>(null);
  const venueImgRef  = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");

  // Crowd meter state
  const [crowdLevel, setCrowdLevel]   = useState(0);
  const [crowdSaving, setCrowdSaving] = useState(false);
  const [crowdMsg, setCrowdMsg]       = useState("");

  // PIN management
  const { currentPin, savePin, removePin } = usePinManager();
  const [pinStep, setPinStep]     = useState<"idle"|"set"|"change-enter"|"change-new"|"remove">("idle");
  const [pinInput1, setPinInput1] = useState("");
  const [pinInput2, setPinInput2] = useState("");
  const [pinErr, setPinErr]       = useState("");

  // UI state
  const [msg, setMsg]       = useState({ text: "", ok: true });
  const [saving, setSaving] = useState(false);

  // Modals
  const [showPauseModal, setShowPauseModal]     = useState(false);
  const [showDelete, setShowDelete]             = useState(false);
  const [deleteConfirm, setDeleteConfirm]       = useState("");
  const [showBoostConfirm, setShowBoostConfirm] = useState(false);
  const [showWelcome, setShowWelcome]           = useState(false);
  const [showPreview, setShowPreview]           = useState(false);

  async function load() {
    const r = await fetch("/api/v/account");
    const j = await r.json();
    if (j.user)  { setUser(j.user);  setAvatarUrl(j.user.avatarUrl ?? ""); }
    if (j.venue) {
      setVenue(j.venue);
      setVenueImageUrl(j.venue.venueImageUrl ?? "");
      setCrowdLevel(j.venue.crowdLevel ?? 0);
    }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1" && !sessionStorage.getItem("welcome_dismissed")) {
      setShowWelcome(true);
    }
  }, []);

  function dismissWelcome() {
    sessionStorage.setItem("welcome_dismissed", "1");
    setShowWelcome(false);
    window.history.replaceState({}, "", "/v/account");
  }

  function setMsg2(text: string, ok = true) { setMsg({ text, ok }); }

  function pickImage(file: File, size: { w: number; h: number }, onDone: (d: string) => void) {
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const { w, h } = size;
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        const srcR = img.width / img.height, tgtR = w / h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (srcR > tgtR) { sw = sh * tgtR; sx = (img.width  - sw) / 2; }
        else             { sh = sw / tgtR; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        onDone(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    pickImage(f, { w: 200, h: 200 }, setAvatarUrl); e.target.value = "";
  }
  function handleVenueImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    pickImage(f, { w: 600, h: 400 }, setVenueImageUrl); e.target.value = "";
  }

  async function saveAvatar() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ avatarUrl: avatarUrl || null }) });
    const j = await r.json(); setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    setMsg2("Profile photo saved."); load();
  }

  async function saveVenueImage() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ venueImageUrl: venueImageUrl || null }) });
    const j = await r.json(); setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    setMsg2("Venue photo saved."); load();
  }

  async function saveCrowdLevel(level: number) {
    setCrowdLevel(level); setCrowdSaving(true); setCrowdMsg("");
    const r = await fetch("/api/v/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ crowdLevel: level }) });
    setCrowdSaving(false);
    if (!r.ok) { setCrowdMsg("Save failed"); } else { setCrowdMsg("Saved!"); setTimeout(() => setCrowdMsg(""), 1500); }
  }

  async function changePassword() {
    if (newPw !== confirmPw) { setMsg2("New passwords don't match.", false); return; }
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) });
    const j = await r.json(); setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    setMsg2("Password changed."); setCurrentPw(""); setNewPw(""); setConfirmPw("");
  }

  async function togglePause() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/account/pause", { method: "POST" });
    const j = await r.json(); setSaving(false); setShowPauseModal(false);
    if (!r.ok) { setMsg2(j.error || "Failed", false); return; }
    if (j.paused) setMsg2(`Venue paused. ${j.cancelledOrders} active order(s) cancelled with full refunds.`);
    else          setMsg2("Venue resumed. You're open for orders.");
    load();
  }

  async function deleteAccount() {
    if (deleteConfirm !== user?.username) { setMsg2("Type your username exactly to confirm.", false); return; }
    const r = await fetch("/api/v/account", { method: "DELETE" });
    if (r.ok) window.location.href = "/auth/login";
    else { const j = await r.json(); setMsg2(j.error || "Failed", false); }
  }

  async function handleUpgrade() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkout" }) });
    const j = await r.json(); setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Checkout failed.", false); return; }
    if (j.simulated) window.location.href = j.redirectUrl ?? "/v/account?upgraded=1";
    else if (j.checkoutUrl) window.location.href = j.checkoutUrl;
  }

  async function handlePortal() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "portal" }) });
    const j = await r.json(); setSaving(false);
    if (!r.ok) { setMsg2(j.error || "Failed to open billing portal.", false); return; }
    if (j.portalUrl) window.location.href = j.portalUrl;
  }

  async function activateBoost() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/boost", { method: "POST" });
    const j = await r.json(); setSaving(false); setShowBoostConfirm(false);
    if (!r.ok) { setMsg2(j.error || "Failed to activate Boost Hour.", false); return; }
    setMsg2("Boost Hour activated. Your venue will receive increased visibility for the next 60 minutes.");
    load();
  }

  // ── PIN helpers ───────────────────────────────────────────
  function startSetPin()    { setPinInput1(""); setPinInput2(""); setPinErr(""); setPinStep("set"); }
  function startChangePin() { setPinInput1(""); setPinInput2(""); setPinErr(""); setPinStep("change-enter"); }
  function startRemovePin() { setPinInput1(""); setPinErr(""); setPinStep("remove"); }
  function cancelPin()      { setPinStep("idle"); setPinInput1(""); setPinInput2(""); setPinErr(""); }

  function confirmSetPin() {
    if (pinInput1.length !== 4) { setPinErr("PIN must be 4 digits"); return; }
    if (pinInput1 !== pinInput2) { setPinErr("PINs don't match"); return; }
    savePin(pinInput1); setPinStep("idle"); setPinInput1(""); setPinInput2(""); setPinErr("");
  }
  function confirmChangePin() {
    if (pinStep === "change-enter") {
      if (pinInput1 !== currentPin) { setPinErr("Wrong current PIN"); return; }
      setPinInput1(""); setPinInput2(""); setPinErr(""); setPinStep("change-new"); return;
    }
    if (pinInput1.length !== 4) { setPinErr("PIN must be 4 digits"); return; }
    if (pinInput1 !== pinInput2) { setPinErr("PINs don't match"); return; }
    savePin(pinInput1); setPinStep("idle"); setPinInput1(""); setPinInput2(""); setPinErr("");
  }
  function confirmRemovePin() {
    if (pinInput1 !== currentPin) { setPinErr("Wrong current PIN"); return; }
    removePin(); setPinStep("idle"); setPinInput1(""); setPinErr("");
  }

  function PinInput({ value, onChange, placeholder = "••••" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        type="password" inputMode="numeric" maxLength={4} placeholder={placeholder}
        style={{ width: 80, letterSpacing: 8, fontSize: 22, fontWeight: 700, textAlign: "center", padding: "6px 10px" }}
      />
    );
  }

  if (!user) return <div className="container"><Nav role="v" /><p className="muted">Loading…</p></div>;

  const paused = venue && !venue.isEnabled;

  const AvatarEl = ({ size = 48 }: { size?: number }) => (
    user.avatarUrl
      ? <img src={user.avatarUrl} alt="avatar" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
      : <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent,#9b5de5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, color: "#fff" }}>
          {user.username[0].toUpperCase()}
        </div>
  );

  return (
    <PinGate>
    <div className="container">
      <div className="header">
        <h2 style={{ color: "var(--venue-brand)", fontSize: "1.7rem" }}>Account — {venue?.name ?? user.username}</h2>
      </div>
      <Nav role="v" />

      {msg.text && (
        <p className="muted" style={{ color: msg.ok ? "var(--green,#0f0)" : "var(--error,#f66)", marginBottom: 12 }}>
          {msg.text}
        </p>
      )}

      {/* ── Manager PIN ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20, border: "1.5px solid var(--venue-brand)" }}>
        <div className="header" style={{ marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--venue-brand)" }}>🔒 Manager PIN</h3>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Protect Menu, Promotions, and Account from employee access.
            </p>
          </div>
          {currentPin && pinStep === "idle" && (
            <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, border: "1px solid #22c55e" }}>
              PIN Active
            </span>
          )}
        </div>

        {pinStep === "idle" && !currentPin && (
          <button className="btn sm" style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 700 }} onClick={startSetPin}>
            Set PIN
          </button>
        )}
        {pinStep === "idle" && currentPin && (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn sm secondary" onClick={startChangePin}>Change PIN</button>
            <button className="btn sm danger"    onClick={startRemovePin}>Remove PIN</button>
          </div>
        )}
        {pinStep === "set" && (
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>New PIN (4 digits)</label>
            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <PinInput value={pinInput1} onChange={setPinInput1} placeholder="1234" />
              <PinInput value={pinInput2} onChange={setPinInput2} placeholder="1234" />
              <button className="btn sm" style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 700 }} onClick={confirmSetPin} disabled={pinInput1.length !== 4 || pinInput2.length !== 4}>Save</button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>Enter PIN twice to confirm.</p>
            {pinErr && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--error,#f66)", fontWeight: 600 }}>{pinErr}</p>}
          </div>
        )}
        {pinStep === "change-enter" && (
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Enter current PIN</label>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <PinInput value={pinInput1} onChange={setPinInput1} />
              <button className="btn sm" onClick={confirmChangePin} disabled={pinInput1.length !== 4}>Next</button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
            {pinErr && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--error,#f66)", fontWeight: 600 }}>{pinErr}</p>}
          </div>
        )}
        {pinStep === "change-new" && (
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>New PIN (enter twice)</label>
            <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <PinInput value={pinInput1} onChange={setPinInput1} placeholder="New" />
              <PinInput value={pinInput2} onChange={setPinInput2} placeholder="Confirm" />
              <button className="btn sm" style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 700 }} onClick={confirmChangePin} disabled={pinInput1.length !== 4 || pinInput2.length !== 4}>Save</button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
            {pinErr && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--error,#f66)", fontWeight: 600 }}>{pinErr}</p>}
          </div>
        )}
        {pinStep === "remove" && (
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Enter current PIN to remove</label>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <PinInput value={pinInput1} onChange={setPinInput1} />
              <button className="btn sm danger" onClick={confirmRemovePin} disabled={pinInput1.length !== 4}>Remove</button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
            {pinErr && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--error,#f66)", fontWeight: 600 }}>{pinErr}</p>}
          </div>
        )}
      </div>

      {/* ── Your photo ──────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 12px" }}>Your photo</h3>
        <div className="row" style={{ alignItems: "center", gap: 16, marginBottom: 14 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <AvatarEl size={72} />
            <button onClick={() => avatarRef.current?.click()} title="Change photo"
              style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, padding: 0 }}>
              📷
            </button>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>
          <div>
            <strong>@{user.username}</strong>
            <div className="muted" style={{ fontSize: 13 }}>{user.firstName} {user.lastName}</div>
            <button className="btn sm secondary" style={{ marginTop: 6, fontSize: 12 }} onClick={() => avatarRef.current?.click()}>Change photo</button>
          </div>
        </div>
        {avatarUrl !== (user.avatarUrl ?? "") && <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>New photo selected — save to apply.</p>}
        <button className="btn" onClick={saveAvatar} disabled={saving}>Save photo</button>
      </div>

      {/* ── Venue photo + Preview ────────────────────────────── */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="header" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0 }}>Venue photo</h3>
              <p className="muted" style={{ fontSize: 12, margin: "3px 0 0" }}>Shown to customers. Recommended: 600×400.</p>
            </div>
            <button className="btn sm secondary" style={{ fontSize: 11 }} onClick={() => setShowPreview(p => !p)}>
              {showPreview ? "Hide Preview" : "👁 Preview"}
            </button>
          </div>

          {showPreview && (
            <div style={{ marginBottom: 14, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="muted" style={{ fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Customer view</p>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, overflow: "hidden", maxWidth: 340, border: "1px solid rgba(255,255,255,0.1)" }}>
                {venueImageUrl
                  ? <img src={venueImageUrl} alt="Venue" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                  : <div style={{ width: "100%", height: 140, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 28 }}>🏠</span>
                    </div>
                }
                <div style={{ padding: "10px 14px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{venue.name}</div>
                  {venue.type    && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{venue.type}</div>}
                  {venue.address && <div className="muted" style={{ fontSize: 12 }}>{venue.address}</div>}
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, background: "rgba(255,255,255,0.07)", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)" }}>
                      {CROWD_EMOJIS[crowdLevel]} {CROWD_LABELS[crowdLevel]}
                    </span>
                    {paused && <span style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(245,158,11,0.3)" }}>Paused</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {venueImageUrl
            ? <img src={venueImageUrl} alt="Venue" style={{ width: "100%", maxWidth: 360, height: 200, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />
            : <div style={{ width: "100%", maxWidth: 360, height: 120, background: "rgba(255,255,255,0.04)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, border: "2px dashed rgba(255,255,255,0.12)" }}>
                <span className="muted" style={{ fontSize: 13 }}>No photo yet</span>
              </div>
          }
          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
            <button className="btn sm secondary" onClick={() => venueImgRef.current?.click()}>
              📷 {venueImageUrl ? "Change" : "Upload"}
            </button>
            {venueImageUrl && <button className="btn sm secondary" onClick={() => setVenueImageUrl("")}>Remove</button>}
          </div>
          <input ref={venueImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleVenueImgChange} />
          {venueImageUrl !== (venue.venueImageUrl ?? "") && <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>New photo selected — save to apply.</p>}
          <button className="btn" onClick={saveVenueImage} disabled={saving}>Save venue photo</button>
        </div>
      )}

      {/* ── Crowd Meter ──────────────────────────────────────── */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 4px" }}>Crowd Meter 🫶</h3>
          <p className="muted" style={{ fontSize: 12, margin: "0 0 14px" }}>
            Let customers know how busy you are. Updates live on your venue card.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CROWD_LABELS.map((label, i) => {
              const active = crowdLevel === i;
              return (
                <button key={i} onClick={() => saveCrowdLevel(i)} disabled={crowdSaving}
                  style={{
                    padding: "8px 16px", borderRadius: 24,
                    border: active ? `2px solid ${CROWD_COLORS[i]}` : "2px solid rgba(255,255,255,0.1)",
                    background: active ? `${CROWD_COLORS[i]}22` : "rgba(255,255,255,0.04)",
                    color: active ? CROWD_COLORS[i] : "var(--muted-text)",
                    fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
                    transition: "all 0.15s", transform: active ? "scale(1.05)" : "scale(1)",
                  }}>
                  {i === 0 ? "—" : CROWD_EMOJIS[i]} {label}
                </button>
              );
            })}
          </div>
          {crowdSaving && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Saving…</p>}
          {crowdMsg    && <p style={{ fontSize: 12, marginTop: 8, color: crowdMsg === "Saved!" ? "#22c55e" : "var(--error,#f66)", fontWeight: 600 }}>{crowdMsg}</p>}
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

      {/* ── Venue status ─────────────────────────────────────── */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 8px" }}>Venue status</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            {paused ? "Your venue is currently paused. Customers cannot place new orders." : "Your venue is open and accepting orders."}
          </p>
          {paused
            ? <button className="btn" onClick={togglePause} disabled={saving}>Resume venue</button>
            : <button className="btn secondary" onClick={() => setShowPauseModal(true)} disabled={saving}>Pause venue</button>
          }
        </div>
      )}

      {/* ── Danger zone ──────────────────────────────────────── */}
      <div className="card" style={{ border: "1px solid var(--error,#f66)", marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 8px", color: "var(--error,#f66)" }}>Danger zone</h3>
        {!showDelete ? (
          <button className="btn danger" onClick={() => setShowDelete(true)}>Delete account</button>
        ) : (
          <>
            <p className="muted">
              Your account will be permanently deleted. Type your username <strong>@{user.username}</strong> to confirm.
            </p>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={user.username} />
            <div className="row" style={{ marginTop: 10, gap: 8 }}>
              <button className="btn danger" onClick={deleteAccount} disabled={deleteConfirm !== user.username}>Delete permanently</button>
              <button className="btn secondary" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}>Cancel</button>
            </div>
          </>
        )}
      </div>

      {/* ── Log out ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ margin: "0 0 8px" }}>Log out</h3>
        <p className="muted">You'll be returned to the login screen.</p>
        <a className="btn secondary" href="/api/auth/logout">Log out</a>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showPauseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "var(--surface,#1a1a2e)", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%" }}>
            <h3 style={{ margin: "0 0 10px" }}>Pause your venue?</h3>
            <p className="muted" style={{ marginBottom: 20 }}>All active orders will be <strong>cancelled with full wallet refunds</strong> to your customers.</p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" style={{ background: "#c0392b" }} onClick={togglePause} disabled={saving}>Pause & cancel orders</button>
              <button className="btn secondary" onClick={() => setShowPauseModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showBoostConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1002, padding: 16 }}>
          <div style={{ background: "var(--surface,#1a1a2e)", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%" }}>
            <h3 style={{ margin: "0 0 12px" }}>Activate Boost Hour?</h3>
            <p className="muted" style={{ marginBottom: 20, lineHeight: 1.6 }}>Your venue receives higher visibility for <strong>60 minutes</strong>.</p>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" onClick={activateBoost} disabled={saving}>Activate</button>
              <button className="btn secondary" onClick={() => setShowBoostConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showWelcome && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, padding: 16 }}>
          <div style={{ background: "var(--surface,#1a1a2e)", borderRadius: 14, padding: 32, maxWidth: 400, width: "100%", textAlign: "center" }}>
            <h2 style={{ margin: "0 0 12px" }}>Welcome to PRO</h2>
            <p style={{ lineHeight: 1.7, marginBottom: 24 }}>You can now create promotions, activate Boost Hour, and access all PRO features.</p>
            <button className="btn" onClick={dismissWelcome}>Get started</button>
          </div>
        </div>
      )}
    </div>
    </PinGate>
  );
}
