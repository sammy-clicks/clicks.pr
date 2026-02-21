import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
      username: true,
      firstName: true,
      lastName: true,
      email: true,
      country: true,
      createdAt: true,
      ghostMode: true,
      bannedUntil: true,
      banReason: true,
      managedVenue: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ users });
}

const CreateSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["USER", "VENUE", "ADMIN"]).default("VENUE"),
});

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = CreateSchema.parse(await req.json());
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      role: body.role as any,
      username: body.username.toLowerCase(),
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      passwordHash,
      birthdate: new Date("1990-01-01"),
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
