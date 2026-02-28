import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/app/api/_utils";
import stripe from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Schema = z.object({ piId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { piId } = parsed.data;

  // Retrieve the PaymentIntent from Stripe to confirm it genuinely succeeded
  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  if (pi.status !== "succeeded")
    return NextResponse.json({ error: "Payment not yet confirmed." }, { status: 402 });

  // Guard: ensure this PI belongs to this user
  const metaUserId = pi.metadata?.userId;
  if (metaUserId !== session.sub)
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });

  const amountCents = parseInt(pi.metadata?.amountCents ?? "0", 10);
  if (!amountCents)
    return NextResponse.json({ error: "Invalid amount." }, { status: 400 });

  // Upsert wallet
  const wallet = await prisma.walletAccount.upsert({
    where: { userId: session.sub },
    create: { userId: session.sub, balanceCents: 0 },
    update: {},
  });

  // Idempotency — skip if this PaymentIntent was already credited
  const existing = await prisma.walletTxn.findFirst({
    where: { walletId: wallet.id, memo: `stripe_pi:${piId}` },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.walletTxn.create({
        data: {
          walletId: wallet.id,
          type: "TOPUP",
          amountCents,
          memo: `stripe_pi:${piId}`,
        },
      }),
      prisma.walletAccount.update({
        where: { id: wallet.id },
        data: { balanceCents: { increment: amountCents } },
      }),
    ]);
  }

  // Return fresh balance
  const updated = await prisma.walletAccount.findUnique({ where: { userId: session.sub } });
  return NextResponse.json({ ok: true, balanceCents: updated?.balanceCents ?? 0 });
}
