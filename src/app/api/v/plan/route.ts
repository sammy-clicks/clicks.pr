import { NextResponse } from "next/server";
import { prisma, getSession } from "@/app/api/_utils";
import stripe, { PRO_PRICE_CENTS, PRO_MONTHLY_PRICE_ID } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({
    where: { managerId: session.sub },
    select: {
      id: true, name: true, plan: true,
      subscriptionStartedAt: true, subscriptionEndsAt: true,
      subscriptionPayments: {
        orderBy: { paidAt: "desc" },
        take: 12,
        select: { id: true, amountCents: true, paidAt: true, periodStart: true, periodEnd: true, status: true, stripeId: true },
      },
    },
  });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  return NextResponse.json({
    plan: venue.plan,
    subscriptionStartedAt: venue.subscriptionStartedAt,
    subscriptionEndsAt: venue.subscriptionEndsAt,
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
    select: { id: true, name: true, plan: true },
  });
  if (!venue || !user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // ── action: checkout (upgrade to PRO) ────────────────────
  if (action === "checkout") {
    if (venue.plan === "PRO")
      return NextResponse.json({ error: "Already on PRO plan." }, { status: 400 });

    if (!PRO_MONTHLY_PRICE_ID) {
      // Stripe not configured — simulate upgrade for dev
      await prisma.venue.update({
        where: { id: venue.id },
        data: {
          plan: "PRO",
          subscriptionStartedAt: new Date(),
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      const now = new Date();
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
      return NextResponse.json({ ok: true, simulated: true, redirectUrl: "/v/plan?upgraded=1" });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price: PRO_MONTHLY_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/v/plan?upgraded=1`,
      cancel_url: `${appUrl}/v/plan?cancelled=1`,
      metadata: { venueId: venue.id },
    });

    return NextResponse.json({ ok: true, checkoutUrl: checkoutSession.url });
  }

  // ── action: portal (manage/cancel subscription) ──────────
  if (action === "portal") {
    // Find Stripe customer ID from latest payment
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
