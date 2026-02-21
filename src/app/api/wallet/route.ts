import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wallet = await prisma.walletAccount.findUnique({
    where: { userId: session.sub },
    include: { txns: { orderBy: { createdAt: "desc" }, take: 25 } },
  });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  return NextResponse.json({ balanceCents: wallet.balanceCents, txns: wallet.txns });
}
