"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

const SECTIONS: { href: string; icon: string; label: string; desc: string }[] = [
  { href: "/u/zones",       icon: "/zones_users.png",       label: "Zones",       desc: "Browse nearby zones & check in" },
  { href: "/u/wallet",      icon: "/wallet_users.png",      label: "Wallet",      desc: "Your balance & transactions" },
  { href: "/u/buddies",     icon: "/buddies_users.png",     label: "Buddies",     desc: "Friends & connection requests" },
  { href: "/u/inbox",       icon: "/indox_users.png",       label: "Inbox",       desc: "Notifications & messages" },
  { href: "/u/vote",        icon: "/vote_users.png",        label: "Vote",        desc: "Cast your vote for venues" },
  { href: "/u/leaderboard", icon: "/leaderboard_users.png", label: "Leaderboard", desc: "Top users & rankings" },
  { href: "/u/summary",     icon: "/summary_users.png",     label: "Summary",     desc: "Your activity overview" },
];

export default function DashboardPage() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/u/profile")
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.user?.name) setName(j.user.name); })
      .catch(() => {});
  }, []);

  return (
    <div data-role="user">
      <Nav role="u" />
      <div className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        {/* Welcome header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 4px" }}>
            {name ? `Hey, ${name.split(" ")[0]} 👋` : "Dashboard"}
          </h1>
          <p className="muted" style={{ fontSize: 14, margin: 0 }}>
            What would you like to do today?
          </p>
        </div>

        {/* Quick-link tiles */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
          gap: 14,
        }}>
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 10, padding: "20px 12px", borderRadius: 16, textAlign: "center",
                transition: "transform 0.15s, box-shadow 0.15s",
                cursor: "pointer",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(8,218,244,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt={s.label} style={{ width: 52, height: 52, objectFit: "contain" }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
