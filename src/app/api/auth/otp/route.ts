import { NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret");

const Schema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthdate: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.enum(["PR", "US"]).default("PR"),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid input. Check all fields." }, { status: 400 }); }

  const birthdate = new Date(body.birthdate);
  const age = Math.floor((Date.now() - birthdate.getTime()) / (365.25 * 24 * 3600 * 1000));
  const minAge = body.country === "PR" ? 18 : 21;
  if (age < minAge)
    return NextResponse.json({ error: "Age restricted" }, { status: 403 });

  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: body.email } }),
    prisma.user.findUnique({ where: { username: body.username.toLowerCase() } }),
  ]);
  if (existingEmail) return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  if (existingUsername) return NextResponse.json({ error: "Username already taken." }, { status: 409 });

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  // Sign a short-lived token containing the form data + OTP (10 min)
  const pendingToken = await new SignJWT({
    ...body,
    otp,
    type: "signup-otp",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);

  // Send OTP email
  try {
    await sendOtpEmail(body.email, otp);
  } catch (err: any) {
    const detail = err?.message ?? String(err);
    console.error("OTP email failed:", detail);
    return NextResponse.json({ error: `Email error: ${detail}` }, { status: 500 });
  }

  return NextResponse.json({ pendingToken });
}
