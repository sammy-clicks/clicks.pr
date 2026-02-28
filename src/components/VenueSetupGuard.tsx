"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function VenueSetupGuard() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [show, setShow]       = useState(false);
  const [hasPhoto, setHasPhoto] = useState(true);
  const [hasPayout, setHasPayout] = useState(true);

  useEffect(() => {
    // Never block /v/account (or its subpaths)
    if (!pathname.startsWith("/v/") || pathname.startsWith("/v/account")) {
      setShow(false);
      return;
    }

    fetch("/api/v/account")
      .then(r => r.json())
      .then(j => {
        const photo  = !!j.venue?.venueImageUrl;
        const payout = !!j.venue?.stripeOnboarded;
        setHasPhoto(photo);
        setHasPayout(payout);
        if (!photo || !payout) setShow(true);
      })
      .catch(() => {}); // silently ignore if not logged in
  }, [pathname]);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.88)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "var(--surface,#1a1a2e)", borderRadius: 18, padding: 32,
        maxWidth: 400, width: "100%", textAlign: "center",
        border: "1px solid rgba(245,158,11,0.3)",
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏗️</div>
        <h2 style={{ margin: "0 0 8px", fontSize: "1.3rem" }}>Finish your setup first</h2>
        <p className="muted" style={{ marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
          Complete these steps before going live on Clicks.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, textAlign: "left" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderRadius: 10, background: hasPhoto ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${hasPhoto ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.25)"}`,
          }}>
            <span style={{ fontSize: 20 }}>{hasPhoto ? "✅" : "⚠️"}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Venue photo</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {hasPhoto ? "Uploaded" : "Required — shows in the app to customers"}
              </div>
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderRadius: 10, background: hasPayout ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${hasPayout ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.25)"}`,
          }}>
            <span style={{ fontSize: 20 }}>{hasPayout ? "✅" : "⚠️"}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Payouts</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {hasPayout ? "Connected" : "Required — connect your bank to receive earnings"}
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn"
          style={{ width: "100%", background: "#f59e0b", color: "#080c12", fontWeight: 700, fontSize: 15 }}
          onClick={() => router.push("/v/account")}
        >
          Complete setup →
        </button>
      </div>
    </div>
  );
}
