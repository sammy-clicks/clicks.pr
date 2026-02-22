import { NextResponse } from "next/server";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// Build UTC midnight boundaries for last N days
function buildDayBuckets(days: number) {
  const buckets: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const start = new Date(d);
    const end = new Date(d);
    end.setUTCDate(end.getUTCDate() + 1);
    const label = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    buckets.push({ label, start, end });
  }
  return buckets;
}

// Build monthly buckets for last N months (for all-time view)
function buildMonthBuckets(months: number) {
  const buckets: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const start = new Date(d);
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const label = `${d.getUTCMonth() + 1}/${String(d.getUTCFullYear()).slice(2)}`;
    buckets.push({ label, start, end });
  }
  return buckets;
}

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const daysParam = parseInt(searchParams.get("days") ?? "7");
  const allTime = daysParam === 0;
  const days = allTime ? 90 : Math.min(Math.max(daysParam, 1), 90);

  const rangeStart = allTime ? new Date("2020-01-01") : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since = new Date(Date.now() - 120 * 60 * 1000);
  const buckets = allTime ? buildMonthBuckets(12) : buildDayBuckets(days);

  const [
    totalUsers,
    totalVenues,
    proVenues,
    totalOrders,
    activeNow,
    allSignups,
    allCheckins,
    allClicks,
    allOrders,
    weeklyVotes,
    zoneActivity,
    topClickUsers,
    completedOrders,
    paidRedemptions,
    subscriptionPayments,
    activePromotions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.venue.count(),
    prisma.venue.count({ where: { plan: "PRO" } }),
    prisma.order.count(),
    prisma.checkIn.count({ where: { endAt: null, startAt: { gte: since } } }),
    // Raw events for daily breakdown
    prisma.user.findMany({ where: { createdAt: { gte: rangeStart }, role: "USER" }, select: { createdAt: true } }),
    prisma.checkIn.findMany({ where: { startAt: { gte: rangeStart } }, select: { startAt: true } }),
    prisma.clickEvent.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true, totalCents: true } }),
    prisma.vote.groupBy({
      by: ["venueId"],
      _count: { _all: true },
      orderBy: { _count: { venueId: "desc" } },
      take: 5,
    }),
    prisma.zone.findMany({
      select: { id: true, name: true, isEnabled: true, venues: { select: { id: true, _count: { select: { checkins: true } } } } },
    }),
    prisma.clickEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: rangeStart } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    }),
    // For revenue commission calculations (all-time totals)
    prisma.order.findMany({
      where: { status: "COMPLETED" },
      select: { totalCents: true, completedAt: true },
    }),
    prisma.redemption.findMany({
      where: { paidCents: { gt: 0 } },
      select: { paidCents: true, createdAt: true },
    }),
    prisma.subscriptionPayment.findMany({
      where: { status: "PAID" },
      select: { amountCents: true, paidAt: true },
    }),
    // Active promotions for admin overview
    prisma.promotion.findMany({
      where: { active: true, isDraft: false, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
      select: {
        id: true,
        title: true,
        priceCents: true,
        expiresAt: true,
        _count: { select: { redemptions: true } },
        venue: {
          select: {
            name: true,
            zone: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Daily bucketing helper
  function bucket<T>(rows: T[], getDate: (r: T) => Date) {
    return buckets.map(b => ({
      label: b.label,
      count: rows.filter(r => { const d = getDate(r); return d >= b.start && d < b.end; }).length,
    }));
  }

  const daily = {
    signups:  bucket(allSignups,  r => r.createdAt),
    checkins: bucket(allCheckins, r => r.startAt),
    clicks:   bucket(allClicks,   r => r.createdAt),
    orders:   bucket(allOrders,   r => r.createdAt),
  };

  // Revenue (window-based, for chart reference)
  const revenueTotal = allOrders.reduce((s, o) => s + (o.totalCents ?? 0), 0);
  const revenueToday = allOrders
    .filter(o => o.createdAt >= dayAgo)
    .reduce((s, o) => s + (o.totalCents ?? 0), 0);

  // Commission revenue breakdown (all-time, Clicks' earnings)
  const orderCommissionCents    = Math.round(completedOrders.reduce((s, o) => s + (o.totalCents ?? 0), 0) * 0.15);
  const promoCommissionCents    = Math.round(paidRedemptions.reduce((s, r) => s + r.paidCents, 0) * 0.15);
  const subscriptionRevenueCents = subscriptionPayments.reduce((s, p) => s + p.amountCents, 0);
  const totalRevenueCents       = orderCommissionCents + promoCommissionCents + subscriptionRevenueCents;

  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const orderCommToday   = Math.round(completedOrders.filter(o => o.completedAt && o.completedAt >= todayStart).reduce((s, o) => s + (o.totalCents ?? 0), 0) * 0.15);
  const promoCommToday   = Math.round(paidRedemptions.filter(r => r.createdAt >= todayStart).reduce((s, r) => s + r.paidCents, 0) * 0.15);
  const subRevToday      = subscriptionPayments.filter(p => p.paidAt >= todayStart).reduce((s, p) => s + p.amountCents, 0);
  const todayRevenueCents = orderCommToday + promoCommToday + subRevToday;

  // Shape active promotions
  const activePromos = activePromotions.map(p => ({
    id: p.id,
    title: p.title,
    venueName: p.venue.name,
    zoneName: p.venue.zone?.name ?? "—",
    priceCents: p.priceCents,
    expiresAt: p.expiresAt,
    redeemsCount: p._count.redemptions,
  }));

  // Enrich weekly votes
  const topVenueIds = weeklyVotes.map(v => v.venueId);
  const topVenueRows = await prisma.venue.findMany({
    where: { id: { in: topVenueIds } },
    select: { id: true, name: true },
  });
  const venueMap = new Map(topVenueRows.map(v => [v.id, v.name]));
  const topVotes = weeklyVotes.map(v => ({
    venueId: v.venueId,
    name: venueMap.get(v.venueId) ?? "Unknown",
    votes: v._count._all,
  }));

  // Top clickers with username
  const topClickUserIds = topClickUsers.map(u => u.userId);
  const topClickUserRows = await prisma.user.findMany({
    where: { id: { in: topClickUserIds }, ghostMode: false },
    select: { id: true, username: true },
  });
  const userMap = new Map(topClickUserRows.map(u => [u.id, u.username]));
  const topClickers = topClickUsers
    .filter(u => userMap.has(u.userId))
    .map((u, i) => ({ rank: i + 1, username: userMap.get(u.userId)!, clicks: u._count._all }));

  // Zone activity
  const zoneVenueMap = new Map(zoneActivity.map(z => [z.id, z.venues.map(v => v.id)]));
  const activeByCounts = await prisma.checkIn.groupBy({
    by: ["venueId"],
    where: { endAt: null, startAt: { gte: since } },
    _count: { _all: true },
  });
  const activeByVenue = new Map(activeByCounts.map(c => [c.venueId, c._count._all]));
  const zones = zoneActivity.map(z => ({
    name: z.name,
    isEnabled: z.isEnabled,
    venueCount: z.venues.length,
    active: (zoneVenueMap.get(z.id) || []).reduce((s, vid) => s + (activeByVenue.get(vid) || 0), 0),
  }));

  return NextResponse.json({
    days: allTime ? 0 : days,
    allTime,
    totals: { users: totalUsers, venues: totalVenues, proVenues, orders: totalOrders, activeNow },
    revenue: {
      // Window-based gross (for backward compat)
      totalCents: revenueTotal,
      todayCents: revenueToday,
      // Clicks' actual earnings (commissions + subscriptions)
      orderCommissionCents,
      promoCommissionCents,
      subscriptionRevenueCents,
      totalRevenueCents,
      todayRevenueCents,
    },
    daily,
    topVotes,
    topClickers,
    zones,
    activePromotions: activePromos,
  });
}
