import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

async function getVenueForUser(userId: string) {
  const venue = await prisma.venue.findUnique({ where: { managerId: userId } });
  return venue ?? null;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await getVenueForUser(session.sub);
  if (!venue) return NextResponse.json({ error: "No venue linked to this account." }, { status: 404 });

  const items = await prisma.menuItem.findMany({
    where: { venueId: venue.id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      mixers: { orderBy: { sortOrder: "asc" } },
    },
  });
  return NextResponse.json({ venueId: venue.id, venueName: venue.name, items });
}

const CreateSchema = z.object({
  name: z.string().min(1),
  priceCents: z.number().int().min(0),
  isAlcohol: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  category: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await getVenueForUser(session.sub);
  if (!venue) return NextResponse.json({ error: "No venue linked to this account." }, { status: 404 });

  const body = CreateSchema.parse(await req.json());
  const item = await prisma.menuItem.create({ data: { ...body, venueId: venue.id } });
  return NextResponse.json({ ok: true, item });
}
