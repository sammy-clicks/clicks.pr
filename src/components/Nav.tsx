"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const RAIL_W = 68;
const FULL_W = 236;

const VENUE_LINKS = [
  { href: "/v/dashboard",  label: "Dashboard",  icon: "/dashboard_venues.png"  },
  { href: "/v/menu",       label: "Menu",       icon: "/menu_venues.png"       },
  { href: "/v/orders",     label: "Orders",     icon: "/orders_venues.png"     },
  { href: "/v/promotions", label: "Promotions", icon: "/promotions_venues.png" },
];

const USER_LINKS = [
  { href: "/u/dashboard",   label: "Dashboard",   icon: "/dashboard_users.png"   },
  { href: "/u/zones",       label: "Zones",       icon: "/zones_users.png"       },
  { href: "/u/wallet",      label: "Wallet",      icon: "/wallet_users.png"      },
  { href: "/u/buddies",     label: "Buddies",     icon: "/buddies_users.png"     },
  { href: "/u/inbox",       label: "Inbox",       icon: "/indox_users.png"       },
  { href: "/u/vote",        label: "Vote",        icon: "/vote_users.png"        },
  { href: "/u/leaderboard", label: "Leaderboard", icon: "/leaderboard_users.png" },
  { href: "/u/summary",     label: "Summary",     icon: "/summary_users.png"     },
];

const ADMIN_LINKS = [
  { href: "/admin/analytics",      label: "Analytics",      icon: "/analytics_admin.png"      },
  { href: "/admin/municipalities", label: "Municipalities", icon: "/municipalities_admin.png"  },
  { href: "/admin/zones",          label: "Zones",          icon: "/zones_admin.png"          },
  { href: "/admin/venues",         label: "Venues",         icon: "/venues_admin.png"         },
  { href: "/admin/users",          label: "Users",          icon: "/users_admin.png"          },
  { href: "/admin/cases",          label: "Cases",          icon: "/cases_admin.png"          },
];

interface SidebarLink { href: string; label: string; icon: string; }
interface SidebarProps {
  links:      SidebarLink[];
  path:       string;
  logo:       string;
  logoAlt:    string;
  logoHref:   string;
  accent:     string;
  accentDim:  string;
  topExtra?:  React.ReactNode;
  footExtra?: React.ReactNode;
}

