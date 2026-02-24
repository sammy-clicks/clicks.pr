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
  const zones = await prisma.zone.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isEnabled: true, disabledReason: true, imageUrl: true } });
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
          <div key={z.id} style={{ flex: "1 1 280px", opacity: z.isEnabled ? 1 : 0.5 }}>
            {z.isEnabled ? (
              <Link href={`/u/zone/${z.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div style={{
                  position: "relative", borderRadius: 16, overflow: "hidden",
                  height: 160, background: z.imageUrl ? "#111" : "var(--surface)",
                  border: "1.5px solid var(--border)",
                  boxShadow: z.isDominant ? "0 0 0 2px #08daf4, 0 8px 24px rgba(8,218,244,0.2)" : "none",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  cursor: "pointer",
                }}>
                  {z.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={z.imageUrl} alt={z.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                  )}
                  {/* Gradient overlay */}
                  <div style={{ position: "absolute", inset: 0, background: z.imageUrl ? "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)" : "transparent" }} />
                  {/* Content */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: 17, fontWeight: 800, color: z.imageUrl ? "#fff" : "var(--ink)", textShadow: z.imageUrl ? "0 1px 4px rgba(0,0,0,0.6)" : undefined }}>
                        {z.name}
                      </strong>
                      {z.isDominant && <span className="badge" style={{ fontSize: 11 }}>&#128293; Live</span>}
                    </div>
                    <div style={{ fontSize: 12, color: z.imageUrl ? "rgba(255,255,255,0.75)" : "var(--muted-text)", marginTop: 3 }}>
                      {z.activeUsers} active
                    </div>
                  </div>
                  {!z.imageUrl && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50%" }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted-text)" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div style={{
                borderRadius: 16, overflow: "hidden",
                height: 120, background: "var(--surface)",
                border: "1.5px solid var(--border)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6,
              }}>
                <strong style={{ fontSize: 15 }}>{z.name}</strong>
                <span className="badge">Disabled</span>
                {z.disabledReason && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{z.disabledReason}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
