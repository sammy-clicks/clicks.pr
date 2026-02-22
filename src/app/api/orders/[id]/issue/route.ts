import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const Schema = z.object({ description: z.string().min(10).max(2000) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = Schema.parse(await req.json());

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { venue: { select: { name: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== session.sub)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Generate sequential case number
  const caseCount = await prisma.supportCase.count();
  const caseNumber = `CASE-${String(caseCount + 1).padStart(4, "0")}`;

  const sc = await prisma.supportCase.create({
    data: {
      caseNumber,
      userId: session.sub,
      orderId: params.id,
      description: body.description,
      messages: {
        create: {
          fromRole: "USER",
          senderId: session.sub,
          body: body.description,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, caseNumber: sc.caseNumber, caseId: sc.id });
}
