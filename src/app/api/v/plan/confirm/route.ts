import { NextResponse } from "next/server";
import { prisma, getSession } from "@/app/api/_utils";
import stripe from "@/lib/stripe";

export const dynamic = "force-dynamic";

type VenueInfo = { id: string; plan: string; managerId: string | null };

async function confirmBySessionId(sessionId: string, venue: VenueInfo): Promise<Response> {
  let cs: any;
  try {
    cs = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  } catch {
    return NextResponse.json({ error: "Could not retrieve checkout session." }, { status: 400 });
  }

  if (cs.payment_status !== "paid" || cs.mode !== "subscription") {
    return NextResponse.json({ error: "Payment not confirmed." }, { status: 400 });
  }

  // If session has an explicit venueId and it doesn't match, reject
  const csVenueId = cs.metadata?.venueId;
  if (csVenueId && csVenueId !== venue.id) {
    return NextResponse.json({ error: "Session does not belong to this venue." }, { status: 403 });
  }

  const sub = cs.subscription as { id: string; current_period_end: number; current_period_start: number } | null;
  const subscriptionStartedAt = sub ? new Date(sub.current_period_start * 1000) : new Date();
  const subscriptionEndsAt    = sub ? new Date(sub.current_period_end   * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.venue.update({
    where: { id: venue.id },
    data: { plan: "PRO", subscriptionStartedAt, subscriptionEndsAt, subscriptionCancelledAt: null },
  });

  // Create payment record — idempotent
  const existing = await prisma.subscriptionPayment.findFirst({ where: { stripeId: cs.id } }).catch(() => null);
  if (!existing) {
    await prisma.subscriptionPayment.create({
      data: {
        venueId: venue.id,
        amountCents: cs.amount_total ?? 2000,
        paidAt: subscriptionStartedAt,
        periodStart: subscriptionStartedAt,
        periodEnd:   subscriptionEndsAt,
        status:  "PAID",
        stripeId: cs.id,
      },
    });
  }

  return NextResponse.json({ ok: true, plan: "PRO" });
}

/**
 * GET /api/v/plan/confirm?session_id=cs_xxx   (preferred)
 * GET /api/v/plan/confirm                      (retry — scans recent sessions)
 *
 * Called from /v/account?upgraded=1 or the /v/plan "Retry" button.
 * Verifies payment with Stripe and upgrades the venue to PRO.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");

  // Get the venue for this manager
  const venue = await prisma.venue.findUnique({
    where: { managerId: session.sub },
    select: { id: true, plan: true, managerId: true },
  });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  if (venue.plan === "PRO") {
    return NextResponse.json({ ok: true, plan: "PRO", alreadyUpgraded: true });
  }

  // ── Try explicit session_id first ────────────────────────────────────────
  if (sessionId) {
    const result = await confirmBySessionId(sessionId, venue);
    return result;
  }

  // ── No session_id — scan recent Stripe checkout sessions for this venue ──
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 20 });
    for (const cs of sessions.data) {
      // Match either by explicit venueId metadata OR by lack of venueId (single-venue accounts)
      // Always verify payment is confirmed subscription
      if (cs.payment_status !== "paid" || cs.mode !== "subscription") continue;
      const csVenueId = cs.metadata?.venueId;
      // Skip sessions explicitly assigned to a different venue
      if (csVenueId && csVenueId !== venue.id) continue;
      const result = await confirmBySessionId(cs.id, venue);
      const body = await result.json();
      return NextResponse.json(body, { status: result.status });
    }
  } catch {
    // ignore Stripe errors on scan
  }
  return NextResponse.json({ error: "No confirmed payment found for this venue." }, { status: 404 });
}
