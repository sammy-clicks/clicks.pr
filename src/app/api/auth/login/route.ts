import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, type TokenPayload } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const Schema = z.object({
  identifier: z.string().min(1), // email or username
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid credentials" }, { status: 401 }); }

  const { identifier, password } = body;

  // Determine lookup: email contains @, username does not (strip leading @ if typed)
  const cleaned = identifier.startsWith("@") ? identifier.slice(1) : identifier;
  const isEmail = cleaned.includes("@");

  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: cleaned.toLowerCase() } })
    : await prisma.user.findUnique({ where: { username: cleaned.toLowerCase() } });

  if (!user || !user.passwordHash)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  // Ban check
  if (user.bannedUntil && user.bannedUntil > new Date()) {
    return NextResponse.json({
      error: "BANNED",
      bannedUntil: user.bannedUntil.toISOString(),
      banReason: user.banReason ?? "Violation of Terms of Service",
    }, { status: 403 });
  }

  const token = await signToken({ sub: user.id, role: user.role as TokenPayload["role"] });
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set("clicks_token", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
