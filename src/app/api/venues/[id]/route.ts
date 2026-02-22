import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_PREFIXES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function prMinutes(): number {
  const prMs = Date.now() - 4 * 60 * 60 * 1000;
  const d = new Date(prMs);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function prDayOfWeek(): number {
  const prMs = Date.now() - 4 * 60 * 60 * 1000;
  return new Date(prMs).getUTCDay();
}

function isAlcoholAllowed(startMins: number, cutoffMins: number): boolean {
  const mins = prMinutes();
  if (startMins <= cutoffMins) return mins >= startMins && mins < cutoffMins;
  return mins >= startMins || mins < cutoffMins;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const venue = await prisma.venue.findUnique({
    where: { id: params.id },
    include: { municipality: true, menuItems: { orderBy: { name: "asc" } } },
  });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve today's serving window using per-day overrides
  const dow = prDayOfWeek();
  const prefix = DAY_PREFIXES[dow];
  const muni = venue.municipality as any;
  const startMins  = muni[`${prefix}StartMins`]  ?? muni.defaultAlcoholStartMins;
  const muniCutoff = muni[`${prefix}CutoffMins`] ?? muni.defaultAlcoholCutoffMins;
  const cutoffMins = venue.alcoholCutoffOverrideMins ?? muniCutoff;
  const alcoholBlocked = !isAlcoholAllowed(startMins, cutoffMins);

  const since = new Date(Date.now() - 120 * 60 * 1000);
  const active = await prisma.checkIn.count({ where: { venueId: venue.id, startAt: { gte: since }, endAt: null } });
  const boostBonus = venue.boostActiveUntil && venue.boostActiveUntil > new Date() ? 2 : 0;
  const crowdLevel = Math.min(10, Math.max(0, Math.ceil(active / 2) + boostBonus));
  const boostActive = boostBonus > 0;

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
    alcoholStartMins: startMins,
    alcoholCutoffMins: cutoffMins,
    alcoholBlocked,
    crowdLevel,
    boostActive,
    menu: venue.menuItems.map(m => ({
      id: m.id,
      name: m.name,
      priceCents: m.priceCents,
      isAlcohol: m.isAlcohol,
      isAvailable: m.isAvailable,
    })),
  });
}
