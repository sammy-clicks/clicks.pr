import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const items = await prisma.zone.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { venues: true } },
      venues: { select: { id: true, name: true } },
    },
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

const RenameSchema = z.object({ id: z.string(), name: z.string().min(2).max(80) });

export async function PUT(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = RenameSchema.parse(await req.json());
    await prisma.zone.update({ where: { id: body.id }, data: { name: body.name } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const zone = await prisma.zone.findUnique({ where: { id }, include: { venues: { select: { name: true } } } });
  if (!zone) return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  if (zone.venues.length > 0) {
    return NextResponse.json({
      error: `Cannot delete: move these venues to another zone first.`,
      venues: zone.venues.map(v => v.name),
    }, { status: 409 });
  }

  await prisma.zone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
