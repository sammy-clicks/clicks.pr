import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const [wallet, totalTxns] = await Promise.all([
    prisma.walletAccount.findUnique({
      where: { userId: session.sub },
      include: {
        txns: {
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        },
      },
    }),
    prisma.walletTxn.count({
      where: { wallet: { userId: session.sub } },
    }),
  ]);

  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  return NextResponse.json({
    balanceCents: wallet.balanceCents,
    txns: wallet.txns,
    totalTxns,
    page,
    totalPages: Math.max(1, Math.ceil(totalTxns / PAGE_SIZE)),
  });
}
