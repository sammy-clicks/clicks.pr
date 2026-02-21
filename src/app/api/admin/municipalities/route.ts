import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const items = await prisma.municipality.findMany({ orderBy: { name: "asc" }});
  return NextResponse.json({ items });
}

const PatchSchema = z.object({
  id: z.string(),
  defaultAlcoholCutoffMins: z.number().int().min(0).max(24*60).optional(),
  monCutoffMins: z.number().int().min(0).max(24*60).nullable().optional(),
  tueCutoffMins: z.number().int().min(0).max(24*60).nullable().optional(),
  thuCutoffMins: z.number().int().min(0).max(24*60).nullable().optional(),
  friCutoffMins: z.number().int().min(0).max(24*60).nullable().optional(),
  satCutoffMins: z.number().int().min(0).max(24*60).nullable().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, ...data } = PatchSchema.parse(await req.json());
  await prisma.municipality.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
