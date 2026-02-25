"use client";

import { useEffect, useRef } from "react";

export default function FlowDiagram() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animId: number;
    let startTime: number | null = null;
    let phase: "scrolling" | "pausing" = "scrolling";
    let pauseStart: number | null = null;

    const SCROLL_DURATION = 3000; // ms to scroll from start to end
    const PAUSE_DURATION = 2000;  // ms to wait at end before restarting

    function animate(now: number) {
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;

      if (maxScroll <= 0) {
        // Not scrollable yet (e.g. images not loaded) — keep waiting
        animId = requestAnimationFrame(animate);
        return;
      }

      if (phase === "scrolling") {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / SCROLL_DURATION, 1);
        // Ease-in-out for a polished feel
        const eased = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
        el.scrollLeft = eased * maxScroll;

        if (progress >= 1) {
          phase = "pausing";
          pauseStart = now;
        }
      } else {
        // pausing at the end
        if (pauseStart !== null && now - pauseStart >= PAUSE_DURATION) {
          el.scrollLeft = 0;
          phase = "scrolling";
          startTime = null;
          pauseStart = null;
        }
      }

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      ref={scrollRef}
      style={{
        width: "100%",
        overflowX: "hidden",
        marginBottom: 32,
        paddingBottom: 4,
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: "max-content", margin: "0 auto", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/flow-1.png" alt="Step 1" style={{ width: 130, height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/flow-2.png" alt="Step 2" style={{ width: 130, height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/flow-3.png" alt="Step 3" style={{ width: 130, height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }} />
      </div>
    </div>
  );
}
