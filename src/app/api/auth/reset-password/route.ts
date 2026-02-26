import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret");

const Schema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try { body = Schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid input." }, { status: 400 }); }

  let payload: any;
  try {
    const { payload: p } = await jwtVerify(body.token, secret);
    payload = p;
  } catch {
    return NextResponse.json({ error: "Reset link has expired or is invalid." }, { status: 400 });
  }

  if (payload.type !== "password-reset")
    return NextResponse.json({ error: "Invalid reset token." }, { status: 400 });

  const passwordHash = await bcrypt.hash(body.password, 10);
  await prisma.user.update({
    where: { id: payload.userId as string },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
