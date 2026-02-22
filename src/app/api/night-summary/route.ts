import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

// Night window starts at 6pm PR time (UTC-4 = 22:00 UTC)
// Stats reset at 4:00am PR time (= 08:00 UTC)
function getNightWindowStart(): Date {
  const prMs = Date.now() - 4 * 60 * 60 * 1000;
  const prDate = new Date(prMs);
  const hoursPR = prDate.getUTCHours();
  const start = new Date(prDate);
  start.setUTCHours(22, 0, 0, 0); // 6pm PR = 22:00 UTC
  // Before 4am PR we are still in last night's window
  if (hoursPR < 4) start.setUTCDate(start.getUTCDate() - 1);
  return start;
}

function getNextResetTime(): Date {
  const prMs = Date.now() - 4 * 60 * 60 * 1000;
  const prDate = new Date(prMs);
  const hoursPR = prDate.getUTCHours();
  const reset = new Date(prDate);
  reset.setUTCHours(8, 0, 0, 0); // 4am PR = 08:00 UTC
  if (hoursPR >= 4) reset.setUTCDate(reset.getUTCDate() + 1);
  return reset;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nightStart = getNightWindowStart();
  const resetAt = getNextResetTime();

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, firstName: true, ghostMode: true },
  });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Own data
  const [checkins, orders, clickCount] = await Promise.all([
    prisma.checkIn.findMany({
      where: { userId: session.sub, startAt: { gte: nightStart } },
      include: { venue: { select: { name: true, type: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.order.findMany({
      where: { userId: session.sub, createdAt: { gte: nightStart } },
      include: {
        items: { select: { name: true, qty: true } },
        venue: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clickEvent.count({
      where: { userId: session.sub, createdAt: { gte: nightStart } },
    }),
  ]);

  const totalSpentCents = orders.reduce((s, o) => s + o.totalCents, 0);

  // Accepted friends
  const buddies = await prisma.buddy.findMany({
    where: {
      OR: [
        { senderId: session.sub, status: "ACCEPTED" },
        { receiverId: session.sub, status: "ACCEPTED" },
      ],
    },
    include: {
      sender:   { select: { id: true, username: true, ghostMode: true } },
      receiver: { select: { id: true, username: true, ghostMode: true } },
    },
  });

  const friendUsers = buddies.map(b =>
    b.senderId === session.sub ? b.receiver : b.sender,
  );

  const friendStats = await Promise.all(
    friendUsers.map(async friend => {
      if (friend.ghostMode) {
        return {
          friendId: friend.id,
          username: friend.username,
          ghostMode: true,
          venuesVisited: [] as { venueName: string }[],
          ordersCount: 0,
          orders: [] as { venueName: string; items: { name: string; qty: number }[] }[],
          clicksCount: 0,
        };
      }
      const [fCheckins, fOrders, fClicks] = await Promise.all([
        prisma.checkIn.findMany({
          where: { userId: friend.id, startAt: { gte: nightStart } },
          include: { venue: { select: { name: true } } },
        }),
        prisma.order.findMany({
          where: { userId: friend.id, createdAt: { gte: nightStart } },
          include: {
            items: { select: { name: true, qty: true } },
            venue: { select: { name: true } },
          },
        }),
        prisma.clickEvent.count({
          where: { userId: friend.id, createdAt: { gte: nightStart } },
        }),
      ]);
      return {
        friendId: friend.id,
        username: friend.username,
        ghostMode: false,
        venuesVisited: fCheckins.map(c => ({ venueName: c.venue.name })),
        ordersCount: fOrders.length,
        orders: fOrders.map(o => ({
          venueName: o.venue.name,
          items: o.items.map(i => ({ name: i.name, qty: i.qty })),
        })),
        clicksCount: fClicks,
      };
    }),
  );

  // Rank by orders among me + non-ghost friends (1 = most orders)
  const myOrderCount = orders.length;
  const allCounts = [myOrderCount, ...friendStats.filter(f => !f.ghostMode).map(f => f.ordersCount)];
  allCounts.sort((a, b) => b - a);
  const orderRankAmongFriends = allCounts.indexOf(myOrderCount) + 1;

  return NextResponse.json({
    me: { firstName: me.firstName, ghostMode: me.ghostMode },
    nightStart,
    resetAt,
    checkins: checkins.map(c => ({
      id: c.id,
      venueName: c.venue.name,
      venueType: c.venue.type,
      startAt: c.startAt,
      endAt: c.endAt,
    })),
    orders: orders.map(o => ({
      id: o.id,
      venueName: o.venue.name,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
      itemCount: o.items.reduce((s, i) => s + i.qty, 0),
    })),
    clicks: clickCount,
    totalSpentCents,
    orderRankAmongFriends,
    friends: friendStats,
  });
}
