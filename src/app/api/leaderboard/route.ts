import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "7d";

  function getPeriodSince(): Date | null {
    if (period === "24h") return new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (period === "7d")  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (period === "30d") return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return null; // lifetime
  }

  const periodSince = getPeriodSince();

  // Top zones by live crowd (sum checkins per zone) — always last 2h regardless of period
  const liveWindow = new Date(Date.now() - 120 * 60 * 1000);
  const checkinCounts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { startAt: { gte: liveWindow }, endAt: null },
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

  // Top users by clicks in selected period
  const clickCounts = await prisma.clickEvent.groupBy({
    by: ["userId"],
    where: periodSince ? { createdAt: { gte: periodSince } } : {},
    _count: { userId: true },
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
      return { rank: i + 1, id: u.id, username: u.username, avatarUrl: u.avatarUrl ?? null, clicks: c._count?.userId ?? 0 };
    });

  // Top spenders in selected period
  const spendCounts = await prisma.order.groupBy({
    by: ["userId"],
    where: periodSince
      ? { status: "COMPLETED", createdAt: { gte: periodSince } }
      : { status: "COMPLETED" },
    _sum: { totalCents: true },
    orderBy: { _sum: { totalCents: "desc" } },
    take: 20,
  });

  const spenderIds = spendCounts.map(s => s.userId).filter(Boolean) as string[];
  const spenderRows = await prisma.user.findMany({
    where: { id: { in: spenderIds }, ghostMode: false },
    select: { id: true, username: true, avatarUrl: true },
  });
  const spenderMap = new Map(spenderRows.map(u => [u.id, u]));
  const topSpenders = spendCounts
    .filter(s => s.userId && spenderMap.has(s.userId!))
    .map((s, i) => {
      const u = spenderMap.get(s.userId!)!;
      return { rank: i + 1, id: u.id, username: u.username, avatarUrl: u.avatarUrl ?? null, totalCents: s._sum?.totalCents ?? 0 };
    });

  return NextResponse.json({ topZones, topClickers, topSpenders, currentUserId: session.sub, period });
}
