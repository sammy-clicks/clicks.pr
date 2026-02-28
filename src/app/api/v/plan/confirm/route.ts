import { NextResponse } from "next/server";
import { prisma, getSession } from "@/app/api/_utils";
import stripe from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * GET /api/v/plan/confirm?session_id=cs_xxx
 *
 * Called from /v/account?upgraded=1 when the venue still shows FREE after Stripe
 * redirects back. Verifies the checkout session directly with Stripe and upgrades
 * the venue to PRO if payment is confirmed.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  let cs;
  try {
    cs = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
  } catch {
    return NextResponse.json({ error: "Could not retrieve checkout session." }, { status: 400 });
  }

  if (cs.payment_status !== "paid" || cs.mode !== "subscription") {
    return NextResponse.json({ error: "Payment not confirmed." }, { status: 400 });
  }

  const venueId = cs.metadata?.venueId;
  if (!venueId) return NextResponse.json({ error: "No venueId in session metadata." }, { status: 400 });

  // Verify the venue belongs to the authenticated manager
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, plan: true, managerId: true },
  });
  if (!venue || venue.managerId !== session.sub)
    return NextResponse.json({ error: "Venue mismatch." }, { status: 403 });

  if (venue.plan === "PRO") {
    // Already upgraded (webhook beat us to it)
    return NextResponse.json({ ok: true, plan: "PRO", alreadyUpgraded: true });
  }

  // Upgrade now
  const sub = cs.subscription as { id: string; current_period_end: number; current_period_start: number } | null;
  const subscriptionStartedAt = sub ? new Date(sub.current_period_start * 1000) : new Date();
  const subscriptionEndsAt    = sub ? new Date(sub.current_period_end   * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.venue.update({
    where: { id: venueId },
    data: { plan: "PRO", subscriptionStartedAt, subscriptionEndsAt, subscriptionCancelledAt: null },
  });

  // Create payment record (idempotent by stripeId)
  if (sub) {
    const existing = await prisma.subscriptionPayment.findFirst({ where: { stripeId: cs.id } }).catch(() => null);
    if (!existing) {
      const amountCents = cs.amount_total ?? 2000;
      await prisma.subscriptionPayment.create({
        data: {
          venueId,
          amountCents,
          paidAt: subscriptionStartedAt,
          periodStart: subscriptionStartedAt,
          periodEnd:   subscriptionEndsAt,
          status:  "PAID",
          stripeId: cs.id,
        },
      });
    }
  }

  return NextResponse.json({ ok: true, plan: "PRO" });
}
