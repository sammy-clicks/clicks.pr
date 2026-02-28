/**
 * _reset_db.ts
 *
 * Wipes ALL user/venue data for a fresh launch.
 * Preserves: Municipality, Zone  (reference data — never deleted)
 * Recreates:  admin user + current WeekCycle via seed logic
 *
 * Usage (from project root):
 *   npx ts-node --project tsconfig.json scripts/_reset_db.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Admin credentials (mirrors seed.ts) ──────────────────────────────────────
const ADMIN_EMAIL    = "admin@clicks.pr";
const ADMIN_PASSWORD = "ClicksAdmin1!";

async function main() {
  console.log("🗑️  Starting full database reset...\n");

  // ── 1. Delete leaf nodes first (FK order) ────────────────────────────────
  await prisma.directMessage.deleteMany();
  console.log("  ✓ DirectMessage");

  await prisma.conversation.deleteMany();
  console.log("  ✓ Conversation");

  await prisma.caseMessage.deleteMany();
  console.log("  ✓ CaseMessage");

  await prisma.supportCase.deleteMany();
  console.log("  ✓ SupportCase");

  await prisma.venuePayout.deleteMany();
  console.log("  ✓ VenuePayout");

  await prisma.orderItem.deleteMany();
  console.log("  ✓ OrderItem");

  await prisma.order.deleteMany();
  console.log("  ✓ Order");

  await prisma.redemption.deleteMany();
  console.log("  ✓ Redemption");

  await prisma.promotion.deleteMany();
  console.log("  ✓ Promotion");

  await prisma.mixer.deleteMany();
  console.log("  ✓ Mixer");

  await prisma.menuItem.deleteMany();
  console.log("  ✓ MenuItem");

  await prisma.subscriptionPayment.deleteMany();
  console.log("  ✓ SubscriptionPayment");

  await prisma.weeklyPick.deleteMany();
  console.log("  ✓ WeeklyPick");

  await prisma.vote.deleteMany();
  console.log("  ✓ Vote");

  await prisma.weekCycle.deleteMany();
  console.log("  ✓ WeekCycle");

  await prisma.walletTxn.deleteMany();
  console.log("  ✓ WalletTxn");

  await prisma.walletAccount.deleteMany();
  console.log("  ✓ WalletAccount");

  await prisma.clickEvent.deleteMany();
  console.log("  ✓ ClickEvent");

  await prisma.checkIn.deleteMany();
  console.log("  ✓ CheckIn");

  await prisma.buddy.deleteMany();
  console.log("  ✓ Buddy");

  // Venue soft-deletes & manager FK — nullify manager first to avoid circular FK
  await prisma.venue.updateMany({ data: { managerId: null } });
  await prisma.venue.deleteMany();
  console.log("  ✓ Venue");

  // Delete all non-admin users, then admin
  await prisma.user.deleteMany();
  console.log("  ✓ User (all)\n");

  // ── 2. Re-seed admin user ─────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      role: "ADMIN",
      username: "admin",
      firstName: "Admin",
      lastName: "Clicks",
      birthdate: new Date("1990-01-01"),
      country: "PR",
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
    },
    update: { role: "ADMIN" },
  });
  console.log(`  ✓ Admin recreated → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // ── 3. Re-seed current WeekCycle ──────────────────────────────────────────
  const now = new Date();
  const weekInfo = getWeekInfo(now);
  const cycle    = buildWeekCycle(now, weekInfo.year, weekInfo.week);
  await prisma.weekCycle.upsert({
    where: { year_week: { year: weekInfo.year, week: weekInfo.week } },
    create: { year: weekInfo.year, week: weekInfo.week, startsAt: cycle.startsAt, endsAt: cycle.endsAt },
    update: { startsAt: cycle.startsAt, endsAt: cycle.endsAt },
  });
  console.log(`  ✓ WeekCycle created  →  ${weekInfo.year} W${weekInfo.week}`);

  console.log("\n✅  Database reset complete. Municipalities & Zones untouched.");
}

// ── Helpers (mirrors seed.ts) ─────────────────────────────────────────────────
function getWeekInfo(d: Date) {
  const date   = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function buildWeekCycle(now: Date, year: number, week: number) {
  const end = new Date(now);
  end.setHours(4, 0, 0, 0);
  while (end.getTime() <= now.getTime() || end.getDay() !== 1) {
    end.setDate(end.getDate() + 1);
    end.setHours(4, 0, 0, 0);
  }
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  start.setHours(4, 0, 0, 0);
  return { startsAt: start, endsAt: end };
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
