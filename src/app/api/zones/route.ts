import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const zones = await prisma.zone.findMany({ orderBy: { name: "asc" }});
  // Active users per zone: count of checkins without endAt within last 120 mins
  const since = new Date(Date.now() - 120*60*1000);
  const counts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { startAt: { gte: since }, endAt: null },
    _count: { _all: true },
  });
  const venueCounts = new Map(counts.map(c => [c.venueId, c._count._all]));
  const venues = await prisma.venue.findMany({ select: { id: true, zoneId: true }});
  const zoneActive = new Map<string, number>();
  for (const v of venues) zoneActive.set(v.zoneId, (zoneActive.get(v.zoneId) || 0) + (venueCounts.get(v.id) || 0));

  const enriched = zones.map(z => ({
    ...z,
    activeUsers: zoneActive.get(z.id) || 0,
  }));

  // Dominant = max activeUsers
  const max = Math.max(...enriched.map(z=>z.activeUsers), 0);
  const result = enriched.map(z => ({...z, isDominant: z.activeUsers === max && max > 0}));

  // week label (ISO week)
  const now = new Date();
  const weekLabel = `Week ${isoWeek(now)} • ${now.getFullYear()}`;

  return NextResponse.json({ zones: result, weekLabel });
}

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
