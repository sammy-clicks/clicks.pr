import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  isAlcohol: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({ where: { managerId: session.sub } });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  const item = await prisma.menuItem.findUnique({ where: { id: params.id } });
  if (!item || item.venueId !== venue.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = PatchSchema.parse(await req.json());
  const updated = await prisma.menuItem.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({ where: { managerId: session.sub } });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  const item = await prisma.menuItem.findUnique({ where: { id: params.id } });
  if (!item || item.venueId !== venue.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.menuItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
