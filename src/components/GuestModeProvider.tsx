"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/* ── Context ─────────────────────────────────────────────────────── */
interface GuestCtxValue {
  isGuest: boolean;
  prompt: () => void;     // show the "create account or log in" modal
  exitGuest: () => void;  // clear cookie → /auth/login
}

const GuestCtx = createContext<GuestCtxValue>({
  isGuest: false,
  prompt: () => {},
  exitGuest: () => {},
});

export function useGuestMode() {
  return useContext(GuestCtx);
}

/* ── GuestPageBlock ──────────────────────────────────────────────── */
/**
 * Drop <GuestPageBlock /> at the top of any page's JSX to immediately
 * show the auth prompt whenever a guest lands on that page.
 */
export function GuestPageBlock() {
  const { isGuest, prompt } = useGuestMode();
  const fired = useRef(false);
  useEffect(() => {
    if (isGuest && !fired.current) {
      fired.current = true;
      prompt();
    }
  }, [isGuest, prompt]);
  return null;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function readGuestCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some(c => c === "clicks_guest=1");
}

/* ── Provider ────────────────────────────────────────────────────── */
export function GuestModeProvider({ children }: { children: React.ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setIsGuest(readGuestCookie());
  }, []);

  const prompt = useCallback(() => setVisible(true), []);

  const exitGuest = useCallback(() => {
    document.cookie = "clicks_guest=; path=/; max-age=0";
    window.location.href = "/auth/login";
  }, []);

  return (
    <GuestCtx.Provider value={{ isGuest, prompt, exitGuest }}>
      {children}

      {/* ── Guest Auth Modal ──────────────────────────────────── */}
      {visible && (
        <div
          onClick={() => setVisible(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 16px 32px",
            animation: "fadeIn .18s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Sign up or log in"
            style={{
              background: "var(--card, #1a1a2e)",
              border: "1px solid rgba(8,218,244,0.22)",
              borderRadius: 20,
              padding: "28px 24px 20px",
              width: "100%",
              maxWidth: 400,
              textAlign: "center",
              boxShadow: "0 -8px 48px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 12 }}>✨</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#fff", fontWeight: 700 }}>
              Create an account or log in
            </h3>
            <p style={{
              margin: "0 0 22px",
              fontSize: 14,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.65,
            }}>
              You&apos;re browsing as a guest. Sign up or log in to unlock
              check-ins, orders, wallet, votes, and more.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a
                href="/auth/signup"
                className="btn"
                style={{ textAlign: "center", textDecoration: "none", display: "block" }}
              >
                Create account
              </a>
              <button className="btn secondary" onClick={exitGuest}>
                Log in instead
              </button>
              <button
                onClick={() => setVisible(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 13,
                  padding: "6px 0",
                  marginTop: 2,
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </GuestCtx.Provider>
  );
}
