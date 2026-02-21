import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const since = new Date(Date.now() - 120 * 60 * 1000);

  // Top venues by live crowd
  const checkinCounts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { startAt: { gte: since }, endAt: null },
    _count: { _all: true },
    orderBy: { _count: { venueId: "desc" } },
    take: 10,
  });

  const venueIds = checkinCounts.map(c => c.venueId);
  const venueRows = await prisma.venue.findMany({
    where: { id: { in: venueIds } },
    select: { id: true, name: true, type: true },
  });
  const venueMap = new Map(venueRows.map(v => [v.id, v]));
  const topVenues = checkinCounts.map(c => ({
    venueId: c.venueId,
    name: venueMap.get(c.venueId)?.name ?? "Unknown",
    type: venueMap.get(c.venueId)?.type ?? "",
    crowd: c._count._all,
  }));

  // Top users by clicks this week
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const clickCounts = await prisma.clickEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: weekStart } },
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
    take: 10,
  });

  const userIds = clickCounts.map(c => c.userId);
  const userRows = await prisma.user.findMany({
    where: { id: { in: userIds }, ghostMode: false },
    select: { id: true, firstName: true, lastName: true },
  });
  const userMap = new Map(userRows.map(u => [u.id, u]));
  const topClickers = clickCounts
    .filter(c => userMap.has(c.userId))
    .map((c, i) => {
      const u = userMap.get(c.userId)!;
      return { rank: i + 1, name: `${u.firstName} ${u.lastName[0]}.`, clicks: c._count._all };
    });

  return NextResponse.json({ topVenues, topClickers });
}
