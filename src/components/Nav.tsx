"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

// ── Venue icon nav config ─────────────────────────────────────────
const VENUE_LINKS: [string, string, string][] = [
  ["/v/dashboard",  "Dashboard",  "/dashboard_venues.png"],
  ["/v/menu",       "Menu",       "/menu_venues.png"],
  ["/v/orders",     "Orders",     "/orders_venues.png"],
  ["/v/promotions", "Promotions", "/promotions_venues.png"],
];

function VenueNav({ path }: { path: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasPIN, setHasPIN] = useState(false);

  useEffect(() => {
    fetch("/api/v/account")
      .then(r => r.json())
      .then(j => { if (j.user?.avatarUrl) setAvatarUrl(j.user.avatarUrl); })
      .catch(() => {});
    setHasPIN(!!localStorage.getItem("venue_pin"));
  }, []);

  function lockApp() {
    sessionStorage.removeItem("venue_pin_unlocked");
    window.location.reload();
  }

  const accountActive = path.startsWith("/v/account");

  return (
    <nav className="nav nav-venue">
      {/* Logo — top left */}
      <Link href="/v/dashboard" className="venue-logo-link">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo_venues.png" alt="Clicks Venues" className="venue-logo" />
      </Link>

      <div style={{ width: 8, flexShrink: 0 }} />

      {/* Icon nav items */}
      {VENUE_LINKS.map(([href, label, icon]) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} className={`venue-nav-item${active ? " active" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt={label} className="venue-nav-icon" />
            <span>{label}</span>
          </Link>
        );
      })}

      {/* Account — avatar bubble */}
      <Link href="/v/account" className={`venue-nav-item${accountActive ? " active" : ""}`}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Account" className="venue-nav-avatar" />
        ) : (
          <div className="venue-nav-avatar--placeholder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--venue-brand)" }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
        )}
        <span>Account</span>
      </Link>

      <span style={{ marginLeft: "auto" }}>
        <ThemeToggle />
      </span>
    </nav>
  );
}

// ── Main Nav ──────────────────────────────────────────────────────
export function Nav({ role }: { role: "u" | "v" | "admin" }) {
  const path = usePathname();

  if (role === "v") return <VenueNav path={path} />;

  const links: [string, string][] =
    role === "u"
      ? [
          ["/u/zones", "Zones"],
          ["/u/wallet", "Wallet"],
          ["/u/buddies", "Buddies"],
          ["/u/inbox", "Inbox"],
          ["/u/vote", "Vote"],
          ["/u/leaderboard", "Leaderboard"],
          ["/u/summary", "Summary"],
          ["/u/account", "Account"],
        ]
      : [
          ["/admin/analytics", "Analytics"],
          ["/admin/municipalities", "Municipalities"],
          ["/admin/zones", "Zones"],
          ["/admin/venues", "Venues"],
          ["/admin/users", "Users"],
          ["/admin/cases", "Cases"],
        ];

  return (
    <nav className="nav" style={{ alignItems: "center" }}>
      {links.map(([href, label]) => (
        <Link
          key={href}
          className={`badge${path === href || path.startsWith(href + "/") ? " active" : ""}`}
          href={href}
        >
          {label}
        </Link>
      ))}
      {role === "admin" && <a className="badge" href="/api/auth/logout">Logout</a>}
      <span style={{ marginLeft: "auto" }}>
        <ThemeToggle />
      </span>
    </nav>
  );
}
