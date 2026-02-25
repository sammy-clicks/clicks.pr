import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 120 * 60 * 1000);

  // Top zones by live crowd (sum checkins per zone)
  const checkinCounts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { startAt: { gte: since }, endAt: null },
    _count: { _all: true },
  });

  const venueIds = checkinCounts.map(c => c.venueId);
  const venueRows = await prisma.venue.findMany({
    where: { id: { in: venueIds } },
    select: { id: true, name: true, type: true, zoneId: true, zone: { select: { id: true, name: true, imageUrl: true } } },
  });
  const venueMap = new Map(venueRows.map(v => [v.id, v]));

  // Group checkins by zone
  const zoneMap = new Map<string, { id: string; name: string; imageUrl: string | null; crowd: number; venueCount: number }>();
  for (const c of checkinCounts) {
    const v = venueMap.get(c.venueId);
    if (!v || !v.zone) continue;
    const zid = v.zone.id;
    const existing = zoneMap.get(zid);
    if (existing) {
      existing.crowd += c._count._all;
      existing.venueCount++;
    } else {
      zoneMap.set(zid, { id: zid, name: v.zone.name, imageUrl: v.zone.imageUrl ?? null, crowd: c._count._all, venueCount: 1 });
    }
  }
  const topZones = Array.from(zoneMap.values()).sort((a, b) => b.crowd - a.crowd).slice(0, 5);

  // Top users by clicks this week
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const clickCounts = await prisma.clickEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: weekStart } },
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
    take: 20,
  });

  const userIds = clickCounts.map(c => c.userId);
  const userRows = await prisma.user.findMany({
    where: { id: { in: userIds }, ghostMode: false },
    select: { id: true, username: true, avatarUrl: true },
  });
  const userMap = new Map(userRows.map(u => [u.id, u]));
  const topClickers = clickCounts
    .filter(c => userMap.has(c.userId))
    .map((c, i) => {
      const u = userMap.get(c.userId)!;
      return { rank: i + 1, id: u.id, username: u.username, avatarUrl: u.avatarUrl ?? null, clicks: c._count._all };
    });

  return NextResponse.json({ topZones, topClickers, currentUserId: session.sub });
}
