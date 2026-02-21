import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/app/api/_utils";

const PostSchema = z.object({ venueId: z.string().min(1) });

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const week = await getOrCreateCurrentWeek();
  const venues = await prisma.venue.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }});

  const grouped = await prisma.vote.groupBy({
    by: ["venueId"],
    where: { weekId: week.id },
    _count: { _all: true },
  });

  const map = new Map(grouped.map(g => [g.venueId, g._count._all]));
  const results = venues
    .map(v => ({ venueId: v.id, venueName: v.name, votes: map.get(v.id) || 0 }))
    .sort((a,b)=>b.votes-a.votes);

  return NextResponse.json({ week: { year: week.year, week: week.week }, venues, results });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "USER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = PostSchema.parse(await req.json());
  const week = await getOrCreateCurrentWeek();

  await prisma.vote.upsert({
    where: { weekId_userId: { weekId: week.id, userId: session.sub } },
    create: { weekId: week.id, userId: session.sub, venueId },
    update: { venueId },
  });

  return NextResponse.json({ ok: true });
}

async function getOrCreateCurrentWeek() {
  // Use existing weekCycle if present, else create.
  const now = new Date();
  const info = getWeekInfo(now);
  const cycle = buildWeekCycle(now);

  return prisma.weekCycle.upsert({
    where: { year_week: { year: info.year, week: info.week } },
    create: { year: info.year, week: info.week, startsAt: cycle.startsAt, endsAt: cycle.endsAt },
    update: { startsAt: cycle.startsAt, endsAt: cycle.endsAt },
  });
}

function getWeekInfo(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function buildWeekCycle(now: Date) {
  const end = new Date(now);
  end.setHours(4,0,0,0);
  while (end.getTime() <= now.getTime() || end.getDay() !== 1) {
    end.setDate(end.getDate() + 1);
    end.setHours(4,0,0,0);
  }
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  start.setHours(4,0,0,0);
  return { startsAt: start, endsAt: end };
}