function Sidebar({ links, path, logo, logoAlt, logoHref, accent, accentDim, topExtra, footExtra }: SidebarProps) {
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nav_open");
    if (saved === "1") setOpen(true);
    setMounted(true);
    document.body.style.paddingLeft = RAIL_W + "px";
    return () => { document.body.style.paddingLeft = ""; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    setOpen(o => {
      const next = !o;
      localStorage.setItem("nav_open", next ? "1" : "0");
      return next;
    });
  }

  function close() {
    setOpen(false);
    localStorage.setItem("nav_open", "0");
  }

  if (!mounted) return null;

  const w = open ? FULL_W : RAIL_W;

  return (
    <>
      {open && (
        <div onClick={close} style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
        }} />
      )}

      <aside style={{
        position: "fixed",
        left: 0, top: 0, bottom: 0,
        width: w,
        zIndex: 999,
        background: "var(--surface)",
        borderRight: `1.5px solid ${accent}44`,
        display: "flex",
        flexDirection: "column",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        boxShadow: open ? "4px 0 32px rgba(0,0,0,0.35)" : "2px 0 8px rgba(0,0,0,0.12)",
      }}>

        {/* Toggle + logo row */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          padding: open ? "12px 14px 8px" : "12px 0 8px",
          flexShrink: 0,
        }}>
          {open && (
            <Link href={logoHref} onClick={close} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={logoAlt} style={{ height: 44, width: "auto", objectFit: "contain" }} />
            </Link>
          )}
          <button onClick={toggle} title={open ? "Collapse" : "Expand"} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-text)", padding: 6, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {open
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>

        {/* Small logo (rail only) */}
        {!open && (
          <Link href={logoHref} onClick={close} style={{ display: "flex", justifyContent: "center", padding: "2px 0 10px", textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={logoAlt} style={{ height: 30, width: "auto", objectFit: "contain" }} />
          </Link>
        )}

        {/* Nav links */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 6px", overflowY: "auto", overflowX: "hidden" }}>
          {links.map(({ href, label, icon }) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link key={href} href={href} onClick={close} title={!open ? label : undefined} style={{
                display: "flex", alignItems: "center", gap: open ? 12 : 0,
                padding: open ? "9px 12px" : "9px 0",
                borderRadius: 12, textDecoration: "none",
                color: active ? accent : "var(--muted-text)",
                background: active ? accentDim : "transparent",
                fontWeight: active ? 700 : 500,
                fontSize: 14, whiteSpace: "nowrap",
                transition: "color 0.15s, background 0.15s",
                justifyContent: open ? "flex-start" : "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt={label} style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
                <span style={{
                  opacity: open ? 1 : 0,
                  maxWidth: open ? 160 : 0,
                  overflow: "hidden",
                  transition: "opacity 0.18s, max-width 0.22s",
                  display: "block",
                }}>{label}</span>
              </Link>
            );
          })}
          {topExtra}
        </nav>

        {/* Footer */}
        <div style={{
          padding: open ? "10px 14px" : "10px 0",
          display: "flex", alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          gap: 8, borderTop: "1px solid var(--border-soft)",
          flexShrink: 0,
        }}>
          <ThemeToggle />
          {open && footExtra}
        </div>
      </aside>
    </>
  );
}

/* Venue nav */
function VenueNav({ path }: { path: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasPIN,    setHasPIN]    = useState(false);

  useEffect(() => {
    fetch("/api/v/account")
      .then(r => r.json())
      .then(j => { if (j.user?.avatarUrl) setAvatarUrl(j.user.avatarUrl); })
      .catch(() => {});
    setHasPIN(!!localStorage.getItem("venue_pin"));
  }, []);

  function lockApp() { window.location.reload(); }
  const accountActive = path.startsWith("/v/account");

  const accountItem = (
    <Link href="/v/account" onClick={() => { localStorage.setItem("nav_open", "0"); }} title="Account"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderRadius: 12, textDecoration: "none", color: accountActive ? "#e7a8ff" : "var(--muted-text)", background: accountActive ? "rgba(231,168,255,0.13)" : "transparent", fontWeight: accountActive ? 700 : 500, fontSize: 14, whiteSpace: "nowrap", transition: "color 0.15s, background 0.15s", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      {avatarUrl
        ? <img src={avatarUrl} alt="Account" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #e7a8ff", flexShrink: 0 }} />  // eslint-disable-line @next/next/no-img-element
        : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(231,168,255,0.13)", border: "2px solid #e7a8ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e7a8ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
      }
    </Link>
  );

  const lockBtn = hasPIN ? (
    <button onClick={lockApp} title="Lock" style={{ background: "rgba(231,168,255,0.1)", border: "1px solid rgba(231,168,255,0.3)", borderRadius: 8, cursor: "pointer", padding: "5px 8px", fontSize: 15, color: "#e7a8ff", lineHeight: 1, display: "flex", alignItems: "center" }}>
      {String.fromCodePoint(0x1F512)}
    </button>
  ) : null;

  return <Sidebar links={VENUE_LINKS} path={path} logo="/logo_venues.png" logoAlt="Clicks Venues" logoHref="/v/dashboard" accent="#e7a8ff" accentDim="rgba(231,168,255,0.13)" topExtra={accountItem} footExtra={lockBtn} />;
}

/* User nav */
function UserNav({ path }: { path: string }) {
  const accountActive = path.startsWith("/u/account");
  const accountItem = (
    <Link href="/u/account" onClick={() => { localStorage.setItem("nav_open", "0"); }} title="Account"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderRadius: 12, textDecoration: "none", color: accountActive ? "#08daf4" : "var(--muted-text)", background: accountActive ? "rgba(8,218,244,0.12)" : "transparent", fontWeight: accountActive ? 700 : 500, fontSize: 14, whiteSpace: "nowrap", transition: "color 0.15s, background 0.15s", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(8,218,244,0.1)", border: "2px solid #08daf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08daf4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
    </Link>
  );
  return <Sidebar links={USER_LINKS} path={path} logo="/logo.png" logoAlt="Clicks" logoHref="/u/dashboard" accent="#08daf4" accentDim="rgba(8,218,244,0.12)" topExtra={accountItem} />;
}

/* Admin nav */
function AdminNav({ path }: { path: string }) {
  const logoutItem = (
    <a href="/api/auth/logout" title="Logout"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderRadius: 12, textDecoration: "none", color: "var(--muted-text)", background: "transparent", fontWeight: 500, fontSize: 14, whiteSpace: "nowrap", transition: "color 0.15s, background 0.15s", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logout_admin.png" alt="Logout" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
      <span style={{ opacity: 0, maxWidth: 0, overflow: "hidden", display: "block" }}>Logout</span>
    </a>
  );
  return <Sidebar links={ADMIN_LINKS} path={path} logo="/logo_admin.png" logoAlt="Clicks Admin" logoHref="/admin/analytics" accent="#8b5cf6" accentDim="rgba(139,92,246,0.14)" topExtra={logoutItem} />;
}

/* Main export */
export function Nav({ role }: { role: "u" | "v" | "admin" }) {
  const path = usePathname();
  if (role === "v") return <VenueNav path={path} />;
  if (role === "u") return <UserNav  path={path} />;
  return <AdminNav path={path} />;
}