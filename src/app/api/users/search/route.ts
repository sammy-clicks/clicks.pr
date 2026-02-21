import { NextResponse } from "next/server";
import { prisma, getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// GET /api/users/search?q=username — returns public profiles (no real name)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q },
      role: "USER",
      id: { not: session.sub },
    },
    select: { id: true, username: true, avatarUrl: true },
    take: 10,
  });

  return NextResponse.json({ users });
}
