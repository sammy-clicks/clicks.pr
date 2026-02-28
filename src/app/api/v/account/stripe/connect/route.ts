import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://clickspr.com";

// POST — create or resume Stripe Express onboarding for this venue
export async function POST() {
  const auth = await requireRole(["VENUE"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const venue = await prisma.venue.findFirst({
    where: { manager: { id: auth.session.sub } },
    include: { manager: { select: { email: true } } },
  });
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  // If already fully onboarded, just return the dashboard link
  if (venue.stripeAccountId && venue.stripeOnboarded) {
    const loginLink = await stripe.accounts.createLoginLink(venue.stripeAccountId);
    return NextResponse.json({ url: loginLink.url, alreadyOnboarded: true });
  }

  let accountId = venue.stripeAccountId;

  // Create a new Express account if we don't have one yet
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "PR",
      email: venue.manager?.email ?? undefined,
      capabilities: {
        transfers: { requested: true },
      },
      settings: {
        payouts: { schedule: { interval: "manual" } },
      },
      metadata: { venueId: venue.id },
    });
    accountId = account.id;
    await prisma.venue.update({
      where: { id: venue.id },
      data: { stripeAccountId: accountId },
    });
  }

  // Create (or recreate) the account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/v/account?stripe_refresh=1`,
    return_url:  `${appUrl}/v/account?stripe_return=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url, alreadyOnboarded: false });
}

// GET — return Stripe Express dashboard link for connected venues
export async function GET() {
  const auth = await requireRole(["VENUE"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const venue = await prisma.venue.findFirst({
    where: { manager: { id: auth.session.sub } },
  });
  if (!venue || !venue.stripeAccountId) {
    return NextResponse.json({ connected: false });
  }

  // Fetch live onboarding status from Stripe
  const account = await stripe.accounts.retrieve(venue.stripeAccountId);
  const onboarded = account.charges_enabled ?? false;

  // Sync DB if status changed
  if (onboarded && !venue.stripeOnboarded) {
    await prisma.venue.update({ where: { id: venue.id }, data: { stripeOnboarded: true } });
  }

  let dashboardUrl: string | null = null;
  if (onboarded) {
    const loginLink = await stripe.accounts.createLoginLink(venue.stripeAccountId);
    dashboardUrl = loginLink.url;
  }

  return NextResponse.json({
    connected: true,
    onboarded,
    accountId: venue.stripeAccountId,
    dashboardUrl,
  });
}
