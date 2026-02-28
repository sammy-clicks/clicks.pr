import { NextResponse } from "next/server";
import { prisma, getSession } from "@/app/api/_utils";
import stripe, { PRO_PRICE_CENTS, PRO_MONTHLY_PRICE_ID } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** Archive all active non-draft promotions for a venue when it falls off PRO. */
async function archivePromotions(venueId: string) {
  await prisma.promotion.updateMany({
    where: { venueId, isDraft: false, active: true },
    data: { isDraft: true, active: false },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({
    where: { managerId: session.sub },
    select: {
      id: true, name: true, plan: true,
      subscriptionStartedAt: true,
      subscriptionEndsAt: true,
      subscriptionCancelledAt: true,
      subscriptionPayments: {
        orderBy: { paidAt: "desc" },
        take: 12,
        select: { id: true, amountCents: true, paidAt: true, periodStart: true, periodEnd: true, status: true, stripeId: true },
      },
    },
  });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  // Auto-downgrade: if subscription was cancelled AND the period has now ended, move to FREE
  if (
    venue.plan === "PRO" &&
    venue.subscriptionCancelledAt &&
    venue.subscriptionEndsAt &&
    venue.subscriptionEndsAt < new Date()
  ) {
    await prisma.venue.update({
      where: { id: venue.id },
      data: { plan: "FREE", subscriptionCancelledAt: null },
    });
    await archivePromotions(venue.id);
    return NextResponse.json({
      plan: "FREE",
      subscriptionStartedAt: venue.subscriptionStartedAt,
      subscriptionEndsAt: venue.subscriptionEndsAt,
      subscriptionCancelledAt: null,
      payments: venue.subscriptionPayments,
      priceCents: PRO_PRICE_CENTS,
      venueName: venue.name,
    });
  }

  return NextResponse.json({
    plan: venue.plan,
    subscriptionStartedAt: venue.subscriptionStartedAt,
    subscriptionEndsAt: venue.subscriptionEndsAt,
    subscriptionCancelledAt: venue.subscriptionCancelledAt,
    payments: venue.subscriptionPayments,
    priceCents: PRO_PRICE_CENTS,
    venueName: venue.name,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true, firstName: true, lastName: true },
  });
  const venue = await prisma.venue.findUnique({
    where: { managerId: session.sub },
    select: { id: true, name: true, plan: true, subscriptionCancelledAt: true, subscriptionEndsAt: true },
  });
  if (!venue || !user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // ── action: checkout (upgrade to PRO) ────────────────────
  if (action === "checkout") {
    if (venue.plan === "PRO" && !venue.subscriptionCancelledAt)
      return NextResponse.json({ error: "Already on PRO plan." }, { status: 400 });

    if (!PRO_MONTHLY_PRICE_ID) {
      // Stripe not configured — simulate upgrade for dev
      const now = new Date();
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prisma.venue.update({
        where: { id: venue.id },
        data: { plan: "PRO", subscriptionStartedAt: now, subscriptionEndsAt: end, subscriptionCancelledAt: null },
      });
      await prisma.subscriptionPayment.create({
        data: {
          venueId: venue.id,
          amountCents: PRO_PRICE_CENTS,
          paidAt: now,
          periodStart: now,
          periodEnd: end,
          status: "PAID",
          stripeId: "dev_sim_" + Date.now(),
        },
      });
      return NextResponse.json({ ok: true, simulated: true, redirectUrl: "/v/account?upgraded=1" });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price: PRO_MONTHLY_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/v/account?upgraded=1`,
      cancel_url: `${appUrl}/v/plan?cancelled=1`,
      metadata: { venueId: venue.id },
      // Propagate venueId to the Subscription and all its Invoices so webhooks can find it
      subscription_data: { metadata: { venueId: venue.id } },
    });

    return NextResponse.json({ ok: true, checkoutUrl: checkoutSession.url });
  }

  // ── action: cancel (schedule downgrade to FREE at period end) ─────────────
  if (action === "cancel") {
    if (venue.plan !== "PRO")
      return NextResponse.json({ error: "Not on PRO plan." }, { status: 400 });
    if (venue.subscriptionCancelledAt)
      return NextResponse.json({ error: "Already scheduled for downgrade." }, { status: 400 });

    // With Stripe: cancel at period end (user keeps PRO until billing cycle ends)
    if (PRO_MONTHLY_PRICE_ID) {
      const lastPayment = await prisma.subscriptionPayment.findFirst({
        where: { venueId: venue.id },
        orderBy: { paidAt: "desc" },
      });
      if (lastPayment?.stripeId && !lastPayment.stripeId.startsWith("dev_sim_")) {
        await stripe.subscriptions.update(lastPayment.stripeId, { cancel_at_period_end: true });
      }
    }

    await prisma.venue.update({
      where: { id: venue.id },
      data: { subscriptionCancelledAt: new Date() },
    });

    return NextResponse.json({ ok: true, endsAt: venue.subscriptionEndsAt });
  }

  // ── action: reactivate (undo cancellation while still in PRO period) ──────
  if (action === "reactivate") {
    if (venue.plan !== "PRO" || !venue.subscriptionCancelledAt)
      return NextResponse.json({ error: "No pending cancellation." }, { status: 400 });

    if (PRO_MONTHLY_PRICE_ID) {
      const lastPayment = await prisma.subscriptionPayment.findFirst({
        where: { venueId: venue.id },
        orderBy: { paidAt: "desc" },
      });
      if (lastPayment?.stripeId && !lastPayment.stripeId.startsWith("dev_sim_")) {
        await stripe.subscriptions.update(lastPayment.stripeId, { cancel_at_period_end: false });
      }
    }

    await prisma.venue.update({
      where: { id: venue.id },
      data: { subscriptionCancelledAt: null },
    });

    return NextResponse.json({ ok: true });
  }

  // ── action: portal (manage subscription via Stripe billing portal) ────────
  if (action === "portal") {
    const lastPayment = await prisma.subscriptionPayment.findFirst({
      where: { venueId: venue.id },
      orderBy: { paidAt: "desc" },
    });
    const stripeId = lastPayment?.stripeId;
    if (!stripeId || stripeId.startsWith("dev_sim_"))
      return NextResponse.json({ error: "No active Stripe subscription found." }, { status: 400 });

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeId,
      return_url: `${appUrl}/v/plan`,
    });
    return NextResponse.json({ ok: true, portalUrl: portalSession.url });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
