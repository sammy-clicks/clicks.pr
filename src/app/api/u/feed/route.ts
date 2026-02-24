import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// Hot-venues feed: venues ranked by recent activity (clicks + check-ins + crowd level)
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 2 * 60 * 60 * 1000); // last 2 hours

  const [venues, checkInCounts, clickCounts] = await Promise.all([
    prisma.venue.findMany({
      where: { isEnabled: true },
      select: {
        id: true,
        name: true,
        type: true,
        venueImageUrl: true,
        crowdLevel: true,
        address: true,
        boostActiveUntil: true,
        zone: { select: { id: true, name: true } },
      },
    }),
    prisma.checkIn.groupBy({
      by: ["venueId"],
      where: { startAt: { gte: since }, endAt: null },
      _count: { _all: true },
    }),
    prisma.clickEvent.groupBy({
      by: ["venueId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const checkInMap = new Map(checkInCounts.map(c => [c.venueId, c._count._all]));
  const clickMap   = new Map(clickCounts.map(c => [c.venueId, c._count._all]));
  const now        = new Date();

  const enriched = venues.map(v => {
    const liveCheckins = checkInMap.get(v.id) ?? 0;
    const recentClicks = clickMap.get(v.id) ?? 0;
    const isBoosted    = v.boostActiveUntil ? v.boostActiveUntil > now : false;
    const hotness      = liveCheckins * 4 + recentClicks * 2 + v.crowdLevel + (isBoosted ? 10 : 0);
    return { ...v, liveCheckins, recentClicks, isBoosted, hotness };
  });

  // Sort by hotness, take top 12
  enriched.sort((a, b) => b.hotness - a.hotness);
  const hot    = enriched.slice(0, 12);

  // Also return user's last check-in zone for "Your Zone" section
  const lastCheckin = await prisma.checkIn.findFirst({
    where: { userId: session.sub },
    orderBy: { startAt: "desc" },
    select: { venue: { select: { zoneId: true, zone: { select: { name: true } } } } },
  });

  return NextResponse.json({ hot, lastZoneId: lastCheckin?.venue?.zoneId ?? null, lastZoneName: lastCheckin?.venue?.zone?.name ?? null });
}
