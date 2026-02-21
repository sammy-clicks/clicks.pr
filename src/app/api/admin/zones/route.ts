import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const items = await prisma.zone.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { venues: true } } },
  });
  return NextResponse.json({ items });
}

const CreateSchema = z.object({ name: z.string().min(2).max(80) });

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = CreateSchema.parse(await req.json());
  const existing = await prisma.zone.findUnique({ where: { name: body.name } });
  if (existing) return NextResponse.json({ error: "Zone already exists." }, { status: 409 });

  const zone = await prisma.zone.create({ data: { name: body.name, isEnabled: true } });
  return NextResponse.json({ ok: true, zone });
}

const PatchSchema = z.object({ id: z.string(), isEnabled: z.boolean(), disabledReason: z.string().optional() });

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = PatchSchema.parse(await req.json());
  await prisma.zone.update({
    where: { id: body.id },
    data: { isEnabled: body.isEnabled, disabledReason: body.disabledReason ?? null },
  });
  return NextResponse.json({ ok: true });
}
