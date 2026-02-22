import { NextResponse } from "next/server";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// POST — toggle venue pause
// Pausing: disables venue, cancels all active orders with wallet refund
// Resuming: re-enables venue
export async function POST() {
  const auth = await requireRole(["VENUE"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await prisma.user.findUnique({
    where: { id: auth.session.sub },
    include: { managedVenue: { select: { id: true, isEnabled: true, name: true } } },
  });
  if (!user?.managedVenue) return NextResponse.json({ error: "No venue found" }, { status: 404 });

  const venue = user.managedVenue;

  if (venue.isEnabled) {
    // --- PAUSE ---
    const ACTIVE = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

    // Find all active orders for this venue
    const activeOrders = await prisma.order.findMany({
      where: { venueId: venue.id, status: { in: ACTIVE as any } },
      include: { user: { include: { wallet: true } } },
    });

    await prisma.$transaction(async tx => {
      // Cancel each active order and refund the user's wallet
      for (const order of activeOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });

        const wallet = order.user.wallet;
        if (wallet && order.totalCents > 0) {
          await tx.walletAccount.update({
            where: { id: wallet.id },
            data: { balanceCents: { increment: order.totalCents } },
          });
          await tx.walletTxn.create({
            data: {
              walletId: wallet.id,
              type: "REFUND",
              amountCents: order.totalCents,
              memo: `Refund — ${venue.name} paused`,
            },
          });
        }
      }

      // Disable the venue
      await tx.venue.update({
        where: { id: venue.id },
        data: { isEnabled: false, pausedAt: new Date() },
      });
    });

    return NextResponse.json({
      ok: true,
      paused: true,
      cancelledOrders: activeOrders.length,
    });
  } else {
    // --- RESUME ---
    await prisma.venue.update({
      where: { id: venue.id },
      data: { isEnabled: true, pausedAt: null },
    });

    return NextResponse.json({ ok: true, paused: false });
  }
}
