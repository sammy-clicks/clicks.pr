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
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              {v.venueImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.venueImageUrl} alt={v.name} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid #08daf4", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(8,218,244,0.1)", border: "2px solid #08daf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#08daf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
              )}
              <div>
                <strong style={{ display: "block" }}>{v.name}</strong>
                <span className="badge" style={{ fontSize: 11 }}>{v.type}</span>
              </div>
            </div>
            <p className="muted" style={{ margin: "0 0 4px" }}>{v.description || ""}</p>
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
