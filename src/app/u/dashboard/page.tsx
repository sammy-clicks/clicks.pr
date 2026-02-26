"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, ReactNode } from "react";
import { Nav } from "@/components/Nav";

function isoWeek(d: Date) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt.getTime() - y.getTime()) / 86400000) + 1) / 7);
}

/** Renders a greeting string with "week N" / "Week N" highlighted in accent color and emojis stripped. */
function renderGreeting(text: string, week: number): ReactNode[] {
  const clean = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
  const re = new RegExp(`(week\\s+${week})`, "gi");
  const parts = clean.split(re);
  return parts.map((p, i) =>
    re.test(p)
      ? <span key={i} style={{ color: "#08daf4" }}>{p}</span>
      : p
  );
}

const CROWD: Record<number, { label: string; color: string }> = {
  0:  { label: "No activity", color: "#666"    },
  1:  { label: "Quiet",       color: "#2ecc71" },
  2:  { label: "Quiet",       color: "#2ecc71" },
  3:  { label: "Moderate",    color: "#a8d926" },
  4:  { label: "Moderate",    color: "#f39c12" },
  5:  { label: "Busy",        color: "#f39c12" },
  6:  { label: "Busy",        color: "#e67e22" },
  7:  { label: "Packed",      color: "#e67e22" },
  8:  { label: "Packed",      color: "#e74c3c" },
  9:  { label: "Full",        color: "#e74c3c" },
  10: { label: "Full",        color: "#c0392b" },
};

const VENUE_EMOJI: Record<string, string> = {
  bar:        "",
  club:       "",
  restaurant: "",
  lounge:     "",
  rooftop:    "",
  beach_bar:  "",
  default:    "",
};

// Haversine distance in miles
function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SECTIONS: { href: string; icon: string | null; label: string; desc: string }[] = [
  { href: "/u/zones",       icon: "/zones_users.png",       label: "Zones",       desc: "Browse zones & check in" },
  { href: "/u/wallet",      icon: "/wallet_users.png",      label: "Wallet",      desc: "Balance & transfers" },
  { href: "/u/buddies",     icon: "/buddies_users.png",     label: "Buddies",     desc: "Friends & requests" },
  { href: "/u/inbox",       icon: "/indox_users.png",       label: "Inbox",       desc: "Notifications" },
  { href: "/u/vote",        icon: "/vote_users.png",        label: "Vote",        desc: "Vote for venues" },
  { href: "/u/leaderboard", icon: "/leaderboard_users.png", label: "Leaderboard", desc: "Top users" },
  { href: "/u/summary",     icon: "/summary_users.png",     label: "Summary",     desc: "Your activity" },
  { href: "/u/account",     icon: null,                     label: "Account",     desc: "Profile & settings" },
];

