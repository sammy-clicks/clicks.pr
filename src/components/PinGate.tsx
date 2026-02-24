"use client";
import { useEffect, useRef, useState } from "react";

const PIN_KEY     = "venue_pin";
const SESSION_KEY = "venue_pin_unlocked";

interface Props { children: React.ReactNode; alwaysPrompt?: boolean; }

export function PinGate({ children, alwaysPrompt = false }: Props) {
  const [pin,        setPin]        = useState<string | null>(null);
  const [unlocked,   setUnlocked]   = useState(false);
  const [input,      setInput]      = useState("");
  const [shake,      setShake]      = useState(false);
  const [ready,      setReady]      = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored   = localStorage.getItem(PIN_KEY);
    const session  = sessionStorage.getItem(SESSION_KEY);
    setPin(stored);
    if (!stored || (!alwaysPrompt && session === "1")) setUnlocked(true);
    setReady(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  function tryUnlock() {
    if (input === pin) {
      if (!alwaysPrompt) sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 600);
    }
  }

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--bg, #0d0d1a)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: 20,
        border: "1.5px solid var(--venue-brand)",
        boxShadow: "0 0 60px rgba(231,168,255,0.15)",
        padding: "40px 32px", maxWidth: 340, width: "100%",
        textAlign: "center",
        animation: shake ? "shakeX 0.5s ease" : undefined,
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
        <h3 style={{ margin: "0 0 6px", color: "var(--venue-brand)" }}>Manager PIN</h3>
        <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
          Enter your 4-digit PIN to access this section.
        </p>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={input}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setInput(v);
            if (v.length === 4) {
              // auto-submit when 4 digits are entered
              if (v === pin!) {
                if (!alwaysPrompt) sessionStorage.setItem(SESSION_KEY, "1");
                setUnlocked(true);
              } else {
                setShake(true);
                setTimeout(() => { setInput(""); setShake(false); }, 600);
              }
            }
          }}
          style={{
            width: "100%", textAlign: "center",
            fontSize: 32, fontWeight: 700, letterSpacing: 16,
            padding: "12px 0", marginBottom: 16,
            border: "1.5px solid var(--venue-brand)",
            borderRadius: 12, background: "var(--bg)",
            color: "var(--ink)",
          }}
          placeholder="••••"
        />
        <button className="btn" style={{ width: "100%" }} onClick={tryUnlock} disabled={input.length !== 4}>
          Unlock
        </button>
        <a
          href="/v/dashboard"
          style={{ display: "block", marginTop: 16, fontSize: 12, color: "var(--muted-text)", textDecoration: "none" }}
        >
          ← Back to Dashboard
        </a>
      </div>
      <style>{`
        @keyframes shakeX {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-8px)}
          80%{transform:translateX(8px)}
        }
      `}</style>
    </div>
  );
}

// ── PIN management hook + UI ─────────────────────────────────
export function usePinManager() {
  const [currentPin, setCurrentPin] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPin(localStorage.getItem(PIN_KEY));
  }, []);

  function savePin(pin: string) {
    localStorage.setItem(PIN_KEY, pin);
    sessionStorage.setItem(SESSION_KEY, "1"); // keep session unlocked after setting
    setCurrentPin(pin);
  }

  function removePin() {
    localStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentPin(null);
  }

  return { currentPin, savePin, removePin };
}
