import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/app/api/_utils";
import stripe from "@/lib/stripe";

export const dynamic = 'force-dynamic';

const MIN_DOLLARS = 10;
const MAX_DOLLARS = 5000;

const Schema = z.object({
  dollars: z.number().min(MIN_DOLLARS).max(MAX_DOLLARS),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: `Amount must be between $${MIN_DOLLARS} and $${MAX_DOLLARS}.` },
      { status: 400 }
    );

  const amountCents = Math.round(parsed.data.dollars * 100);

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    description: "Clicks Credits",
    metadata: { userId: session.sub, amountCents: String(amountCents) },
    // Allow cards; no redirects (keeps the user in-app)
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
