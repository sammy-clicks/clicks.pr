import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { ghostMode: true },
  });
  return NextResponse.json({ ghostMode: user?.ghostMode ?? false });
}

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { ghostMode: true },
  });
  const next = !(user?.ghostMode ?? false);
  await prisma.user.update({ where: { id: session.sub }, data: { ghostMode: next } });
  return NextResponse.json({ ok: true, ghostMode: next });
}
