"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const FULL_W = 260;

/*  Nav link definition  */
interface NavLinkDef {
  href:     string;
  label:    string;
  icon:     string | React.ReactNode;  // img path OR custom JSX
  external?: boolean;                  // renders <a> instead of <Link>
  isBtn?:   boolean;                   // renders <button>
  onClick?: () => void;
}

/*  Shared item renderer  */
function NavItem({ def, open, active, accent, accentDim, onNav }: {
  def: NavLinkDef; open: boolean; active: boolean;
  accent: string; accentDim: string; onNav: () => void;
}) {
  const iconEl = typeof def.icon === "string"
    ? <img src={def.icon} alt={def.label} style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0 }} />
    : def.icon;

  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 14,
    padding: "10px 14px", borderRadius: 12, textDecoration: "none",
    color: active ? accent : "var(--muted-text)",
    background: active ? accentDim : "transparent",
    fontWeight: active ? 700 : 500, fontSize: 14,
    whiteSpace: "nowrap", transition: "color 0.15s, background 0.15s",
    overflow: "hidden", flexShrink: 0, width: "100%",
    boxSizing: "border-box" as const,
  };

  const label = (
    <span style={{ opacity: 1, display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
      {def.label}
    </span>
  );

  if (def.isBtn && def.onClick) {
    return (
      <button onClick={() => { def.onClick!(); onNav(); }}
        style={{ ...base, border: "none", cursor: "pointer", textAlign: "left", background: active ? accentDim : "transparent" }}>
        {iconEl}{label}
      </button>
    );
  }
  if (def.external) {
    return <a href={def.href} style={base}>{iconEl}{label}</a>;
  }
  return (
    <Link href={def.href} onClick={onNav} style={base}>
      {iconEl}{label}
    </Link>
  );
}

/*  Core Sidebar  */
interface SidebarProps {
  links:     NavLinkDef[];
  path:      string;
  logo:      string;
  logoHref:  string;
  accent:    string;
  accentDim: string;
}

function Sidebar({ links, path, logo, logoHref, accent, accentDim }: SidebarProps) {
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nav_open");
    if (saved === "1") setOpen(true);
    setMounted(true);
    document.body.style.paddingTop = "52px";
    return () => { document.body.style.paddingTop = ""; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() { setOpen(o => { const n = !o; localStorage.setItem("nav_open", n?"1":"0"); return n; }); }
  function close()  { setOpen(false); localStorage.setItem("nav_open","0"); }

  if (!mounted) return null;

  return (
    <>
      {/*  Floating trigger (always visible)  */}
      <button onClick={toggle} title="Menu" style={{
        position: "fixed", top: 8, left: 10, zIndex: 990,
        background: "var(--surface)", border: `1.5px solid ${accent}55`,
        borderRadius: 10, width: 38, height: 38,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: open ? accent : "var(--muted-text)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
        transition: "color 0.15s, border-color 0.15s",
      }}>
        {open
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        }
      </button>

      {/*  Backdrop  */}
      {open && (
        <div onClick={close} style={{
          position: "fixed", inset: 0, zIndex: 994,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)",
        }} />
      )}

      {/*  Sidebar panel  */}
      <aside style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: FULL_W, zIndex: 995,
        background: "var(--surface)",
        borderRight: `1.5px solid ${accent}44`,
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: open ? "6px 0 40px rgba(0,0,0,0.45)" : "none",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px 12px", flexShrink: 0,
          borderBottom: `1px solid ${accent}22`,
        }}>
          <Link href={logoHref} onClick={close} style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="Logo" style={{ height: 38, width: "auto", objectFit: "contain" }} />
          </Link>
          <button onClick={close} title="Close" style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-text)", padding: 6, borderRadius: 8,
            display: "flex", alignItems: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Links */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "8px 8px", overflowY: "auto" }}>
          {links.map(def => {
            const active = def.href.length > 1
              ? path === def.href || path.startsWith(def.href + "/")
              : path === def.href;
            return (
              <NavItem key={def.isBtn ? def.label : def.href}
                def={def} open={open} active={active}
                accent={accent} accentDim={accentDim} onNav={close} />
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: "12px 16px", borderTop: `1px solid ${accent}22`,
          display: "flex", alignItems: "center", flexShrink: 0,
        }}>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}

/* 
   Icon helpers
 */
function PersonIcon({ color }: { color: string }) {
  return (
    <div style={{ width:30, height:30, borderRadius:"50%", background:`${color}18`, border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, border:`2px solid ${color}66`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
  );
}

/*  Venue nav  */
const VENUE_BASE_LINKS: NavLinkDef[] = [
  { href: "/v/dashboard",  label: "Dashboard",  icon: "/dashboard_venues.png"  },
  { href: "/v/menu",       label: "Menu",       icon: "/menu_venues.png"       },
  { href: "/v/orders",     label: "Orders",     icon: "/orders_venues.png"     },
  { href: "/v/promotions", label: "Promotions", icon: "/promotions_venues.png" },
];

function VenueNav({ path }: { path: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasPIN,    setHasPIN]    = useState(false);

  useEffect(() => {
    fetch("/api/v/account").then(r => r.json())
      .then(j => { if (j.user?.avatarUrl) setAvatarUrl(j.user.avatarUrl); }).catch(() => {});
    setHasPIN(!!localStorage.getItem("venue_pin"));
  }, []);

  const acctIcon = avatarUrl
    ? <img src={avatarUrl} alt="Account" style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", border:"2px solid #e7a8ff", flexShrink:0 }} />  // eslint-disable-line @next/next/no-img-element
    : <PersonIcon color="#e7a8ff" />;

  const links: NavLinkDef[] = [
    ...VENUE_BASE_LINKS,
    { href: "/v/account", label: "Account", icon: acctIcon },
    ...(hasPIN ? [{ href: "#", label: "Lock app", icon: <LockIcon color="#e7a8ff" />, isBtn: true, onClick: () => window.location.reload() }] : []),
  ];

  return <Sidebar links={links} path={path} logo="/logo_venues.png" logoHref="/v/dashboard" accent="#e7a8ff" accentDim="rgba(231,168,255,0.13)" />;
}

/*  User nav  */
const USER_LINKS: NavLinkDef[] = [
  { href: "/u/dashboard",   label: "Dashboard",   icon: "/dashboard_users.png"   },
  { href: "/u/zones",       label: "Zones",       icon: "/zones_users.png"       },
  { href: "/u/wallet",      label: "Wallet",      icon: "/wallet_users.png"      },
  { href: "/u/buddies",     label: "Buddies",     icon: "/buddies_users.png"     },
  { href: "/u/inbox",       label: "Inbox",       icon: "/indox_users.png"       },
  { href: "/u/vote",        label: "Vote",        icon: "/vote_users.png"        },
  { href: "/u/leaderboard", label: "Leaderboard", icon: "/leaderboard_users.png" },
  { href: "/u/summary",     label: "Summary",     icon: "/summary_users.png"     },
  { href: "/u/account",     label: "Account",     icon: <PersonIcon color="#08daf4" /> },
];

function UserNav({ path }: { path: string }) {
  return <Sidebar links={USER_LINKS} path={path} logo="/logo.png" logoHref="/u/dashboard" accent="#08daf4" accentDim="rgba(8,218,244,0.12)" />;
}

/*  Admin nav  */
const ADMIN_LINKS: NavLinkDef[] = [
  { href: "/admin/analytics",      label: "Analytics",      icon: "/analytics_admin.png"      },
  { href: "/admin/municipalities", label: "Municipalities", icon: "/municipalities_admin.png"  },
  { href: "/admin/zones",          label: "Zones",          icon: "/zones_admin.png"          },
  { href: "/admin/venues",         label: "Venues",         icon: "/venues_admin.png"         },
  { href: "/admin/users",          label: "Users",          icon: "/users_admin.png"          },
  { href: "/admin/cases",          label: "Cases",          icon: "/cases_admin.png"          },
  { href: "/api/auth/logout",      label: "Logout",         icon: "/logout_admin.png", external: true },
];

function AdminNav({ path }: { path: string }) {
  return <Sidebar links={ADMIN_LINKS} path={path} logo="/logo_admin.png" logoHref="/admin/analytics" accent="#8b5cf6" accentDim="rgba(139,92,246,0.14)" />;
}

/*  Export  */
export function Nav({ role }: { role: "u" | "v" | "admin" }) {
  const path = usePathname();
  if (role === "v") return <VenueNav path={path} />;
  if (role === "u") return <UserNav  path={path} />;
  return <AdminNav path={path} />;
}