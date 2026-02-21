import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";
import { haversineMiles } from "@/lib/geo";

export const dynamic = 'force-dynamic';

const Schema = z.object({
  venueId: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

const CHECKIN_RADIUS_MILES = 1.0;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());
  if (body.lat == null || body.lng == null) return NextResponse.json({ error: "Location required" }, { status: 400 });

  const venue = await prisma.venue.findUnique({ where: { id: body.venueId }});
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const dist = haversineMiles(body.lat, body.lng, venue.lat, venue.lng);
  if (dist > CHECKIN_RADIUS_MILES) return NextResponse.json({ error: "Too far to check in" }, { status: 403 });

  // End any active check-in
  await prisma.checkIn.updateMany({
    where: { userId: session.sub, endAt: null },
    data: { endAt: new Date(), endReason: "override" },
  });

  await prisma.checkIn.create({
    data: {
      userId: session.sub,
      venueId: venue.id,
      startLat: body.lat,
      startLng: body.lng,
      lastLat: body.lat,
      lastLng: body.lng,
    },
  });

  return NextResponse.json({ ok: true });
}
