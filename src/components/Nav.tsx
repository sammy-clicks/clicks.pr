"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ role }: { role: "u" | "v" | "admin" }) {
  const path = usePathname();

  const links: [string, string][] =
    role === "u"
      ? [
          ["/u/zones", "Zones"],
          ["/u/wallet", "Wallet"],
          ["/u/buddies", "Buddies"],
          ["/u/vote", "Vote"],
          ["/u/leaderboard", "Leaderboard"],
          ["/u/summary", "Summary"],
        ]
      : role === "v"
      ? [
          ["/v/dashboard", "Dashboard"],
          ["/v/menu", "Menu"],
          ["/v/orders", "Orders"],
        ]
      : [
          ["/admin/analytics", "Analytics"],
          ["/admin/municipalities", "Municipalities"],
          ["/admin/zones", "Zones"],
          ["/admin/venues", "Venues"],
        ];

  return (
    <nav className="nav">
      {links.map(([href, label]) => (
        <Link
          key={href}
          className={`badge${path === href || path.startsWith(href + "/") ? " active" : ""}`}
          href={href}
        >
          {label}
        </Link>
      ))}
      <a className="badge" href="/api/auth/logout">Logout</a>
    </nav>
  );
}
