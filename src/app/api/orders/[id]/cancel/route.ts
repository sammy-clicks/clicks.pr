import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { venue: { select: { name: true } } },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== session.sub)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Users can only cancel while PLACED (not yet accepted)
  if (order.status !== "PLACED")
    return NextResponse.json({ error: "Order can no longer be cancelled — it has already been accepted." }, { status: 400 });

  // Wallet for refund
  const wallet = await prisma.walletAccount.findUnique({ where: { userId: session.sub } });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 500 });

  await prisma.$transaction([
    prisma.order.update({
      where: { id: params.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    }),
    prisma.walletTxn.create({
      data: {
        walletId: wallet.id,
        type: "REFUND",
        amountCents: order.totalCents,
        memo: `Refund — cancelled order ${order.orderNumber ?? params.id} at ${order.venue.name}`,
      },
    }),
    prisma.walletAccount.update({
      where: { id: wallet.id },
      data: { balanceCents: { increment: order.totalCents } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    venueName: order.venue.name,
    refundCents: order.totalCents,
    orderNumber: order.orderNumber,
  });
}
