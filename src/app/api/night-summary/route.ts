import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

function getNightWindowStart(): Date {
  // Night window starts at 6pm PR time (UTC-4 = 22:00 UTC)
  const now = new Date();
  const prMs = now.getTime() - 4 * 60 * 60 * 1000;
  const prDate = new Date(prMs);
  const hoursPR = prDate.getUTCHours();

  // If before 3pm PR time, use previous evening's window
  const start = new Date(prDate);
  start.setUTCHours(22, 0, 0, 0); // 6pm PR = 22:00 UTC
  if (hoursPR < 15) {
    start.setUTCDate(start.getUTCDate() - 1);
  }
  return start;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nightStart = getNightWindowStart();

  const checkins = await prisma.checkIn.findMany({
    where: { userId: session.sub, startAt: { gte: nightStart } },
    include: { venue: { select: { name: true, type: true } } },
    orderBy: { startAt: "asc" },
  });

  const orders = await prisma.order.findMany({
    where: { userId: session.sub, createdAt: { gte: nightStart } },
    include: { items: true, venue: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const clicks = await prisma.clickEvent.count({
    where: { userId: session.sub, createdAt: { gte: nightStart } },
  });

  const totalSpent = orders.reduce((s, o) => s + o.totalCents, 0);

  return NextResponse.json({
    nightStart,
    checkins: checkins.map(c => ({
      id: c.id,
      venueName: c.venue.name,
      venueType: c.venue.type,
      startAt: c.startAt,
      endAt: c.endAt,
    })),
    orders: orders.map(o => ({
      id: o.id,
      venueName: o.venue.name,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
      itemCount: o.items.reduce((s, i) => s + i.qty, 0),
    })),
    clicks,
    totalSpentCents: totalSpent,
  });
}
