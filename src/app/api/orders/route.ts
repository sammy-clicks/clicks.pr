import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

const SEND_LIMIT_CENTS = 50000; // $500/day

function isAlcoholBlocked(cutoffMins: number): boolean {
  const prMs = Date.now() - 4 * 60 * 60 * 1000;
  const prDate = new Date(prMs);
  const mins = prDate.getUTCHours() * 60 + prDate.getUTCMinutes();
  return mins >= cutoffMins && mins < 720;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: session.sub },
    include: { items: true, venue: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({ orders });
}

const ItemSchema = z.object({ menuItemId: z.string(), qty: z.number().int().min(1) });
const PostSchema = z.object({
  venueId: z.string(),
  items: z.array(ItemSchema).min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = PostSchema.parse(await req.json());

  // Must be checked in at venue
  const checkIn = await prisma.checkIn.findFirst({
    where: { userId: session.sub, venueId: body.venueId, endAt: null },
  });
  if (!checkIn)
    return NextResponse.json({ error: "You must be checked in at this venue to order." }, { status: 403 });

  // Fetch venue + municipality for cutoff
  const venue = await prisma.venue.findUnique({
    where: { id: body.venueId },
    include: { municipality: true },
  });
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  const cutoffMins = venue.alcoholCutoffOverrideMins ?? venue.municipality.defaultAlcoholCutoffMins;

  // Resolve menu items
  const menuItemIds = body.items.map(i => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, venueId: body.venueId, isAvailable: true },
  });
  if (menuItems.length !== menuItemIds.length)
    return NextResponse.json({ error: "One or more items are unavailable." }, { status: 400 });

  // Alcohol cutoff check
  const wantsAlcohol = menuItems.some(m => m.isAlcohol && body.items.find(i => i.menuItemId === m.id));
  if (wantsAlcohol && isAlcoholBlocked(cutoffMins))
    return NextResponse.json({ error: "Alcohol service has ended for this venue." }, { status: 403 });

  // Compute total
  const itemMap = new Map(menuItems.map(m => [m.id, m]));
  let totalCents = 0;
  const orderItems = body.items.map(i => {
    const m = itemMap.get(i.menuItemId)!;
    totalCents += m.priceCents * i.qty;
    return { menuItemId: m.id, name: m.name, priceCents: m.priceCents, qty: i.qty, isAlcohol: m.isAlcohol };
  });

  // Daily send limit
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const todaySpend = await prisma.walletTxn.aggregate({
    where: {
      wallet: { userId: session.sub },
      type: "TRANSFER_OUT",
      createdAt: { gte: dayStart },
    },
    _sum: { amountCents: true },
  });
  if ((todaySpend._sum.amountCents ?? 0) + totalCents > SEND_LIMIT_CENTS)
    return NextResponse.json({ error: "Daily spending limit ($500) reached." }, { status: 403 });

  // Wallet check
  const wallet = await prisma.walletAccount.findUnique({ where: { userId: session.sub } });
  if (!wallet || wallet.balanceCents < totalCents)
    return NextResponse.json({ error: "Insufficient wallet balance." }, { status: 402 });

  // Atomic transaction: create order, deduct wallet
  const orderCode = String(Math.floor(100000 + Math.random() * 900000));

  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        orderCode,
        userId: session.sub,
        venueId: body.venueId,
        totalCents,
        items: { create: orderItems },
      },
    }),
    prisma.walletTxn.create({
      data: {
        walletId: wallet.id,
        type: "TRANSFER_OUT",
        amountCents: totalCents,
        memo: `Order at ${venue.name}`,
      },
    }),
    prisma.walletAccount.update({
      where: { id: wallet.id },
      data: { balanceCents: { decrement: totalCents } },
    }),
  ]);

  return NextResponse.json({ ok: true, orderId: order.id, orderCode, venueName: venue.name });
}
