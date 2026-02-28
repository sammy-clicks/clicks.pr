"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

// Fire-and-forget server warm-up — prevents cold-start delays on first button click
if (typeof window !== "undefined") {
  void fetch("/api/ping").catch(() => {});
}

const FULL_W = 260;

/*  Nav link definition  */
interface NavLinkDef {
  href:     string;
  label:    string;
  icon:     string | React.ReactNode;  // img path OR custom JSX
  external?: boolean;                  // renders <a> instead of <Link>
  isBtn?:   boolean;                   // renders <button>
  onClick?: () => void;
  badge?:   number;                    // unread / notification count
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
    <span style={{ opacity: 1, display: "flex", alignItems: "center", gap: 7, overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{def.label}</span>
      {def.badge != null && def.badge > 0 && (
        <span style={{
          minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9,
          background: accent, color: "#000", fontSize: 11, fontWeight: 800,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, lineHeight: 1,
        }}>
          {def.badge > 9 ? "10+" : def.badge}
        </span>
      )}
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
  links:       NavLinkDef[];
  path:        string;
  logo:        string;
  logoHref:    string;
  accent:      string;
  accentDim:   string;
  totalBadge?: number;
}

function Sidebar({ links, path, logo, logoHref, accent, accentDim, totalBadge = 0 }: SidebarProps) {
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
        {!open && totalBadge > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 17, height: 17, padding: "0 4px",
            borderRadius: 9, background: accent, color: "#000",
            fontSize: 10, fontWeight: 800, lineHeight: "17px",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>{totalBadge > 9 ? "10+" : totalBadge}</span>
        )}
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

  useEffect(() => {
    fetch("/api/v/account").then(r => r.json())
      .then(j => { if (j.user?.avatarUrl) setAvatarUrl(j.user.avatarUrl); }).catch(() => {});
  }, []);

  const acctIcon = avatarUrl
    ? <img src={avatarUrl} alt="Account" style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", border:"2px solid #e7a8ff", flexShrink:0 }} />  // eslint-disable-line @next/next/no-img-element
    : <PersonIcon color="#e7a8ff" />;

  const links: NavLinkDef[] = [
    ...VENUE_BASE_LINKS,
    { href: "/v/account", label: "Account", icon: acctIcon },
  ];

  return <Sidebar links={links} path={path} logo="/logo_venues.png" logoHref="/v/dashboard" accent="#e7a8ff" accentDim="rgba(231,168,255,0.13)" />;
}

/*  User nav  */
const USER_BASE_LINKS: Omit<NavLinkDef, "badge">[] = [
  { href: "/u/dashboard",   label: "Dashboard",   icon: "/dashboard_users.png"   },
  { href: "/u/zones",       label: "Zones",       icon: "/zones_users.png"       },
  { href: "/u/wallet",      label: "Wallet",      icon: "/wallet_users.png"      },
  { href: "/u/buddies",     label: "Buddies",     icon: "/buddies_users.png"     },
  { href: "/u/inbox",       label: "Inbox",       icon: "/indox_users.png"       },
  { href: "/u/vote",        label: "Vote",        icon: "/vote_users.png"        },
  { href: "/u/leaderboard", label: "Leaderboard", icon: "/leaderboard_users.png" },
  { href: "/u/summary",     label: "Summary",     icon: "/summary_users.png"     },
];

type Banner = { key: string; text: string; href: string; accent: string };

function UserNav({ path }: { path: string }) {
  const [unread,       setUnread]       = useState(0);          // inbox
  const [buddyPending, setBuddyPending] = useState(0);          // buddy requests
  const [walletNew,    setWalletNew]    = useState(0);          // new wallet transfers
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  const [banner,       setBanner]       = useState<Banner | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevInbox   = useRef(0);
  const prevBuddy   = useRef(0);
  const prevWallet  = useRef(0);

  function showBanner(b: Banner) {
    setBanner(b);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 5000);
  }

