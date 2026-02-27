import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

const OPEN = ["PLACED", "ACCEPTED", "PREPARING", "READY"];
const PAGE_SIZE = 10;

function periodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":  return new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:    return null; // all-time
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "VENUE")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const venue = await prisma.venue.findUnique({ where: { managerId: session.sub } });
  if (!venue) return NextResponse.json({ error: "No venue linked." }, { status: 404 });

  if (venue.plan !== "PRO")
    return NextResponse.json({ error: "Analytics is a PRO feature. Upgrade to access order analytics." }, { status: 403 });

  const url    = new URL(req.url);
  const period = url.searchParams.get("period") ?? "24h";
  const page   = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const since  = periodStart(period);

  const where = {
    venueId: venue.id,
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  // Fetch all orders in period (analytics) — include items
  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      user: { select: { username: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const completed = orders.filter(o => o.status === "COMPLETED");
  const cancelled = orders.filter(o => o.status === "CANCELLED");

  const revenue     = completed.reduce((s, o) => s + o.totalCents, 0);
  const avgOrder    = completed.length ? Math.round(revenue / completed.length) : 0;

  // Top items by revenue
  const itemMap: Record<string, { name: string; qty: number; revenueCents: number }> = {};
  for (const o of completed) {
    for (const i of o.items) {
      if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, qty: 0, revenueCents: 0 };
      itemMap[i.name].qty        += i.qty;
      itemMap[i.name].revenueCents += i.priceCents * i.qty;
    }
  }
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 8);

  // Closed orders for recent table (paginated)
  const closed      = orders.filter(o => !OPEN.includes(o.status));
  const totalPages  = Math.max(1, Math.ceil(closed.length / PAGE_SIZE));
  const recentSlice = closed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({
    period,
    analytics: {
      revenue,
      orderCount:     orders.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      avgOrderCents:  avgOrder,
      topItems,
    },
    recent:      recentSlice,
    recentTotal: closed.length,
    totalPages,
    page,
  });
}
