import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret");

const Schema = z.object({
  pendingToken: z.string(),
  otp: z.string().length(6),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  let payload: any;
  try {
    const { payload: p } = await jwtVerify(body.pendingToken, secret);
    payload = p;
  } catch {
    return NextResponse.json({ error: "Verification code expired. Please start over." }, { status: 400 });
  }

  if (payload.type !== "signup-otp")
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  if (payload.otp !== body.otp)
    return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: payload.email } }),
    prisma.user.findUnique({ where: { username: (payload.username as string).toLowerCase() } }),
  ]);
  if (existingEmail) return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  if (existingUsername) return NextResponse.json({ error: "Username already taken." }, { status: 409 });

  const passwordHash = await bcrypt.hash(payload.password as string, 10);

  const user = await prisma.user.create({
    data: {
      role: "USER",
      username: (payload.username as string).toLowerCase(),
      firstName: payload.firstName as string,
      lastName: payload.lastName as string,
      birthdate: new Date(payload.birthdate as string),
      country: payload.country as string,
      email: payload.email as string,
      passwordHash,
      wallet: { create: {} },
    },
  });

  const token = await signToken({ sub: user.id, role: "USER" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("clicks_token", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
