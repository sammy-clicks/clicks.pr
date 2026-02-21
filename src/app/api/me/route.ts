import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma, getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// GET — own profile
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true, username: true, firstName: true, lastName: true,
      email: true, role: true, avatarUrl: true, ghostMode: true,
      pausedAt: true, createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

const PatchSchema = z.object({
  avatarUrl:       z.string().url().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).optional(),
}).refine(d => !(d.newPassword && !d.currentPassword), {
  message: "currentPassword required to set newPassword",
});

// PATCH — update avatar or password
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = PatchSchema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  // Avatar
  if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

  // Password change
  if (body.newPassword) {
    if (!user.passwordHash)
      return NextResponse.json({ error: "No password set." }, { status: 400 });
    const match = await bcrypt.compare(body.currentPassword!, user.passwordHash);
    if (!match)
      return NextResponse.json({ error: "Current password incorrect." }, { status: 400 });
    updateData.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  await prisma.user.update({ where: { id: session.sub }, data: updateData });
  return NextResponse.json({ ok: true });
}

// DELETE — delete own account
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cascade: remove wallet txns, checkins, clicks, orders, buddies, votes
  await prisma.$transaction([
    prisma.walletTxn.deleteMany({ where: { wallet: { userId: session.sub } } }),
    prisma.walletAccount.deleteMany({ where: { userId: session.sub } }),
    prisma.orderItem.deleteMany({ where: { order: { userId: session.sub } } }),
    prisma.order.deleteMany({ where: { userId: session.sub } }),
    prisma.checkIn.deleteMany({ where: { userId: session.sub } }),
    prisma.clickEvent.deleteMany({ where: { userId: session.sub } }),
    prisma.vote.deleteMany({ where: { userId: session.sub } }),
    prisma.buddy.deleteMany({
      where: { OR: [{ senderId: session.sub }, { receiverId: session.sub }] },
    }),
    prisma.user.delete({ where: { id: session.sub } }),
  ]);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("clicks_token", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}
