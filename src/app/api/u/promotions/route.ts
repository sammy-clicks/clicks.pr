import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// Returns all active promotions from enabled venues, with venue info for distance sorting
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const promotions = await prisma.promotion.findMany({
    where: {
      active: true,
      isDraft: false,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      venue: { isEnabled: true },
    },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      expiresAt: true,
      maxRedeemsPerNightPerUser: true,
      venue: {
        select: {
          id: true,
          name: true,
          type: true,
          lat: true,
          lng: true,
          venueImageUrl: true,
          zone: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    promotions: promotions.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      priceCents: p.priceCents,
      imageUrl: p.imageUrl ?? null,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      maxRedeemsPerNightPerUser: p.maxRedeemsPerNightPerUser,
      venue: {
        id: p.venue.id,
        name: p.venue.name,
        type: p.venue.type,
        lat: p.venue.lat,
        lng: p.venue.lng,
        venueImageUrl: p.venue.venueImageUrl ?? null,
        zoneName: p.venue.zone?.name ?? null,
      },
    })),
  });
}
