import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// GET — own venue + user profile
export async function GET() {
  const auth = await requireRole(["VENUE"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await prisma.user.findUnique({
    where: { id: auth.session.sub },
    select: {
      id: true, username: true, firstName: true, lastName: true,
      email: true, avatarUrl: true, createdAt: true,
      managedVenue: {
        select: {
          id: true, name: true, type: true, description: true, address: true,
          venueImageUrl: true, crowdLevel: true, isEnabled: true, pausedAt: true, plan: true,
          subscriptionStartedAt: true, subscriptionEndsAt: true, boostActiveUntil: true,
          stripeAccountId: true, stripeOnboarded: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Live crowd level from active check-ins (last 2 hours)
  let activeCheckins = 0;
  if (user.managedVenue) {
    const since = new Date(Date.now() - 120 * 60 * 1000);
    activeCheckins = await prisma.checkIn.count({
      where: { venueId: user.managedVenue.id, startAt: { gte: since }, endAt: null },
    });
  }
  const liveCrowd = Math.min(10, Math.ceil(activeCheckins / 2) || 0);

  return NextResponse.json({ user, venue: user.managedVenue, activeCheckins, liveCrowd });
}

const PatchSchema = z.object({
  avatarUrl:      z.string().optional().nullable(),
  venueImageUrl:  z.string().optional().nullable(),
  crowdLevel:     z.number().int().min(0).max(5).optional(),
  currentPassword: z.string().optional(),
  newPassword:    z.string().min(8).optional(),
}).refine(d => !(d.newPassword && !d.currentPassword), {
  message: "currentPassword required to set newPassword",
});

// PATCH — update profile pic, venue image, or password
export async function PATCH(req: Request) {
  const auth = await requireRole(["VENUE"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = PatchSchema.parse(await req.json());
  const user = await prisma.user.findUnique({
    where: { id: auth.session.sub },
    include: { managedVenue: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Password change
  if (body.newPassword) {
    if (!user.passwordHash)
      return NextResponse.json({ error: "No password set." }, { status: 400 });
    const match = await bcrypt.compare(body.currentPassword!, user.passwordHash);
    if (!match)
      return NextResponse.json({ error: "Current password incorrect." }, { status: 400 });
    await prisma.user.update({
      where: { id: auth.session.sub },
      data: { passwordHash: await bcrypt.hash(body.newPassword, 10) },
    });
  }

  // User avatar
  if (body.avatarUrl !== undefined) {
    await prisma.user.update({ where: { id: auth.session.sub }, data: { avatarUrl: body.avatarUrl } });
  }

  // Venue image and crowd level
  if ((body.venueImageUrl !== undefined || body.crowdLevel !== undefined) && user.managedVenue) {
    await prisma.venue.update({
      where: { id: user.managedVenue.id },
      data: {
        ...(body.venueImageUrl !== undefined ? { venueImageUrl: body.venueImageUrl } : {}),
        ...(body.crowdLevel !== undefined ? { crowdLevel: body.crowdLevel } : {}),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — delete venue manager account (and detach venue)
export async function DELETE() {
  const auth = await requireRole(["VENUE"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Cancel any active orders for their venue first
  const user = await prisma.user.findUnique({
    where: { id: auth.session.sub },
    include: { managedVenue: { select: { id: true, name: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.managedVenue) {
    const ACTIVE = ["PLACED", "ACCEPTED", "PREPARING", "READY"];
    const activeOrders = await prisma.order.findMany({
      where: { venueId: user.managedVenue.id, status: { in: ACTIVE as any } },
      include: { user: { include: { wallet: true } } },
    });
    await prisma.$transaction(async tx => {
      for (const order of activeOrders) {
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
        const wallet = order.user.wallet;
        if (wallet && order.totalCents > 0) {
          await tx.walletAccount.update({ where: { id: wallet.id }, data: { balanceCents: { increment: order.totalCents } } });
          await tx.walletTxn.create({
            data: { walletId: wallet.id, type: "REFUND", amountCents: order.totalCents, memo: `Refund — ${user.managedVenue!.name} account deleted` },
          });
        }
      }
    });
  }

  // Delete the user (venue manager). First detach the venue so FK doesn't block deletion.
  if (user.managedVenue) {
    await prisma.venue.update({ where: { id: user.managedVenue.id }, data: { managerId: null } });
  }
  await prisma.user.delete({ where: { id: auth.session.sub } });
  return NextResponse.json({ ok: true });
}
