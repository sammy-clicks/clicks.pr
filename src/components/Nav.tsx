import Link from "next/link";

export function Nav({ role }: { role: "u" | "v" | "admin" }) {
  const links =
    role === "u"
      ? [
          ["/u/zones", "Zones"],
          ["/u/wallet", "Wallet"],
          ["/u/buddies", "Buddies"],
          ["/u/vote", "Vote"],
          ["/u/leaderboard", "Leaderboard"],
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
    <div className="nav">
      {links.map(([href, label]) => (
        <Link key={href} className="badge" href={href}>
          {label}
        </Link>
      ))}
      <Link className="badge" href="/api/auth/logout">Logout</Link>
    </div>
  );
}