  useEffect(() => {
    // fetch avatar
    fetch("/api/u/profile").then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.user?.avatarUrl) setAvatarUrl(j.user.avatarUrl); }).catch(() => {});

    const WALLET_KEY = "clicks_wallet_last_seen";

    async function poll() {
      // inbox unread
      try {
        const j = await fetch("/api/u/inbox/unread").then(r => r.ok ? r.json() : { count: 0 });
        const c = j.count ?? 0;
        if (c > prevInbox.current && prevInbox.current >= 0) {
          showBanner({ key: "inbox", text: "💬 New message in your Inbox", href: "/u/inbox", accent: "#08daf4" });
        }
        prevInbox.current = c;
        setUnread(c);
      } catch { /* ignore */ }

      // buddies pending
      try {
        const j = await fetch("/api/buddies").then(r => r.ok ? r.json() : { requests: [] });
        const c = (j.requests ?? []).length;
        if (c > prevBuddy.current) {
          showBanner({ key: "buddies", text: `👥 You have ${c} buddy request${c !== 1 ? "s" : ""}`, href: "/u/buddies", accent: "#a78bfa" });
        }
        prevBuddy.current = c;
        setBuddyPending(c);
      } catch { /* ignore */ }

      // wallet new transfers
      try {
        const lastSeen = parseInt(localStorage.getItem(WALLET_KEY) || "0", 10);
        const j = await fetch("/api/wallet").then(r => r.ok ? r.json() : { txns: [] });
        const newTransfers = (j.txns ?? []).filter(
          (t: any) => t.type === "TRANSFER_IN" && new Date(t.createdAt).getTime() > lastSeen
        );
        const c = newTransfers.length;
        if (c > prevWallet.current && lastSeen > 0) {
          showBanner({ key: "wallet", text: `💸 You received money in your Wallet`, href: "/u/wallet", accent: "#2ecc71" });
        }
        prevWallet.current = c;
        setWalletNew(c);
        // Update last seen to now so next poll won't re-trigger
        if (c > 0 && lastSeen === 0) localStorage.setItem(WALLET_KEY, String(Date.now()));
      } catch { /* ignore */ }
    }

    poll();
    const id = setInterval(poll, 30_000);
    return () => { clearInterval(id); if (bannerTimer.current) clearTimeout(bannerTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark wallet as seen when user visits /u/wallet
  useEffect(() => {
    if (path === "/u/wallet") {
      localStorage.setItem("clicks_wallet_last_seen", String(Date.now()));
      setWalletNew(0);
      prevWallet.current = 0;
    }
    if (path === "/u/buddies") {
      setBuddyPending(0);
      prevBuddy.current = 0;
    }
  }, [path]);

  const acctIcon = avatarUrl
    ? <img src={avatarUrl} alt="Account" style={{ width:30, height:30, borderRadius:"50%", objectFit:"cover", border:"2px solid #08daf4", flexShrink:0 }} />  // eslint-disable-line @next/next/no-img-element
    : <PersonIcon color="#08daf4" />;

  const links: NavLinkDef[] = [
    ...USER_BASE_LINKS.map(l => {
      if (l.href === "/u/inbox")   return { ...l, badge: unread };
      if (l.href === "/u/buddies") return { ...l, badge: buddyPending };
      if (l.href === "/u/wallet")  return { ...l, badge: walletNew };
      return l;
    }),
    { href: "/u/account", label: "Account", icon: acctIcon },
  ];

  const totalBadge = unread + buddyPending + walletNew;

  return (
    <>
      <Sidebar links={links} path={path} logo="/logo.png" logoHref="/u/dashboard" accent="#08daf4" accentDim="rgba(8,218,244,0.12)" totalBadge={totalBadge} />

      {/* Toast banner */}
      {banner && (
        <Link href={banner.href} onClick={() => setBanner(null)} style={{ textDecoration: "none" }}>
          <div style={{
            position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
            zIndex: 1300, maxWidth: 340, width: "calc(100% - 32px)",
            background: "var(--surface)", borderRadius: 14,
            border: `1.5px solid ${banner.accent}66`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${banner.accent}22`,
            padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
            cursor: "pointer",
            animation: "slideDown 0.3s ease",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: banner.accent, flexShrink: 0, boxShadow: `0 0 6px ${banner.accent}` }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{banner.text}</span>
            <button onClick={e => { e.preventDefault(); setBanner(null); }}
              style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 16, color: "var(--muted-text)", cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
          </div>
        </Link>
      )}
      <style>{`@keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </>
  );
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