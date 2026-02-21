import { NextResponse } from "next/server";
import { prisma, getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// POST — toggle pause
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { pausedAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pausedAt = user.pausedAt ? null : new Date();
  await prisma.user.update({ where: { id: session.sub }, data: { pausedAt } });

  return NextResponse.json({ ok: true, paused: pausedAt !== null });
}
