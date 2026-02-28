import { NextResponse } from "next/server";
import stripe, { PRO_PRICE_CENTS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Look up venueId from metadata, or fall back to our payment records by Stripe subscription ID. */
async function resolveVenueId(metadata: Record<string, string> | null, subscriptionId?: string): Promise<string | null> {
  const fromMeta = metadata?.venueId;
  if (fromMeta) return fromMeta;
  if (!subscriptionId) return null;
  const pmt = await prisma.subscriptionPayment.findFirst({
    where: { stripeId: subscriptionId },
    select: { venueId: true },
    orderBy: { paidAt: "desc" },
  });
  return pmt?.venueId ?? null;
}

// Stripe sends raw body — must read as text to preserve bytes for signature check
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe webhook] signature check failed:", err.message);
    console.error("[stripe webhook] secret prefix:", webhookSecret.slice(0, 12));
    console.error("[stripe webhook] sig header present:", !!sig);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const obj = event.data.object as any;

  switch (event.type) {    // ── Stripe Checkout completed (subscription upgrade) ─────────────────────
    case "checkout.session.completed": {
      // Only handle subscription checkouts (not one-time payments)
      if (obj.mode !== "subscription") break;
      const venueId = obj.metadata?.venueId as string | undefined;
      if (!venueId) break;
      const subscriptionId = obj.subscription as string;
      if (!subscriptionId) break;

      // Fetch the subscription to get the billing period
      let sub: any;
      try { sub = await stripe.subscriptions.retrieve(subscriptionId); } catch { break; }
      const periodStart = new Date(sub.current_period_start * 1000);
      const periodEnd   = new Date(sub.current_period_end   * 1000);

      await prisma.venue.update({
        where: { id: venueId },
        data: { plan: "PRO", subscriptionStartedAt: periodStart, subscriptionEndsAt: periodEnd, subscriptionCancelledAt: null },
      });

      // Create payment record (idempotent — skip if already exists for this subscription period)
      const existing = await prisma.subscriptionPayment.findFirst({
        where: { venueId, stripeId: subscriptionId, periodStart },
      });
      if (!existing) {
        await prisma.subscriptionPayment.create({
          data: {
            venueId,
            amountCents: PRO_PRICE_CENTS,
            paidAt: new Date(),
            periodStart,
            periodEnd,
            stripeId: subscriptionId,
            status: "PAID",
          },
        });
      }
      break;
    }
    // ── Wallet top-up via PaymentIntent ──────────────────────────────────────
    case "payment_intent.succeeded": {
      const userId      = obj.metadata?.userId as string | undefined;
      const amountCents = parseInt(obj.metadata?.amountCents ?? "0", 10);
      const piId        = obj.id as string;
      if (!userId || !amountCents || !piId) break;

      const wallet = await prisma.walletAccount.upsert({
        where: { userId },
        create: { userId, balanceCents: 0 },
        update: {},
      });

      // Idempotency — skip if this PaymentIntent was already credited
      const existing = await prisma.walletTxn.findFirst({
        where: { walletId: wallet.id, memo: `stripe_pi:${piId}` },
      });
      if (existing) break;

      await prisma.$transaction([
        prisma.walletTxn.create({
          data: { walletId: wallet.id, type: "TOPUP", amountCents, memo: `stripe_pi:${piId}` },
        }),
        prisma.walletAccount.update({
          where: { id: wallet.id },
          data: { balanceCents: { increment: amountCents } },
        }),
      ]);
      break;
    }

    // Subscription activated or renewed successfully
    case "invoice.payment_succeeded": {
      const subId = obj.subscription as string | undefined;
      const venueId = await resolveVenueId(
        obj.metadata ?? obj.subscription_details?.metadata ?? null,
        subId,
      );
      if (!venueId) break;
      const periodStart = new Date((obj.period_start ?? obj.lines?.data?.[0]?.period?.start ?? 0) * 1000);
      const periodEnd   = new Date((obj.period_end   ?? obj.lines?.data?.[0]?.period?.end   ?? 0) * 1000);
      // Idempotency — skip if we already have this invoice period
      const existing = await prisma.subscriptionPayment.findFirst({
        where: { venueId, stripeId: subId, periodStart },
      });
      if (existing) break;
      await prisma.venue.update({
        where: { id: venueId },
        data: { plan: "PRO", subscriptionStartedAt: periodStart, subscriptionEndsAt: periodEnd },
      });
      await prisma.subscriptionPayment.create({
        data: {
          venueId,
          amountCents: PRO_PRICE_CENTS,
          paidAt: new Date(),
          periodStart,
          periodEnd,
          stripeId: subId ?? "",
          status: "PAID",
        },
      });
      break;
    }

    // Subscription cancelled or payment failed past grace period
    case "customer.subscription.deleted": {
      const deletedSubId = obj.id as string;
      const venueId = await resolveVenueId(obj.metadata ?? null, deletedSubId);
      if (!venueId) break;

      // Only downgrade if the cancelled subscription is the one we have on record.
      // Cancelling old duplicate test subscriptions must not trigger a downgrade.
      const currentPmt = await prisma.subscriptionPayment.findFirst({
        where: { venueId },
        orderBy: { paidAt: "desc" },
        select: { stripeId: true },
      });
      if (currentPmt?.stripeId !== deletedSubId) {
        console.log(`[webhook] subscription.deleted for old/dupe sub ${deletedSubId} — skipping downgrade`);
        break;
      }

      await prisma.venue.update({
        where: { id: venueId },
        data: { plan: "FREE", subscriptionEndsAt: new Date(), subscriptionCancelledAt: null },
      });
      // Move all active non-draft promotions to draft so customers can't see them
      await prisma.promotion.updateMany({
        where: { venueId, isDraft: false, active: true },
        data: { isDraft: true, active: false },
      });
      break;
    }

    // Payment attempt failed
    case "invoice.payment_failed": {
      const subIdFailed = obj.subscription as string | undefined;
      const venueId = await resolveVenueId(
        obj.metadata ?? obj.subscription_details?.metadata ?? null,
        subIdFailed,
      );
      if (!venueId) break;
      // Log a failed payment row for transparency
      const periodStart = new Date((obj.period_start ?? 0) * 1000);
      const periodEnd   = new Date((obj.period_end ?? 0) * 1000);
      await prisma.subscriptionPayment.create({
        data: {
          venueId,
          amountCents: PRO_PRICE_CENTS,
          paidAt: new Date(),
          periodStart,
          periodEnd,
          stripeId: subIdFailed ?? "",
          status: "FAILED",
        },
      });
      break;
    }

    default:
      // Ignore unknown events
      break;
  }

  return NextResponse.json({ ok: true });
}
