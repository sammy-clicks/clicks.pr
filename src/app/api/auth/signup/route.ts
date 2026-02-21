import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const Schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthdate: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.enum(["PR","US"]).default("PR"),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid input. Email and password (min 8 chars) are required." }, { status: 400 }); }

  const birthdate = new Date(body.birthdate);

  // Simple age gate: PR 18, US 21 (default)
  const age = Math.floor((Date.now() - birthdate.getTime()) / (365.25*24*3600*1000));
  const minAge = body.country === "PR" ? 18 : 21;
  if (age < minAge) return NextResponse.json({ error: "Age restricted" }, { status: 403 });

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: "Email already registered." }, { status: 409 });

  const passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      role: "USER",
      firstName: body.firstName,
      lastName: body.lastName,
      birthdate,
      country: body.country,
      email: body.email,
      passwordHash,
      wallet: { create: {} },
    },
  });

  const token = await signToken({ sub: user.id, role: "USER" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("clicks_token", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
