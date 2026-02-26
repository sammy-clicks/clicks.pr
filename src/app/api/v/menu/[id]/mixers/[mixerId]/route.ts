import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

async function resolveMixer(userId: string, itemId: string, mixerId: string) {
  const venue = await prisma.venue.findUnique({ where: { managerId: userId } });
  if (!venue) return null;
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item || item.venueId !== venue.id) return null;
  const mixer = await prisma.mixer.findUnique({ where: { id: mixerId } });
  if (!mixer || mixer.menuItemId !== itemId) return null;
  return mixer;
}

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  priceCents: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; mixerId: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mixer = await resolveMixer(session.sub, params.id, params.mixerId);
  if (!mixer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = PatchSchema.parse(await req.json());
  const updated = await prisma.mixer.update({ where: { id: params.mixerId }, data: body });
  return NextResponse.json({ ok: true, mixer: updated });
}

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; mixerId: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mixer = await resolveMixer(session.sub, params.id, params.mixerId);
  if (!mixer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.mixer.delete({ where: { id: params.mixerId } });
  return NextResponse.json({ ok: true });
}
