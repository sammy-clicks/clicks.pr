import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ZonePage({ params }: { params: { id: string } }) {
  const zone = await prisma.zone.findUnique({ where: { id: params.id } });
  if (!zone) notFound();

  let venues: any[] = [];
  let activeUsers = 0;

  if (zone.isEnabled) {
    const raw = await prisma.venue.findMany({ where: { zoneId: zone.id }, orderBy: { name: "asc" } });
    const since = new Date(Date.now() - 120 * 60 * 1000);
    const counts = await prisma.checkIn.groupBy({
      by: ["venueId"],
      where: { startAt: { gte: since }, endAt: null },
      _count: { _all: true },
    });
    const map = new Map(counts.map(c => [c.venueId, c._count._all]));
    activeUsers = raw.reduce((s, v) => s + (map.get(v.id) || 0), 0);
    const crowdLevel = (n: number) => Math.min(10, Math.ceil(n / 2) || 0);
    venues = raw.map(v => ({ ...v, activeUsers: map.get(v.id) || 0, crowdLevel: crowdLevel(map.get(v.id) || 0) }));
  }

  return (
    <div className="container">
      <div className="header">
        <h2>{zone.name}</h2>
        <span className="badge">{activeUsers} active</span>
      </div>
      <Nav role="u" />
      {!zone.isEnabled && <p className="muted">{zone.disabledReason || "This zone is currently disabled."}</p>}
      <div className="row">
        {venues.map(v => (
          <div key={v.id} className="card" style={{ flex: "1 1 320px" }}>
            <div className="header">
              <strong>{v.name}</strong>
              <span className="badge">{v.type}</span>
            </div>
            <p className="muted">{v.description || ""}</p>
            <p className="muted">Crowd {v.crowdLevel}/10</p>
            <div className="row">
              <Link className="btn" href={`/u/venue/${v.id}`}>View</Link>
              <a className="btn secondary" href={`https://www.google.com/maps?q=${v.lat},${v.lng}`} target="_blank">Maps</a>
            </div>
          </div>
        ))}
        {venues.length === 0 && zone.isEnabled && <p className="muted">No venues in this zone yet.</p>}
      </div>
    </div>
  );
}
