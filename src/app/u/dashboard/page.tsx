"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";

function isoWeek(d: Date) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt.getTime() - y.getTime()) / 86400000) + 1) / 7);
}

const CROWD: Record<number, { label: string; color: string }> = {
  0: { label: "No data",  color: "#666" },
  1: { label: "Quiet",    color: "#2ecc71" },
  2: { label: "Moderate", color: "#a8d926" },
  3: { label: "Busy",     color: "#f39c12" },
  4: { label: "Packed",   color: "#e67e22" },
  5: { label: "Full",     color: "#e74c3c" },
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

const SECTIONS = [
  { href: "/u/zones",       icon: "/zones_users.png",       label: "Zones",       desc: "Browse zones & check in" },
  { href: "/u/wallet",      icon: "/wallet_users.png",      label: "Wallet",      desc: "Balance & transfers" },
  { href: "/u/buddies",     icon: "/buddies_users.png",     label: "Buddies",     desc: "Friends & requests" },
  { href: "/u/inbox",       icon: "/indox_users.png",       label: "Inbox",       desc: "Notifications" },
  { href: "/u/vote",        icon: "/vote_users.png",        label: "Vote",        desc: "Vote for venues" },
  { href: "/u/leaderboard", icon: "/leaderboard_users.png", label: "Leaderboard", desc: "Top users" },
  { href: "/u/summary",     icon: "/summary_users.png",     label: "Summary",     desc: "Your activity" },
];

export default function DashboardPage() {
  const [firstName, setFirstName]   = useState<string | null>(null);
  const [loaded, setLoaded]         = useState(false);
  const [feed, setFeed]             = useState<any>(null);
  const [clicked, setClicked]       = useState<Record<string, boolean>>({});
  const [modalVenue, setModalVenue] = useState<any>(null);
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
    const [profileR, feedR] = await Promise.all([
      fetch("/api/u/profile").then(r => r.ok ? r.json() : null),
      fetch("/api/u/feed").then(r => r.ok ? r.json() : null),
    ]);
    if (profileR?.user?.firstName) setFirstName(profileR.user.firstName);
    if (feedR) setFeed(feedR);
    setLoaded(true);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  async function click(venueId: string) {
    if (clicked[venueId]) return;
    setClicked(c => ({ ...c, [venueId]: true }));
    await fetch("/api/clicks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ venueId }),
    });
    // refresh click counts after 1s
    setTimeout(() => loadFeed(), 1200);
    // reset cooldown indicator after 15s
    setTimeout(() => setClicked(c => { const n = { ...c }; delete n[venueId]; return n; }), 15000);
  }

  const hot: any[] = feed?.hot ?? [];

  return (
    <div data-role="user">
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
            <h1 style={{ fontSize: "2.1rem", fontWeight: 900, margin: "0 0 8px", lineHeight: 1.15 }}>
              Hey{firstName ? `, ${firstName}` : ""} 👋
            </h1>
            <p style={{ fontSize: 15, color: "var(--muted-text)", margin: 0, lineHeight: 1.6 }}>
              {greeting}
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
                  <div key={v.id} onClick={() => setModalVenue(v)}
                    style={{ flexShrink: 0, width: 200, borderRadius: 16, overflow: "hidden",
                    border: "1.5px solid var(--border)",
                    background: v.venueImageUrl ? "#111" : "var(--surface)",
                    boxShadow: v.isBoosted ? "0 0 0 2px #08daf4, 0 6px 20px rgba(8,218,244,0.2)" : "none",
                    cursor: "pointer" }}>
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
                           {v.liveCheckins} inside
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: "10px 12px 12px" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-text)", marginBottom: 6 }}>{v.zone?.name}</div>

                      {/* Crowd + clicks row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: crowd.color }}> {crowd.label}</span>
                        {v.recentClicks > 0 && (
                          <span style={{ fontSize: 11, color: "var(--muted-text)" }}> {v.recentClicks}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => click(v.id)}
                          style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                            background: isClicked ? "rgba(8,218,244,0.15)" : "var(--accent)",
                            border: isClicked ? "1.5px solid var(--accent)" : "none",
                            color: isClicked ? "var(--accent)" : "#000", cursor: isClicked ? "default" : "pointer",
                            transition: "all 0.2s" }}>
                          {isClicked ? " Clicked" : " Click"}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
              padding: "0 0 env(safe-area-inset-bottom,24px)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
            }}>
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 8px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>
              {/* Venue banner */}
              {modalVenue.venueImageUrl && (
                <img src={modalVenue.venueImageUrl} alt={modalVenue.name}
                  style={{ width: "100%", height: 140, objectFit: "cover" }} />
              )}
              <div style={{ padding: "16px 20px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{modalVenue.name}</h2>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--muted-text)" }}>
                      {modalVenue.zone?.name}
                      {modalVenue.crowdLevel > 0 && (
                        <> · <span style={{ color: CROWD[modalVenue.crowdLevel]?.color }}>{CROWD[modalVenue.crowdLevel]?.label}</span></>
                      )}
                    </p>
                  </div>
                  <button onClick={() => setModalVenue(null)}
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: "var(--muted-text)", fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  {/* Click button */}
                  <button
                    onClick={async (e) => { e.stopPropagation(); await click(modalVenue.id); setModalVenue(null); }}
                    style={{ flex: 1, padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 800,
                      background: clicked[modalVenue.id] ? "rgba(8,218,244,0.15)" : "var(--accent)",
                      border: clicked[modalVenue.id] ? "1.5px solid var(--accent)" : "none",
                      color: clicked[modalVenue.id] ? "var(--accent)" : "#000",
                      cursor: clicked[modalVenue.id] ? "default" : "pointer" }}>
                    {clicked[modalVenue.id] ? "✓ Clicked" : "⚡ Click"}
                  </button>
                  {/* Maps button */}
                  <a
                    href={`https://www.google.com/maps?q=${modalVenue.lat ?? 0},${modalVenue.lng ?? 0}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 800,
                      background: "var(--surface)", border: "1.5px solid var(--border)",
                      color: "var(--ink)", textDecoration: "none", textAlign: "center",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/maps.png" alt="Maps" style={{ width: 18, height: 18, objectFit: "contain" }} />
                    Directions
                  </a>
                </div>

                {/* Browse full menu */}
                <Link href={`/u/venue/${modalVenue.id}`}
                  onClick={() => setModalVenue(null)}
                  style={{ display: "block", marginTop: 10, padding: "13px 0", borderRadius: 12,
                    fontSize: 14, fontWeight: 700, background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border)", color: "var(--ink)",
                    textDecoration: "none", textAlign: "center" }}>
                   Browse Full Menu
                </Link>
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
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 8, padding: "18px 10px", borderRadius: 16, textAlign: "center",
                transition: "transform 0.15s, box-shadow 0.15s", cursor: "pointer",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(8,218,244,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt={s.label} style={{ width: 46, height: 46, objectFit: "contain" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
                  <div className="muted" style={{ fontSize: 10, marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}