export default function DashboardPage() {
  const [firstName, setFirstName]   = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [loaded, setLoaded]         = useState(false);
  const [feed, setFeed]             = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [userLat, setUserLat]       = useState<number | null>(null);
  const [userLng, setUserLng]       = useState<number | null>(null);
  const [clicked, setClicked]       = useState<Record<string, boolean>>({});
  const [clickedAt, setClickedAt]   = useState<Record<string, number>>({});
  const [modalVenue, setModalVenue] = useState<any>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const week                        = isoWeek(new Date());
  const year                        = new Date().getFullYear();

  const GREETINGS = [
    `Week ${week} is here — make it count tonight 🔥`,
    `It's week ${week} of ${year} — the night is yours 🌙`,
    `Week ${week} — what's the move tonight? 🎉`,
    `The weekend starts in your head. Week ${week} go. 🚀`,
  ];
  const greeting = GREETINGS[week % GREETINGS.length];

  const loadFeed = useCallback(async () => {
    const [profileR, feedR, promoR] = await Promise.all([
      fetch("/api/u/profile").then(r => r.ok ? r.json() : null),
      fetch("/api/u/feed").then(r => r.ok ? r.json() : null),
      fetch("/api/u/promotions").then(r => r.ok ? r.json() : null),
    ]);
    if (profileR?.user?.firstName) setFirstName(profileR.user.firstName);
    if (profileR?.user?.avatarUrl !== undefined) setAvatarUrl(profileR.user.avatarUrl ?? null);
    if (feedR) setFeed(feedR);
    if (promoR?.promotions) setPromotions(promoR.promotions);
    setLoaded(true);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { setUserLat(p.coords.latitude); setUserLng(p.coords.longitude); },
      () => {}
    );
  }, []);

  async function click(venueId: string) {
    if (clicked[venueId]) return;
    setClicked(c => ({ ...c, [venueId]: true }));
    setClickedAt(c => ({ ...c, [venueId]: Date.now() }));
    await fetch("/api/clicks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId }),
    });
    // refresh click counts after 1s
    setTimeout(() => loadFeed(), 1200);
    // reset cooldown after 15s
    setTimeout(() => {
      setClicked(c => { const n = { ...c }; delete n[venueId]; return n; });
      setClickedAt(c => { const n = { ...c }; delete n[venueId]; return n; });
    }, 15000);
  }

  const hot: any[] = feed?.hot ?? [];

  return (
    <div data-role="user">
      <style>{`@keyframes cooldownBar { from { width: 100%; } to { width: 0%; } }`}</style>
      <Nav role="u" />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 56 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Clicks" style={{ height: 72, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Greeting — only renders once profile loads, no flash */}
        {loaded && (
          <div style={{ marginBottom: 28, paddingLeft: 2 }}>
            <h1 style={{ fontSize: "2.1rem", fontWeight: 900, margin: "0 0 6px", lineHeight: 1.15 }}>
              Hey{firstName ? `, ${firstName}` : ""} 👋
            </h1>
            <p style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--muted-text)", margin: 0, lineHeight: 1.2 }}>
              {renderGreeting(greeting, week)}
            </p>
          </div>
        )}
        {!loaded && <div style={{ height: 72, marginBottom: 28 }} />}

        {/*  Happening Now  */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}> Happening Now</h2>
            <Link href="/u/zones" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>See all </Link>
          </div>

          {hot.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p className="muted" style={{ margin: 0 }}>Nothing trending yet  check back tonight </p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8,
              scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
              {hot.map((v: any) => {
                const crowd = CROWD[v.crowdLevel] ?? CROWD[0];
                const emoji = VENUE_EMOJI[v.type?.toLowerCase()] ?? VENUE_EMOJI.default;
                const isClicked = clicked[v.id];
                return (
                  <div key={v.id} onClick={() => click(v.id)}
                    style={{ flexShrink: 0, width: 200, borderRadius: 16, overflow: "hidden",
                    border: isClicked ? "1.5px solid #08daf4" : "1.5px solid var(--border)",
                    background: v.venueImageUrl ? "#111" : "var(--surface)",
                    boxShadow: isClicked
                      ? "0 0 0 3px rgba(8,218,244,0.45), 0 6px 28px rgba(8,218,244,0.35)"
                      : v.isBoosted ? "0 0 0 2px #08daf4, 0 6px 20px rgba(8,218,244,0.2)" : "none",
                    cursor: "pointer", transition: "box-shadow 0.3s, border-color 0.3s",
                    position: "relative" }}>
                    {/* Venue image or emoji */}
                    <div style={{ position: "relative", height: 110, background: v.venueImageUrl ? undefined : "linear-gradient(135deg, #1a1a2e, #2d2d44)",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {v.venueImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.venueImageUrl} alt={v.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                      ) : (
                        <span style={{ fontSize: 36 }}>{emoji}</span>
                      )}
                      {/* Boost badge */}
                      {v.isBoosted && (
                        <div style={{ position: "absolute", top: 7, right: 7, background: "var(--accent)",
                          borderRadius: 6, fontSize: 10, fontWeight: 800, padding: "2px 7px", color: "#000" }}>BOOST</div>
                      )}
                      {/* Gradient overlay */}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
                      {/* Live check-ins */}
                      {v.liveCheckins > 0 && (
                        <div style={{ position: "absolute", bottom: 7, left: 9, fontSize: 11, color: "#fff", fontWeight: 700 }}>
                           {v.liveCheckins} Clicker{v.liveCheckins !== 1 ? "s" : ""} inside
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: "10px 12px 12px" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--muted-text)" }}>{v.zone?.name}</span>
                        {userLat !== null && userLng !== null && v.lat != null && v.lng != null && (
                          <span style={{ fontSize: 10, color: "rgba(8,218,244,0.7)", fontWeight: 600, flexShrink: 0 }}>
                            · {haversineMi(userLat, userLng, v.lat, v.lng).toFixed(1)} mi
                          </span>
                        )}
                      </div>

                      {/* Crowd meter + clicks row */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                          {Array.from({ length: 10 }, (_, i) => (
                            <div key={i} style={{
                              flex: 1, height: 5, borderRadius: 3,
                              background: i < v.crowdLevel
                                ? (v.crowdLevel <= 3 ? "#2ecc71" : v.crowdLevel <= 6 ? "#f39c12" : "#e74c3c")
                                : "rgba(255,255,255,0.1)",
                              transition: "background 0.3s",
                            }} />
                          ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          {v.crowdLevel > 0
                            ? <span style={{ fontSize: 10, fontWeight: 600, color: crowd.color }}>{crowd.label}</span>
                            : <span style={{ fontSize: 10, color: "var(--muted-text)" }}>No activity</span>}
                          {v.recentClicks > 0 && (
                            <span style={{ fontSize: 10, color: "var(--muted-text)", display: "flex", alignItems: "center", gap: 3 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/logo.png" alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
                              {v.recentClicks}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={(e) => { e.stopPropagation(); setModalVenue(v); }}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                            background: "var(--surface)", border: "1.5px solid var(--border)",
                            color: "var(--ink)", cursor: "pointer", transition: "all 0.2s" }}>
                          Open
                        </button>
                        {/* Maps icon */}
                        <a
                          href={`https://www.google.com/maps?q=${v.lat ?? 0},${v.lng ?? 0}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center",
                            width: 36, height: 34, borderRadius: 8, background: "var(--surface)",
                            border: "1px solid var(--border)", flexShrink: 0 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/maps.png" alt="Maps" style={{ width: 20, height: 20, objectFit: "contain" }} />
                        </a>
                      </div>

                      {/* Cooldown meter */}
                      {isClicked && (
                        <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "rgba(8,218,244,0.18)", overflow: "hidden" }}>
                          <div key={clickedAt[v.id]} style={{
                            height: "100%", background: "#08daf4", borderRadius: 4,
                            animation: "cooldownBar 15s linear forwards",
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Promotions */}
        {promotions.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Active Promotions</h2>
            </div>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8,
              scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
              {[...promotions]
                .sort((a, b) => {
                  if (userLat === null || userLng === null) return 0;
                  return haversineMi(userLat, userLng, a.venue.lat, a.venue.lng) -
                         haversineMi(userLat, userLng, b.venue.lat, b.venue.lng);
                })
                .map((p: any) => {
                  const dist = userLat !== null && userLng !== null && p.venue.lat != null && p.venue.lng != null
                    ? haversineMi(userLat, userLng, p.venue.lat, p.venue.lng)
                    : null;
                  return (
                    <Link key={p.id} href={`/u/venue/${p.venue.id}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                      <div style={{
                        width: 200, borderRadius: 16, overflow: "hidden",
                        border: "1.5px solid rgba(139,92,246,0.3)",
                        background: p.imageUrl ? "#111" : "var(--surface)",
                        cursor: "pointer", transition: "box-shadow 0.2s",
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 2px rgba(139,92,246,0.5)"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
                      >
                        <div style={{ position: "relative", height: 100, background: p.imageUrl ? undefined : "linear-gradient(135deg,#1a0a2e,#2a1a44)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                          ) : p.venue.venueImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.venue.venueImageUrl} alt={p.venue.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.55 }} />
                          ) : null}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)" }} />
                          <div style={{ position: "absolute", top: 7, right: 7, background: "rgba(139,92,246,0.9)", borderRadius: 6, fontSize: 10, fontWeight: 800, padding: "2px 8px", color: "#fff" }}>
                            {p.priceCents === 0 ? "FREE" : `$${(p.priceCents / 100).toFixed(0)}`}
                          </div>
                        </div>
                        <div style={{ padding: "10px 12px 12px" }}>
                          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#c4b5fd" }}>{p.title}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 11, color: "var(--muted-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.venue.name}</span>
                            {dist !== null && (
                              <span style={{ fontSize: 10, color: "rgba(8,218,244,0.7)", fontWeight: 600, flexShrink: 0 }}>{dist.toFixed(1)} mi</span>
                            )}
                          </div>
                          {p.expiresAt && (
                            <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 4 }}>
                              Expires {new Date(p.expiresAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Quick-menu modal */}
        {modalVenue && (
          <>
            <div onClick={() => setModalVenue(null)} style={{
              position: "fixed", inset: 0, zIndex: 1200,
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
            }} />
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1210,
              background: "var(--surface)", borderRadius: "22px 22px 0 0",
              paddingBottom: "env(safe-area-inset-bottom,20px)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
              maxHeight: "90vh", overflow: "hidden",
            }}>
              {/* Drag handle — swipe down to close */}
              <div
                onTouchStart={(e) => setSwipeStartY(e.touches[0].clientY)}
                onTouchEnd={(e) => {
                  if (swipeStartY !== null) {
                    const dy = e.changedTouches[0].clientY - swipeStartY;
                    if (dy > 55) setModalVenue(null);
                    setSwipeStartY(null);
                  }
                }}
                style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px", cursor: "grab" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>

              {/* Hero image */}
              <div style={{ position: "relative", height: modalVenue.venueImageUrl ? 190 : 80, overflow: "hidden",
                background: modalVenue.venueImageUrl ? "#111" : "linear-gradient(135deg,#1a1a2e,#2d2d44)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {modalVenue.venueImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={modalVenue.venueImageUrl} alt={modalVenue.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                )}
                {!modalVenue.venueImageUrl && (
                  <span style={{ fontSize: 40, zIndex: 1 }}>
                    {VENUE_EMOJI[modalVenue.type?.toLowerCase()] ?? VENUE_EMOJI.default}
                  </span>
                )}
                {/* Gradient overlay for text legibility */}
                {modalVenue.venueImageUrl && (
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" }} />
                )}
                {/* Venue type badge */}
                {modalVenue.type && (
                  <div style={{ position: "absolute", top: 12, left: 16, padding: "3px 10px", borderRadius: 20,
                    background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)",
                    fontSize: 11, fontWeight: 700, color: "#fff", backdropFilter: "blur(4px)" }}>
                    {modalVenue.type}
                  </div>
                )}
                {/* Boost badge */}
                {modalVenue.isBoosted && (
                  <div style={{ position: "absolute", top: 12, right: modalVenue.type ? 60 : 16,
                    background: "var(--accent)", borderRadius: 20, fontSize: 10, fontWeight: 800,
                    padding: "3px 9px", color: "#000" }}>BOOST</div>
                )}
                {/* Close button */}
                <button onClick={() => setModalVenue(null)}
                  style={{ position: "absolute", top: 10, right: 14, width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff", fontSize: 14, cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>✕</button>
                {/* Live checkins overlay */}
                {modalVenue.liveCheckins > 0 && (
                  <div style={{ position: "absolute", bottom: 10, left: 16, fontSize: 12, color: "#fff",
                    fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="" style={{ width: 14, height: 14, objectFit: "contain", verticalAlign: "middle", marginRight: 4 }} />
                    {modalVenue.liveCheckins} inside
                  </div>
                )}
              </div>

              <div style={{ padding: "16px 20px 20px" }}>
                {/* Name + zone */}
                <h2 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{modalVenue.name}</h2>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted-text)" }}>{modalVenue.zone?.name}</p>

                {/* Crowd meter */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} style={{
                        flex: 1, height: 5, borderRadius: 3,
                        background: i < modalVenue.crowdLevel
                          ? (modalVenue.crowdLevel <= 3 ? "#2ecc71" : modalVenue.crowdLevel <= 6 ? "#f39c12" : "#e74c3c")
                          : "rgba(255,255,255,0.1)",
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: (CROWD[modalVenue.crowdLevel] ?? CROWD[0]).color }}>
                    {(CROWD[modalVenue.crowdLevel] ?? CROWD[0]).label}
                    {modalVenue.crowdLevel > 0 && <span style={{ fontWeight: 400, color: "var(--muted-text)" }}> · {modalVenue.crowdLevel}/10</span>}
                  </span>
                </div>

                {/* PRIMARY CTA */}
                <Link href={`/u/venue/${modalVenue.id}`}
                  onClick={() => setModalVenue(null)}
                  style={{ display: "block", padding: "14px 0", borderRadius: 12, fontSize: 15, fontWeight: 800,
                    background: "var(--accent)", color: "#000", textDecoration: "none", textAlign: "center",
                    marginBottom: 10, boxShadow: "0 0 18px rgba(8,218,244,0.3)" }}>
                  See Menu &amp; Order →
                </Link>

                {/* Secondary actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={async (e) => { e.stopPropagation(); await click(modalVenue.id); setModalVenue(null); }}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: clicked[modalVenue.id] ? "rgba(8,218,244,0.12)" : "var(--surface)",
                      border: clicked[modalVenue.id] ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                      color: clicked[modalVenue.id] ? "var(--accent)" : "var(--ink)",
                      cursor: clicked[modalVenue.id] ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", opacity: 0.85 }} />
                    {clicked[modalVenue.id] ? "Clicked" : "Click"}
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${modalVenue.lat ?? 0},${modalVenue.lng ?? 0}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: "var(--surface)", border: "1.5px solid var(--border)",
                      color: "var(--ink)", textDecoration: "none", textAlign: "center",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/maps.png" alt="Maps" style={{ width: 16, height: 16, objectFit: "contain" }} />
                    Directions
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

        {/*  Quick Links  */}
        <h2 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 800 }}>Explore</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 12,
        }}>
          {SECTIONS.map(s => {
            const isAccount = s.label === "Account";
            return (
              <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
                <div className="card" style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, padding: "18px 10px", borderRadius: 16, textAlign: "center",
                  transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(8,218,244,0.12)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
                >
                  {isAccount ? (
                    avatarUrl
                      ? <img src={avatarUrl} alt="Account" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                      : <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#000" }}>
                          {firstName?.[0]?.toUpperCase() ?? "U"}
                        </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.icon!} alt={s.label} style={{ width: 46, height: 46, objectFit: "contain" }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                    <div className="muted" style={{ fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}