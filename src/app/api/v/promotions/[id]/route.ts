import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getSession } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

async function getVenuePromo(userId: string, promoId: string) {
  const venue = await prisma.venue.findUnique({
    where: { managerId: userId },
    select: { id: true },
  });
  if (!venue) return null;
  const promo = await prisma.promotion.findFirst({
    where: { id: promoId, venueId: venue.id },
  });
  return promo;
}

const PatchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(400).nullable().optional(),
  priceCents: z.number().int().min(0).optional(),
  imageUrl: z.string().url().nullable().optional().or(z.literal("")).optional(),
  maxRedeemsPerNightPerUser: z.number().int().min(1).max(99).optional(),
  active: z.boolean().optional(),
  // Publish a draft: set isDraft=false to go live
  isDraft: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const promo = await getVenuePromo(session.sub, params.id);
  if (!promo) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: z.infer<typeof PatchSchema>;
  try { body = PatchSchema.parse(await req.json()); }
  catch (e: any) {
    return NextResponse.json({ error: e?.errors?.[0]?.message ?? "Invalid" }, { status: 400 });
  }

  const updateData: any = { ...body };
  if (body.imageUrl === "") updateData.imageUrl = null;

  // Publishing a draft: compute expiresAt
  if (body.isDraft === false && promo.isDraft === true) {
    const venue = await prisma.venue.findUnique({
      where: { managerId: session.sub },
      select: { alcoholCutoffOverrideMins: true, municipality: { select: { defaultAlcoholCutoffMins: true } } },
    });
    const cutoffMins = venue?.alcoholCutoffOverrideMins ?? venue?.municipality?.defaultAlcoholCutoffMins ?? 120;
    const now = new Date();
    const target = new Date(now);
    const h = Math.floor(cutoffMins / 60) % 24;
    const m = cutoffMins % 60;
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    updateData.expiresAt = target;
    updateData.active = true;
  }

  const updated = await prisma.promotion.update({
    where: { id: params.id },
    data: updateData,
  });
  return NextResponse.json({ ok: true, promo: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const promo = await getVenuePromo(session.sub, params.id);
  if (!promo) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.promotion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
