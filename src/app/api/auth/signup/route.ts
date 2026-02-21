import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const Schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthdate: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  country: z.enum(["PR","US"]).default("PR"),
});

export async function POST(req: Request) {
  const body = Schema.parse(await req.json());
  const birthdate = new Date(body.birthdate);

  // Simple age gate: PR 18, US 21 (default)
  const age = Math.floor((Date.now() - birthdate.getTime()) / (365.25*24*3600*1000));
  const minAge = body.country === "PR" ? 18 : 21;
  if (age < minAge) return NextResponse.json({ error: "Age restricted" }, { status: 403 });

  const user = await prisma.user.create({
    data: {
      role: "USER",
      firstName: body.firstName,
      lastName: body.lastName,
      birthdate,
      country: body.country,
      email: body.email || null,
      wallet: { create: {} },
    },
  });

  const token = await signToken({ sub: user.id, role: "USER" });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("clicks_token", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
