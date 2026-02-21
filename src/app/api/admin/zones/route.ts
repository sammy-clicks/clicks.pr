import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const items = await prisma.zone.findMany({ orderBy: { name: "asc" }});
  return NextResponse.json({ items });
}

const PatchSchema = z.object({ id: z.string(), isEnabled: z.boolean() });

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = PatchSchema.parse(await req.json());
  await prisma.zone.update({ where: { id: body.id }, data: { isEnabled: body.isEnabled }});
  return NextResponse.json({ ok: true });
}
