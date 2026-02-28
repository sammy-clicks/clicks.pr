import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PRO_PRICE_CENTS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * GET /api/v/plan/success?session_id=cs_xxx
 *
 * Stripe success_url target — NO auth cookie required.
 * Verifies the checkout session directly with Stripe, upgrades the venue to PRO,
 * then server-redirects to /v/account?upgraded=1.
 *
 * This is required for mobile: when Stripe opens in an in-app browser /
 * Chrome Custom Tab / Safari View Controller, the app's auth cookies are not
 * shared, so any client-side confirm that requires a session would get 401.
 */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(`${appUrl}/v/account?upgraded=1&confirm_error=missing_session`);
  }

  let cs: any;
  try {
    cs = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
  } catch {
    return NextResponse.redirect(`${appUrl}/v/account?upgraded=1&confirm_error=stripe_error`);
  }

  if (cs.payment_status !== "paid" || cs.mode !== "subscription") {
    return NextResponse.redirect(`${appUrl}/v/account?upgraded=1&confirm_error=not_paid`);
  }

  const venueId = cs.metadata?.venueId as string | undefined;
  if (!venueId) {
    // No venueId in metadata — redirect and let client-side confirm handle it
    return NextResponse.redirect(`${appUrl}/v/account?upgraded=1&confirm_error=no_venue_meta`);
  }

  try {
    const sub = cs.subscription as any;
    const periodStart = sub?.current_period_start
      ? new Date(sub.current_period_start * 1000)
      : new Date();
    const periodEnd = sub?.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.venue.update({
      where: { id: venueId },
      data: {
        plan: "PRO",
        subscriptionStartedAt: periodStart,
        subscriptionEndsAt: periodEnd,
        subscriptionCancelledAt: null,
      },
    });

    // Idempotent payment record
    const existing = await prisma.subscriptionPayment.findFirst({
      where: { stripeId: cs.id },
    });
    if (!existing) {
      await prisma.subscriptionPayment.create({
        data: {
          venueId,
          amountCents: cs.amount_total ?? PRO_PRICE_CENTS,
          paidAt: periodStart,
          periodStart,
          periodEnd,
          status: "PAID",
          stripeId: cs.id,
        },
      });
    }
  } catch (err) {
    console.error("[plan/success] DB update failed:", err);
    // Still redirect — client-side confirm will retry
    return NextResponse.redirect(`${appUrl}/v/account?upgraded=1&confirm_error=db_error`);
  }

  // Upgrade complete — redirect to account page
  return NextResponse.redirect(`${appUrl}/v/account?upgraded=1`);
}
