import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

const Schema = z.object({ venueId: z.string() });
const COOLDOWN_MS = 15_000;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = Schema.parse(await req.json());
  const last = await prisma.clickEvent.findFirst({
    where: { userId: session.sub, venueId },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) {
    return NextResponse.json({ error: "Cooldown" }, { status: 429 });
  }

  await prisma.clickEvent.create({ data: { userId: session.sub, venueId }});
  return NextResponse.json({ ok: true });
}
