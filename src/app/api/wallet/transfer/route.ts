import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const DAILY_SEND_LIMIT_CENTS = 50_000; // $500

const Schema = z.object({
  toEmail: z.string().email(),
  dollars: z.number().positive().multipleOf(0.01),
  memo: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { toEmail, dollars, memo } = Schema.parse(await req.json());
  const amountCents = Math.round(dollars * 100);
  if (amountCents < 100) return NextResponse.json({ error: "Minimum transfer is $1.00" }, { status: 400 });

  const recipient = await prisma.user.findUnique({ where: { email: toEmail } });
  if (!recipient) return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  if (recipient.id === session.sub) return NextResponse.json({ error: "Cannot send to yourself." }, { status: 400 });

  const senderWallet = await prisma.walletAccount.findUnique({ where: { userId: session.sub } });
  if (!senderWallet || senderWallet.balanceCents < amountCents)
    return NextResponse.json({ error: "Insufficient balance." }, { status: 402 });

  // Daily send limit
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.walletTxn.aggregate({
    where: { walletId: senderWallet.id, type: "TRANSFER_OUT", createdAt: { gte: dayStart } },
    _sum: { amountCents: true },
  });
  if ((sentToday._sum.amountCents ?? 0) + amountCents > DAILY_SEND_LIMIT_CENTS)
    return NextResponse.json({ error: "Daily send limit ($500) reached." }, { status: 403 });

  // Upsert recipient wallet
  const recipientWallet = await prisma.walletAccount.upsert({
    where: { userId: recipient.id },
    create: { userId: recipient.id, balanceCents: 0 },
    update: {},
  });

  await prisma.$transaction([
    // Debit sender
    prisma.walletTxn.create({
      data: {
        walletId: senderWallet.id,
        type: "TRANSFER_OUT",
        amountCents,
        memo: memo || `To ${recipient.firstName}`,
        counterpartyUserId: recipient.id,
      },
    }),
    prisma.walletAccount.update({
      where: { id: senderWallet.id },
      data: { balanceCents: { decrement: amountCents } },
    }),
    // Credit recipient
    prisma.walletTxn.create({
      data: {
        walletId: recipientWallet.id,
        type: "TRANSFER_IN",
        amountCents,
        memo: memo || `From ${session.sub}`,
        counterpartyUserId: session.sub,
      },
    }),
    prisma.walletAccount.update({
      where: { id: recipientWallet.id },
      data: { balanceCents: { increment: amountCents } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
