import { NextResponse } from "next/server";
import { prisma, requireRole } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

// POST — activate Boost Hour for this venue (PRO only, once per hour)
export async function POST() {
  const auth = await requireRole(["VENUE"]);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const venue = await prisma.venue.findUnique({
    where: { managerId: auth.session.sub },
    select: { id: true, plan: true, boostActiveUntil: true },
  });
  if (!venue) return NextResponse.json({ error: "Venue not found." }, { status: 404 });
  if (venue.plan !== "PRO")
    return NextResponse.json({ error: "Boost Hour is a PRO feature. Upgrade your plan to use it." }, { status: 403 });

  const now = new Date();
  if (venue.boostActiveUntil && venue.boostActiveUntil > now) {
    const remaining = Math.ceil((venue.boostActiveUntil.getTime() - now.getTime()) / 60000);
    return NextResponse.json({ error: `Boost Hour is already active. ${remaining} minute(s) remaining.` }, { status: 409 });
  }

  const boostActiveUntil = new Date(now.getTime() + 60 * 60 * 1000); // now + 1 hour
  await prisma.venue.update({ where: { id: venue.id }, data: { boostActiveUntil } });

  return NextResponse.json({ ok: true, boostActiveUntil });
}
