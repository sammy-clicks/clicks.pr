import { NextResponse } from "next/server";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = params;

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plan: true,
      subscriptionStartedAt: true,
      subscriptionEndsAt: true,
      zone: { select: { name: true } },
    },
  });
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [orders, subscriptions, redemptions] = await Promise.all([
    prisma.order.findMany({
      where: { venueId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderCode: true,
        status: true,
        totalCents: true,
        createdAt: true,
        acceptedAt: true,
        readyAt: true,
        completedAt: true,
        cancelledAt: true,
      },
    }),
    prisma.subscriptionPayment.findMany({
      where: { venueId: id },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amountCents: true,
        status: true,
        paidAt: true,
        periodStart: true,
        periodEnd: true,
        stripeId: true,
      },
    }),
    prisma.redemption.findMany({
      where: { venueId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        paidCents: true,
        status: true,
        createdAt: true,
        promotion: { select: { title: true } },
      },
    }),
  ]);

  // Compute lifetime totals
  const completedOrders = orders.filter(o => o.status === "COMPLETED");
  const orderRevCents = Math.round(completedOrders.reduce((s, o) => s + (o.totalCents ?? 0), 0) * 0.15);
  const promoRevCents = Math.round(
    redemptions.filter(r => r.paidCents > 0).reduce((s, r) => s + r.paidCents, 0) * 0.15,
  );
  const subRevCents = subscriptions
    .filter(s => s.status === "PAID")
    .reduce((s, p) => s + p.amountCents, 0);

  return NextResponse.json({
    venue,
    orders,
    subscriptions,
    redemptions,
    summary: {
      orderCount: orders.length,
      completedOrderCount: completedOrders.length,
      orderCommissionCents: orderRevCents,
      promoCommissionCents: promoRevCents,
      subscriptionRevenueCents: subRevCents,
      totalClicksRevenueCents: orderRevCents + promoRevCents + subRevCents,
    },
  });
}
