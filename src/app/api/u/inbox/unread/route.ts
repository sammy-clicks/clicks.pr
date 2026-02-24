import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ count: 0 });

  const count = await prisma.directMessage.count({
    where: {
      senderId: { not: session.sub },
      readAt: null,
      conversation: {
        OR: [{ user1Id: session.sub }, { user2Id: session.sub }],
      },
    },
  });

  return NextResponse.json({ count });
}
