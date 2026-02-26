import { NextResponse } from "next/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret");

const Schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid email." }, { status: 400 }); }

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    return NextResponse.json({ error: "No account found with that email address." }, { status: 404 });
  }

  const token = await new SignJWT({ type: "password-reset", userId: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://clickspr.com"}/auth/reset-password?token=${token}`;
  try {
    await sendPasswordResetEmail(user.email!, resetUrl);
  } catch (err: any) {
    console.error("Reset email failed:", err?.message ?? err);
    return NextResponse.json({ error: `Email error: ${err?.message ?? "Failed to send"}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
