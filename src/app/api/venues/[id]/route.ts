import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

function isAlcoholBlocked(cutoffMins: number): boolean {
  // PR is UTC-4 (no DST)
  const prMs = Date.now() - 4 * 60 * 60 * 1000;
  const prDate = new Date(prMs);
  const mins = prDate.getUTCHours() * 60 + prDate.getUTCMinutes();
  return mins >= cutoffMins && mins < 720; // blocked from cutoff until noon
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const venue = await prisma.venue.findUnique({
    where: { id: params.id },
    include: { municipality: true, menuItems: { orderBy: { name: "asc" } } },
  });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cutoff = venue.alcoholCutoffOverrideMins ?? venue.municipality.defaultAlcoholCutoffMins;
  const alcoholBlocked = isAlcoholBlocked(cutoff);

  const since = new Date(Date.now() - 120 * 60 * 1000);
  const active = await prisma.checkIn.count({ where: { venueId: venue.id, startAt: { gte: since }, endAt: null } });
  const crowdLevel = Math.min(10, Math.max(0, Math.ceil(active / 2)));

  return NextResponse.json({
    venue: {
      id: venue.id,
      name: venue.name,
      type: venue.type,
      description: venue.description,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      plan: venue.plan,
    },
    alcoholCutoffMins: cutoff,
    alcoholBlocked,
    crowdLevel,
    menu: venue.menuItems.map(m => ({
      id: m.id,
      name: m.name,
      priceCents: m.priceCents,
      isAlcohol: m.isAlcohol,
      isAvailable: m.isAvailable,
    })),
  });
}
