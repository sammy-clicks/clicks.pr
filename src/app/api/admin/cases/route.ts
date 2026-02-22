import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cases = await prisma.supportCase.findMany({
    include: {
      user: { select: { username: true, firstName: true, lastName: true, email: true } },
      order: {
        select: {
          orderNumber: true, totalCents: true, status: true,
          venue: { select: { name: true } },
          items: { select: { name: true, qty: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ cases });
}

const ReplySchema = z.object({ caseId: z.string(), message: z.string().min(1) });
const StatusSchema = z.object({ caseId: z.string(), status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "CLOSED"]) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.action === "status") {
    const { caseId, status } = StatusSchema.parse(body);
    await prisma.supportCase.update({ where: { id: caseId }, data: { status } });
    return NextResponse.json({ ok: true });
  }

  // Default: add reply message
  const { caseId, message } = ReplySchema.parse(body);
  const sc = await prisma.supportCase.findUnique({ where: { id: caseId } });
  if (!sc) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.caseMessage.create({
      data: { caseId, fromRole: "ADMIN", senderId: session.sub, body: message },
    }),
    prisma.supportCase.update({ where: { id: caseId }, data: { status: "REVIEWING", updatedAt: new Date() } }),
  ]);

  return NextResponse.json({ ok: true });
}
