import { NextResponse } from "next/server";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since = new Date(Date.now() - 120 * 60 * 1000); // last 2h for crowd

  const [
    totalUsers,
    totalVenues,
    signupsLastWeek,
    checkinsLastWeek,
    checkinsToday,
    clicksLastWeek,
    clicksToday,
    activeNow,
    weeklyVotes,
    zoneActivity,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.venue.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.checkIn.count({ where: { startAt: { gte: weekAgo } } }),
    prisma.checkIn.count({ where: { startAt: { gte: dayAgo } } }),
    prisma.clickEvent.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.clickEvent.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.checkIn.count({ where: { endAt: null, startAt: { gte: since } } }),
    prisma.vote.groupBy({
      by: ["venueId"],
      _count: { _all: true },
      orderBy: { _count: { venueId: "desc" } },
      take: 5,
    }),
    prisma.zone.findMany({
      select: {
        id: true,
        name: true,
        isEnabled: true,
        venues: { select: { id: true } },
      },
    }),
  ]);

  // Enrich weekly votes with venue names
  const topVenueIds = weeklyVotes.map(v => v.venueId);
  const topVenueRows = await prisma.venue.findMany({
    where: { id: { in: topVenueIds } },
    select: { id: true, name: true },
  });
  const venueMap = new Map(topVenueRows.map(v => [v.id, v.name]));
  const topVotes = weeklyVotes.map(v => ({
    venueId: v.venueId,
    name: venueMap.get(v.venueId) ?? "Unknown",
    votes: v._count._all,
  }));

  // Active users per zone (last 2h)
  const zoneVenueMap = new Map(zoneActivity.map(z => [z.id, z.venues.map(v => v.id)]));
  const activeByCounts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { endAt: null, startAt: { gte: since } },
    _count: { _all: true },
  });
  const activeByVenue = new Map(activeByCounts.map(c => [c.venueId, c._count._all]));
  const zones = zoneActivity.map(z => ({
    name: z.name,
    isEnabled: z.isEnabled,
    active: (zoneVenueMap.get(z.id) || []).reduce((s, vid) => s + (activeByVenue.get(vid) || 0), 0),
  }));

  return NextResponse.json({
    totals: { users: totalUsers, venues: totalVenues, activeNow },
    week: { signups: signupsLastWeek, checkins: checkinsLastWeek, clicks: clicksLastWeek },
    today: { checkins: checkinsToday, clicks: clicksToday },
    topVotes,
    zones,
  });
}
