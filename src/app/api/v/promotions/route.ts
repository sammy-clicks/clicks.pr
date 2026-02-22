import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getSession } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

async function getVenueId(userId: string): Promise<string | null> {
  const venue = await prisma.venue.findUnique({
    where: { managerId: userId },
    select: { id: true, plan: true },
  });
  return venue?.id ?? null;
}

/** Compute the next municipality alcohol cutoff as a JS Date for tonight */
async function nextCutoffDate(venueId: string): Promise<Date> {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      alcoholCutoffOverrideMins: true,
      municipality: { select: { defaultAlcoholCutoffMins: true } },
    },
  });
  const cutoffMins =
    venue?.alcoholCutoffOverrideMins ??
    venue?.municipality?.defaultAlcoholCutoffMins ??
    120; // default 2:00am

  const now = new Date();
  // Cutoff on the next occurrence — if cutoff is 2:00am (120 min) it means tomorrow at 2:00
  const cutoffH = Math.floor(cutoffMins / 60) % 24;
  const cutoffM = cutoffMins % 60;
  const target = new Date(now);
  target.setHours(cutoffH, cutoffM, 0, 0);
  // If the target time has already passed today, advance to next day
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

// GET — return promos + drafts for this venue
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venueId = await getVenueId(session.sub);
  if (!venueId) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  const [active, drafts] = await Promise.all([
    prisma.promotion.findMany({
      where: { venueId, isDraft: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.promotion.findMany({
      where: { venueId, isDraft: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ active, drafts });
}

const CreateSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(400).optional(),
  priceCents: z.number().int().min(0).default(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
  maxRedeemsPerNightPerUser: z.number().int().min(1).max(99).default(1),
  isDraft: z.boolean().default(false),
});

// POST — create promotion (or save as draft)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({
    where: { managerId: session.sub },
    select: { id: true, plan: true, name: true },
  });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });
  if (venue.plan !== "PRO")
    return NextResponse.json({ error: "PRO plan required to create promotions." }, { status: 403 });

  let body: z.infer<typeof CreateSchema>;
  try { body = CreateSchema.parse(await req.json()); }
  catch (e: any) {
    const msg = e?.errors?.[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const expiresAt = body.isDraft ? null : await nextCutoffDate(venue.id);

  const promo = await prisma.promotion.create({
    data: {
      venueId: venue.id,
      title: body.title,
      description: body.description ?? null,
      priceCents: body.priceCents,
      imageUrl: body.imageUrl || null,
      maxRedeemsPerNightPerUser: body.maxRedeemsPerNightPerUser,
      isDraft: body.isDraft,
      active: !body.isDraft,
      expiresAt,
    },
  });

  return NextResponse.json({ ok: true, promo, venueName: venue.name, expiresAt });
}
