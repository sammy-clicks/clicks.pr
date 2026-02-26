import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

async function resolveItem(userId: string, itemId: string) {
  const venue = await prisma.venue.findUnique({ where: { managerId: userId } });
  if (!venue) return null;
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item || item.venueId !== venue.id) return null;
  return item;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await resolveItem(session.sub, params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const mixers = await prisma.mixer.findMany({
    where: { menuItemId: params.id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ mixers });
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  priceCents: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await resolveItem(session.sub, params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = CreateSchema.parse(await req.json());
  const mixer = await prisma.mixer.create({
    data: { ...body, menuItemId: params.id },
  });
  return NextResponse.json({ ok: true, mixer });
}
