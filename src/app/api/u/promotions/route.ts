import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

export const dynamic = 'force-dynamic';

// Returns all active promotions from enabled venues, with venue info for distance sorting
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const promotions = await prisma.promotion.findMany({
    where: {
      active: true,
      isDraft: false,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      venue: { isEnabled: true },
    },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      items: true,
      expiresAt: true,
      maxRedeemsPerNightPerUser: true,
      venue: {
        select: {
          id: true,
          name: true,
          type: true,
          lat: true,
          lng: true,
          venueImageUrl: true,
          zone: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Collect up to 4 menuItemIds per promo and fetch their imageUrls in one query
  const allMenuItemIds = new Set<string>();
  const promoItemIdMap = new Map<string, string[]>(); // promoId → menuItemId[]
  for (const p of promotions) {
    try {
      const parsed = JSON.parse((p.items as string) ?? "[]") as Array<{ menuItemId: string }>;
      const ids = parsed.slice(0, 4).map(i => i.menuItemId);
      promoItemIdMap.set(p.id, ids);
      ids.forEach(id => allMenuItemIds.add(id));
    } catch { promoItemIdMap.set(p.id, []); }
  }
  const menuItems = allMenuItemIds.size > 0
    ? await prisma.menuItem.findMany({
        where: { id: { in: Array.from(allMenuItemIds) } },
        select: { id: true, imageUrl: true },
      })
    : [];
  const menuImageMap = new Map(menuItems.map(m => [m.id, m.imageUrl ?? null]));

  return NextResponse.json({
    promotions: promotions.map(p => {
      const itemImages = (promoItemIdMap.get(p.id) ?? [])
        .map(id => menuImageMap.get(id) ?? null)
        .filter((url): url is string => !!url);
      return {
        id: p.id,
        title: p.title,
        description: p.description ?? null,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl ?? null,
        itemImages,
        expiresAt: p.expiresAt?.toISOString() ?? null,
        maxRedeemsPerNightPerUser: p.maxRedeemsPerNightPerUser,
        venue: {
          id: p.venue.id,
          name: p.venue.name,
          type: p.venue.type,
          lat: p.venue.lat,
          lng: p.venue.lng,
          venueImageUrl: p.venue.venueImageUrl ?? null,
          zoneName: p.venue.zone?.name ?? null,
        },
      };
    }),
  });
}
