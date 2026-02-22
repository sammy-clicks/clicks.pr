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
          ["/u/account", "Account"],
        ]
      : role === "v"
      ? [
          ["/v/dashboard", "Dashboard"],
          ["/v/menu", "Menu"],
          ["/v/orders", "Orders"],
          ["/v/promotions", "Promotions"],
          ["/v/account", "Account"],
        ]
      : [
          ["/admin/analytics", "Analytics"],
          ["/admin/municipalities", "Municipalities"],
          ["/admin/zones", "Zones"],
          ["/admin/venues", "Venues"],
          ["/admin/users", "Users"],
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
      {role === "admin" && <a className="badge" href="/api/auth/logout">Logout</a>}
    </nav>
  );
}
