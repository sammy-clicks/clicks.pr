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
  defaultAlcoholCutoffMins: z.number().int().min(0).max(24*60),
});

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = PatchSchema.parse(await req.json());
  await prisma.municipality.update({
    where: { id: body.id },
    data: { defaultAlcoholCutoffMins: body.defaultAlcoholCutoffMins },
  });
  return NextResponse.json({ ok: true });
}
