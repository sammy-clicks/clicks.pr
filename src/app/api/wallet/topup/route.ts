import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const Schema = z.object({ dollars: z.number().int().min(10) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dollars } = Schema.parse(await req.json());
  const amountCents = dollars * 100;

  const wallet = await prisma.walletAccount.upsert({
    where: { userId: session.sub },
    create: { userId: session.sub, balanceCents: 0 },
    update: {},
  });

  await prisma.walletTxn.create({
    data: { walletId: wallet.id, type: "TOPUP", amountCents, memo: "Mock top-up (replace with Stripe)" },
  });

  await prisma.walletAccount.update({
    where: { id: wallet.id },
    data: { balanceCents: { increment: amountCents } },
  });

  return NextResponse.json({ ok: true });
}
