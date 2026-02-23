import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const Schema = z.object({ code: z.string().length(4) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({ where: { managerId: session.sub } });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  const { code } = Schema.parse(await req.json());

  // Find a READY order at this venue with matching code
  const order = await prisma.order.findFirst({
    where: {
      venueId: venue.id,
      orderCode: code,
      status: { in: ["READY", "ACCEPTED", "PREPARING"] },
    },
    include: {
      items: true,
      user: { select: { username: true, firstName: true, lastName: true } },
    },
  });

  if (!order)
    return NextResponse.json({ error: "Wrong code" }, { status: 404 });

  // Transition to COMPLETED
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    orderNumber: order.orderNumber,
    orderId: order.id,
    customer: `${order.user.firstName} ${order.user.lastName ?? ""}`.trim(),
    username: order.user.username,
    totalCents: order.totalCents,
    items: order.items.map(i => `${i.qty}x ${i.name}`).join(", "),
  });
}
