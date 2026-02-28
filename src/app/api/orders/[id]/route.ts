import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const VENUE_SHARE = 0.85; // venue receives 85%, platform keeps 15%

async function triggerVenuePayout(orderId: string, venueId: string, totalCents: number) {
  try {
    const venue = await prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue?.stripeAccountId || !venue.stripeOnboarded) {
      // Venue not connected — record as SKIPPED
      await prisma.venuePayout.create({
        data: { venueId, orderId, amountCents: 0, status: "SKIPPED",
          failReason: "Venue has no connected Stripe account" },
      });
      return;
    }
    const amountCents = Math.floor(totalCents * VENUE_SHARE);
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: "usd",
      destination: venue.stripeAccountId,
      transfer_group: `order_${orderId}`,
      metadata: { orderId, venueId },
    });
    await prisma.venuePayout.create({
      data: { venueId, orderId, amountCents, stripeTransferId: transfer.id, status: "SENT" },
    });
  } catch (err: any) {
    await prisma.venuePayout.upsert({
      where: { orderId },
      update: { status: "FAILED", failReason: String(err?.message ?? err) },
      create: { venueId, orderId, amountCents: 0, status: "FAILED",
        failReason: String(err?.message ?? err) },
    });
    console.error("[payout] transfer failed for order", orderId, err);
  }
}

export const dynamic = 'force-dynamic';

const TRANSITIONS: Record<string, string[]> = {
  PLACED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "PICKED_UP"],
};

const PatchSchema = z.object({ status: z.string() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = PatchSchema.parse(await req.json());

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Verify this venue belongs to this user
  const venue = await prisma.venue.findUnique({ where: { managerId: session.sub } });
  if (!venue || venue.id !== order.venueId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allowed = TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status))
    return NextResponse.json({ error: `Cannot transition from ${order.status} to ${status}` }, { status: 400 });

  const timestamps: Record<string, Date | null> = {
    acceptedAt: status === "ACCEPTED" ? new Date() : undefined,
    readyAt: status === "READY" ? new Date() : undefined,
    completedAt: status === "COMPLETED" || status === "PICKED_UP" ? new Date() : undefined,
    cancelledAt: status === "CANCELLED" ? new Date() : undefined,
  } as any;

  await prisma.order.update({
    where: { id: params.id },
    data: { status: status as any, ...timestamps },
  });

  // Trigger 85% payout to venue on completion (non-blocking)
  if (status === "COMPLETED" || status === "PICKED_UP") {
    triggerVenuePayout(params.id, order.venueId, order.totalCents);
  }

  return NextResponse.json({ ok: true });
}
