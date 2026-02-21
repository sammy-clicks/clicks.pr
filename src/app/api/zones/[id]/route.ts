import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const zone = await prisma.zone.findUnique({ where: { id: params.id }});
  if (!zone) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!zone.isEnabled) {
    return NextResponse.json({ zone: { ...zone, activeUsers: 0 }, venues: [] });
  }

  const venues = await prisma.venue.findMany({ where: { zoneId: zone.id }, orderBy: { name: "asc" }});
  const since = new Date(Date.now() - 120*60*1000);
  const counts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { startAt: { gte: since }, endAt: null },
    _count: { _all: true },
  });
  const map = new Map(counts.map(c=>[c.venueId, c._count._all]));
  const activeUsers = venues.reduce((sum,v)=>sum+(map.get(v.id)||0),0);

  const crowdLevel = (n: number) => Math.min(10, Math.max(1, Math.ceil(n/2))); // placeholder scaling

  return NextResponse.json({
    zone: { ...zone, activeUsers },
    venues: venues.map(v => ({
      ...v,
      activeUsers: map.get(v.id) || 0,
      crowdLevel: v.plan === "PRO" ? crowdLevel(map.get(v.id)||0) : crowdLevel(map.get(v.id)||0),
    })),
  });
}
