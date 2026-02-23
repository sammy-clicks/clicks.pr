"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { PinGate, usePinManager } from "@/components/PinGate";

const pinBoxStyle: React.CSSProperties = {
  width: 48, height: 56, borderRadius: 10, fontSize: 28, fontWeight: 700,
  textAlign: "center", border: "1.5px solid rgba(255,255,255,0.2)",
  background: "var(--bg, #0d0d1a)", color: "var(--ink, #fff)",
  outline: "none", caretColor: "transparent",
};
const pinBoxActiveStyle: React.CSSProperties = {
  ...pinBoxStyle,
  border: "1.5px solid var(--venue-brand)",
  boxShadow: "0 0 0 3px rgba(231,168,255,0.15)",
};

export default function VenueAccount() {
  const [user, setUser]   = useState<any>(null);
  const [venue, setVenue] = useState<any>(null);

  const [avatarUrl, setAvatarUrl]         = useState("");
  const [venueImageUrl, setVenueImageUrl] = useState("");
  const avatarRef   = useRef<HTMLInputElement>(null);
  const venueImgRef = useRef<HTMLInputElement>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [liveCrowd, setLiveCrowd]           = useState(0);
  const [activeCheckins, setActiveCheckins] = useState(0);

  const { currentPin, savePin, removePin } = usePinManager();
  const [pinStep, setPinStep] = useState<"idle"|"set"|"change-enter"|"change-new"|"remove">("idle");
  const [pin1, setPin1] = useState(["","","",""]);
  const [pin2, setPin2] = useState(["","","",""]);
  const [pinErr, setPinErr] = useState("");
  const p1r = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const p2r = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [msg, setMsg]       = useState({ text: "", ok: true });
  const [saving, setSaving] = useState(false);

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
    if (j.venue) { setVenue(j.venue); setVenueImageUrl(j.venue.venueImageUrl ?? ""); }
    if (typeof j.liveCrowd    === "number") setLiveCrowd(j.liveCrowd);
    if (typeof j.activeCheckins === "number") setActiveCheckins(j.activeCheckins);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "1" && !sessionStorage.getItem("welcome_dismissed")) setShowWelcome(true);
  }, []);

  function dismissWelcome() {
    sessionStorage.setItem("welcome_dismissed", "1"); setShowWelcome(false);
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
        const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        const srcR = img.width / img.height, tgtR = w / h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (srcR > tgtR) { sw = sh * tgtR; sx = (img.width - sw) / 2; }
        else             { sh = sw / tgtR; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        onDone(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; pickImage(f, { w: 200, h: 200 }, setAvatarUrl); e.target.value = "";
  }
  function handleVenueImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; pickImage(f, { w: 600, h: 400 }, setVenueImageUrl); e.target.value = "";
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
  async function activateBoost() {
    setSaving(true); setMsg2("");
    const r = await fetch("/api/v/boost", { method: "POST" });
    const j = await r.json(); setSaving(false); setShowBoostConfirm(false);
    if (!r.ok) { setMsg2(j.error || "Failed to activate Boost Hour.", false); return; }
    setMsg2("Boost Hour activated! Increased visibility for the next 60 minutes."); load();
  }

  // PIN helpers
  const joinPin = (b: string[]) => b.join("");
  function resetPin() { setPin1(["","","",""]); setPin2(["","","",""]); setPinErr(""); }

  function startPin(step: typeof pinStep, refs: typeof p1r) {
    resetPin(); setPinStep(step); setTimeout(() => refs[0].current?.focus(), 50);
  }
  function cancelPin() { resetPin(); setPinStep("idle"); }

  function onPinDigit(
    boxes: string[], set: (v: string[]) => void,
    refs: typeof p1r, idx: number, val: string
  ) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...boxes]; next[idx] = d; set(next);
    if (d && idx < 3) refs[idx + 1].current?.focus();
  }
  function onPinBack(
    boxes: string[], set: (v: string[]) => void,
    refs: typeof p1r, idx: number, e: React.KeyboardEvent
  ) {
    if (e.key === "Backspace" && !boxes[idx] && idx > 0) {
      const next = [...boxes]; next[idx - 1] = ""; set(next); refs[idx - 1].current?.focus();
    }
  }

  function confirmSetPin() {
    const p = joinPin(pin1), q = joinPin(pin2);
    if (p.length !== 4) { setPinErr("Fill all 4 boxes in both rows"); return; }
    if (p !== q) { setPinErr("PINs don't match  try again"); resetPin(); setTimeout(() => p1r[0].current?.focus(), 50); return; }
    savePin(p); cancelPin();
  }
  function confirmChangePin() {
    if (pinStep === "change-enter") {
      if (joinPin(pin1) !== currentPin) { setPinErr("Wrong PIN"); setPin1(["","","",""]); setTimeout(() => p1r[0].current?.focus(), 50); return; }
      setPin1(["","","",""]); setPin2(["","","",""]); setPinErr(""); setPinStep("change-new");
      setTimeout(() => p1r[0].current?.focus(), 50); return;
    }
    const p = joinPin(pin1), q = joinPin(pin2);
    if (p.length !== 4) { setPinErr("Fill all 4 boxes"); return; }
    if (p !== q) { setPinErr("PINs don't match  try again"); resetPin(); setTimeout(() => p1r[0].current?.focus(), 50); return; }
    savePin(p); cancelPin();
  }
  function confirmRemovePin() {
    if (joinPin(pin1) !== currentPin) { setPinErr("Wrong PIN"); setPin1(["","","",""]); setTimeout(() => p1r[0].current?.focus(), 50); return; }
    removePin(); cancelPin();
  }

  if (!user) return <div className="container"><Nav role="v" /><p className="muted">Loading</p></div>;

  const paused = venue && !venue.isEnabled;

  const crowdLabel = liveCrowd === 0 ? "No activity" : liveCrowd <= 2 ? "Quiet" : liveCrowd <= 4 ? "Moderate" : liveCrowd <= 6 ? "Busy" : liveCrowd <= 8 ? "Packed" : "Full";
  const crowdColor = liveCrowd === 0 ? "var(--muted-text)" : liveCrowd <= 3 ? "#22c55e" : liveCrowd <= 6 ? "#f59e0b" : "#ef4444";

  const AvatarEl = ({ size = 48 }: { size?: number }) => (
    user.avatarUrl
      ? <img src={user.avatarUrl} alt="avatar" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
      : <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent,#9b5de5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, color: "#fff" }}>
          {user.username[0].toUpperCase()}
        </div>
  );

  // stable PIN box row  NOT a component (just a helper that returns JSX)
  const pinBoxRow = (
    label: string,
    boxes: string[],
    setBoxes: (v: string[]) => void,
    refs: typeof p1r
  ) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--muted-text)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[0,1,2,3].map(i => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={boxes[i]}
            style={boxes[i] ? pinBoxActiveStyle : pinBoxStyle}
            onChange={e => onPinDigit(boxes, setBoxes, refs, i, e.target.value)}
            onKeyDown={e => onPinBack(boxes, setBoxes, refs, i, e)}
            onFocus={e => (e.target as HTMLInputElement).select()}
          />
        ))}
      </div>
    </div>
  );

  return (
    <PinGate>
    <div className="container">
      <div className="header">
        <h2 style={{ color: "var(--venue-brand)", fontSize: "1.6rem" }}>Account</h2>
        <span className="muted" style={{ fontSize: 13 }}>{venue?.name ?? user.username}</span>
      </div>
      <Nav role="v" />

      {msg.text && (
        <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 16, background: msg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${msg.ok ? "#22c55e" : "#ef4444"}`, color: msg.ok ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* 1  Manager PIN */}
      <div className="card" style={{ marginBottom: 20, border: "1.5px solid var(--venue-brand)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: "var(--venue-brand)", marginBottom: 3 }}> Manager PIN</div>
            <div className="muted" style={{ fontSize: 12 }}>Locks Menu, Promotions &amp; Account from employees. Dashboard and Orders always accessible.</div>
          </div>
          {currentPin && pinStep === "idle" && (
            <span style={{ flexShrink: 0, marginLeft: 12, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.35)" }}>
              Active
            </span>
          )}
        </div>

        {pinStep === "idle" && !currentPin && (
          <button className="btn sm" style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 700 }} onClick={() => startPin("set", p1r)}>Set PIN</button>
        )}
        {pinStep === "idle" && currentPin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm secondary" onClick={() => startPin("change-enter", p1r)}>Change PIN</button>
            <button className="btn sm danger"    onClick={() => startPin("remove", p1r)}>Remove PIN</button>
          </div>
        )}

        {pinStep === "set" && (
          <div>
            {pinBoxRow("New PIN", pin1, setPin1, p1r)}
            {pinBoxRow("Confirm PIN", pin2, setPin2, p2r)}
            {pinErr && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{pinErr}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm" style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 700 }} onClick={confirmSetPin} disabled={joinPin(pin1).length < 4 || joinPin(pin2).length < 4}>Save PIN</button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
          </div>
        )}
        {pinStep === "change-enter" && (
          <div>
            {pinBoxRow("Current PIN", pin1, setPin1, p1r)}
            {pinErr && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{pinErr}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm" onClick={confirmChangePin} disabled={joinPin(pin1).length < 4}>Next </button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
          </div>
        )}
        {pinStep === "change-new" && (
          <div>
            {pinBoxRow("New PIN", pin1, setPin1, p1r)}
            {pinBoxRow("Confirm New PIN", pin2, setPin2, p2r)}
            {pinErr && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{pinErr}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm" style={{ background: "var(--venue-brand)", color: "#080c12", fontWeight: 700 }} onClick={confirmChangePin} disabled={joinPin(pin1).length < 4 || joinPin(pin2).length < 4}>Save PIN</button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
          </div>
        )}
        {pinStep === "remove" && (
          <div>
            {pinBoxRow("Enter current PIN to remove", pin1, setPin1, p1r)}
            {pinErr && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{pinErr}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn sm danger" onClick={confirmRemovePin} disabled={joinPin(pin1).length < 4}>Remove PIN</button>
              <button className="btn sm secondary" onClick={cancelPin}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* 2  Profile photo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Profile Photo</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <AvatarEl size={72} />
            <button onClick={() => avatarRef.current?.click()} title="Change"
              style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.75)", border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, padding: 0 }}>
              
            </button>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>@{user.username}</div>
            <div className="muted" style={{ fontSize: 13 }}>{user.firstName} {user.lastName}</div>
            <button className="btn sm secondary" style={{ marginTop: 8, fontSize: 11 }} onClick={() => avatarRef.current?.click()}>Change photo</button>
          </div>
        </div>
        {avatarUrl !== (user.avatarUrl ?? "") && <div style={{ marginTop: 10, padding: "6px 12px", borderRadius: 8, background: "rgba(231,168,255,0.08)", fontSize: 12, color: "var(--venue-brand)" }}>New photo selected  not saved yet.</div>}
        <button className="btn" style={{ marginTop: 14 }} onClick={saveAvatar} disabled={saving}>Save photo</button>
      </div>

      {/* 3  Venue photo + Preview */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Venue Photo</div>
              <div className="muted" style={{ fontSize: 12 }}>Shown to customers. Recommended 600400.</div>
            </div>
            <button className="btn sm secondary" style={{ fontSize: 11, flexShrink: 0, marginLeft: 10 }} onClick={() => setShowPreview(p => !p)}>
              {showPreview ? "Hide preview" : " Customer view"}
            </button>
          </div>

          {/* Preview matching u/zone/[id] exactly */}
          {showPreview && (
            <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 11, color: "var(--muted-text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>As seen in Zones</div>
              <div className="card" style={{ maxWidth: 340, marginBottom: 0 }}>
                <div className="header">
                  <strong>{venue.name}</strong>
                  {venue.type && <span className="badge">{venue.type}</span>}
                </div>
                <p className="muted">{venue.description || ""}</p>
                <p className="muted">Crowd {liveCrowd}/10</p>
                <div className="row">
                  <span className="btn" style={{ opacity: 0.45, cursor: "default", userSelect: "none" }}>View</span>
                  {venue.address && (
                    <a className="btn secondary" href={`https://www.google.com/maps?q=${encodeURIComponent(venue.address)}`} target="_blank" rel="noreferrer">Maps</a>
                  )}
                </div>
              </div>
            </div>
          )}

          {venueImageUrl
            ? <img src={venueImageUrl} alt="Venue" style={{ width: "100%", maxWidth: 360, height: 200, objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />
            : <div style={{ width: "100%", maxWidth: 360, height: 110, background: "rgba(255,255,255,0.04)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, border: "2px dashed rgba(255,255,255,0.1)" }}>
                <span className="muted" style={{ fontSize: 13 }}>No photo yet</span>
              </div>
          }
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className="btn sm secondary" onClick={() => venueImgRef.current?.click()}>
               {venueImageUrl ? "Change" : "Upload"}
            </button>
            {venueImageUrl && <button className="btn sm secondary" onClick={() => setVenueImageUrl("")}>Remove</button>}
          </div>
          <input ref={venueImgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleVenueImgChange} />
          {venueImageUrl !== (venue.venueImageUrl ?? "") && <div style={{ marginBottom: 12, padding: "6px 12px", borderRadius: 8, background: "rgba(231,168,255,0.08)", fontSize: 12, color: "var(--venue-brand)" }}>New photo selected  not saved yet.</div>}
          <button className="btn" onClick={saveVenueImage} disabled={saving}>Save venue photo</button>
        </div>
      )}

      {/* 4  Live Crowd (read-only) */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Live Crowd</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: crowdColor }}>
              {liveCrowd}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--muted-text)" }}>/10</span>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{crowdLabel}</div>
              <div className="muted" style={{ fontSize: 12 }}>{activeCheckins} active check-in{activeCheckins !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, height: 6, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(liveCrowd * 10, liveCrowd > 0 ? 3 : 0)}%`, borderRadius: 6, transition: "width 0.4s", background: crowdColor === "var(--muted-text)" ? "rgba(255,255,255,0.15)" : crowdColor }} />
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Based on check-ins in the last 2 hours. Updated automatically.</div>
        </div>
      )}

      {/* 5  Change password */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Change Password</div>
        <label>Current password</label>
        <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
        <label>New password</label>
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
        <label>Confirm new password</label>
        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
        <button className="btn" style={{ marginTop: 12 }} onClick={changePassword} disabled={saving || !currentPw || !newPw}>Update password</button>
      </div>

      {/* 6  Venue status */}
      {venue && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em" }}>Venue Status</div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: paused ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)", color: paused ? "#f59e0b" : "#22c55e", border: `1px solid ${paused ? "rgba(245,158,11,0.35)" : "rgba(34,197,94,0.35)"}` }}>
              {paused ? "Paused" : "Open"}
            </span>
          </div>
          <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            {paused ? "Your venue is paused  no new orders." : "Your venue is live and accepting orders."}
          </p>
          {paused
            ? <button className="btn" onClick={togglePause} disabled={saving}>Resume venue</button>
            : <button className="btn secondary" onClick={() => setShowPauseModal(true)} disabled={saving}>Pause venue</button>
          }
        </div>
      )}

      {/* 7  Danger zone */}
      <div className="card" style={{ border: "1px solid rgba(239,68,68,0.35)", marginBottom: 20 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, color: "#ef4444" }}>Danger Zone</div>
        {!showDelete ? (
          <button className="btn danger" onClick={() => setShowDelete(true)}>Delete account</button>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Permanently deletes your account. Active orders will be cancelled with full refunds. Type <strong>@{user.username}</strong> to confirm.</p>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={user.username} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn danger" onClick={deleteAccount} disabled={deleteConfirm !== user.username}>Delete permanently</button>
              <button className="btn secondary" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}>Cancel</button>
            </div>
          </>
        )}
      </div>

      {/* 8  Log out */}
      <div className="card" style={{ marginBottom: 40 }}>
        <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Session</div>
        <a className="btn secondary" href="/api/auth/logout">Log out</a>
      </div>

      {/* Modals */}
      {showPauseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "var(--surface,#1a1a2e)", borderRadius: 14, padding: 28, maxWidth: 420, width: "100%" }}>
            <h3 style={{ margin: "0 0 10px" }}>Pause your venue?</h3>
            <p className="muted" style={{ marginBottom: 20 }}>All active orders will be <strong>cancelled with full wallet refunds</strong>.</p>
            <div style={{ display: "flex", gap: 10 }}>
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
            <div style={{ display: "flex", gap: 10 }}>
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
