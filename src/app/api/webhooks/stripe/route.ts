import { NextResponse } from "next/server";
import stripe, { PRO_PRICE_CENTS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Stripe sends raw body — Next.js body parsing must be off
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const raw = await req.arrayBuffer();
  const buf = Buffer.from(raw);

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe webhook] signature check failed:", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const obj = event.data.object as any;

  switch (event.type) {
    // Subscription activated or renewed successfully
    case "invoice.payment_succeeded": {
      const venueId = obj.metadata?.venueId ?? obj.subscription_details?.metadata?.venueId;
      if (!venueId) break;
      const periodStart = new Date((obj.period_start ?? obj.lines?.data?.[0]?.period?.start ?? 0) * 1000);
      const periodEnd   = new Date((obj.period_end   ?? obj.lines?.data?.[0]?.period?.end   ?? 0) * 1000);
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
          stripeId: obj.subscription as string,
          status: "PAID",
        },
      });
      break;
    }

    // Subscription cancelled or payment failed past grace period
    case "customer.subscription.deleted": {
      const venueId = obj.metadata?.venueId;
      if (!venueId) break;
      await prisma.venue.update({
        where: { id: venueId },
        data: { plan: "FREE", subscriptionEndsAt: new Date() },
      });
      break;
    }

    // Payment attempt failed
    case "invoice.payment_failed": {
      const venueId = obj.metadata?.venueId ?? obj.subscription_details?.metadata?.venueId;
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
          stripeId: obj.subscription as string,
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
