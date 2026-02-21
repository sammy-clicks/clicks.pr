import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default async function Zones() {
  const zones = await prisma.zone.findMany({ orderBy: { name: "asc" } });
  const since = new Date(Date.now() - 120 * 60 * 1000);
  const counts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { startAt: { gte: since }, endAt: null },
    _count: { _all: true },
  });
  const venueCounts = new Map(counts.map(c => [c.venueId, c._count._all]));
  const venues = await prisma.venue.findMany({ select: { id: true, zoneId: true } });
  const zoneActive = new Map<string, number>();
  for (const v of venues)
    zoneActive.set(v.zoneId, (zoneActive.get(v.zoneId) || 0) + (venueCounts.get(v.id) || 0));
  const enriched = zones.map(z => ({ ...z, activeUsers: zoneActive.get(z.id) || 0 }));
  const max = Math.max(...enriched.map(z => z.activeUsers), 0);
  const result = enriched.map(z => ({ ...z, isDominant: z.activeUsers === max && max > 0 }));
  const weekLabel = `Week ${isoWeek(new Date())} \u2022 ${new Date().getFullYear()}`;

  return (
    <div className="container">
      <div className="header">
        <h2>Zones</h2>
        <span className="badge">{weekLabel}</span>
      </div>
      <Nav role="u" />
      <div className="row">
        {result.map(z => (
          <div key={z.id} className="card" style={{ flex: "1 1 280px", opacity: z.isEnabled ? 1 : 0.5 }}>
            <div className="header">
              <strong>{z.name}</strong>
              {z.isDominant && <span className="badge">&#128293; Live</span>}
            </div>
            <p className="muted">{z.activeUsers} active</p>
            {!z.isEnabled && <p className="muted">{z.disabledReason || "Disabled"}</p>}
            {z.isEnabled ? (
              <Link className="btn" href={`/u/zone/${z.id}`}>Explore</Link>
            ) : (
              <span className="badge">Disabled</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
