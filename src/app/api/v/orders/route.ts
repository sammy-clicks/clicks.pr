import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({ where: { managerId: session.sub } });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  const orders = await prisma.order.findMany({
    where: { venueId: venue.id },
    include: {
      items: true,
      user: { select: { username: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ venueName: venue.name, orders });
}
