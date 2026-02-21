import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const BanSchema = z.object({
  action: z.enum(["ban", "unban"]),
  durationDays: z.number().int().min(1).max(365).optional(), // undefined = permanent
  reason: z.string().max(200).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = BanSchema.parse(await req.json());
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "ADMIN") return NextResponse.json({ error: "Cannot ban admin accounts." }, { status: 403 });

  if (body.action === "unban") {
    await prisma.user.update({
      where: { id: params.id },
      data: { bannedUntil: null, banReason: null },
    });
    return NextResponse.json({ ok: true, status: "unbanned" });
  }

  // ban
  const bannedUntil = body.durationDays
    ? new Date(Date.now() + body.durationDays * 24 * 60 * 60 * 1000)
    : new Date("2099-01-01"); // permanent = far future date

  await prisma.user.update({
    where: { id: params.id },
    data: { bannedUntil, banReason: body.reason ?? null },
  });

  return NextResponse.json({ ok: true, status: "banned", bannedUntil });
}
