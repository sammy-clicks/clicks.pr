import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const venues = await prisma.venue.findMany({
    include: {
      municipality: { select: { name: true } },
      zone: { select: { name: true } },
      manager: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  const municipalities = await prisma.municipality.findMany({ orderBy: { name: "asc" } });
  const zones = await prisma.zone.findMany({ orderBy: { name: "asc" } });

  // Users with VENUE role that don't yet manage a venue
  const managers = await prisma.user.findMany({
    where: { role: "VENUE" },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json({ venues, municipalities, zones, managers });
}

const CreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  municipalityId: z.string(),
  zoneId: z.string(),
  plan: z.enum(["FREE", "PRO"]).default("FREE"),
  managerId: z.string().optional(),
  alcoholCutoffOverrideMins: z.number().int().min(0).max(1440).nullable().optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = CreateSchema.parse(await req.json());
  const venue = await prisma.venue.create({ data: body as any });
  return NextResponse.json({ ok: true, venue });
}

const PatchSchema = z.object({
  id: z.string(),
  plan: z.enum(["FREE", "PRO"]).optional(),
  managerId: z.string().nullable().optional(),
  alcoholCutoffOverrideMins: z.number().int().min(0).max(1440).nullable().optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, ...data } = PatchSchema.parse(await req.json());
  await prisma.venue.update({ where: { id }, data: data as any });
  return NextResponse.json({ ok: true });
}
