import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, role: true, username: true, firstName: true, lastName: true,
      email: true, phone: true, country: true, createdAt: true, lastActiveAt: true,
      ghostMode: true, bannedUntil: true, banReason: true, avatarUrl: true,
      wallet: { select: { balanceCents: true } },
      managedVenue: { select: { id: true, name: true, plan: true } },
      _count: { select: { clicks: true, orders: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [recentOrders, buddyCount, walletTxns] = await Promise.all([
    prisma.order.findMany({
      where: { userId: params.id },
      select: {
        id: true, orderNumber: true, status: true, totalCents: true, createdAt: true,
        venue: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.buddy.count({
      where: { OR: [{ senderId: params.id, status: "ACCEPTED" }, { receiverId: params.id, status: "ACCEPTED" }] },
    }),
    prisma.walletTxn.findMany({
      where: { wallet: { userId: params.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, amountCents: true, memo: true, createdAt: true, counterpartyUserId: true },
    }),
  ]);

  return NextResponse.json({ user, recentOrders, buddyCount, walletTxns });
}

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
