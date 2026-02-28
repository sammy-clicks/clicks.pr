/**
 * wipe_for_launch.ts
 * Deletes all transactional/user data while keeping:
 *   - Municipalities + Zones (location structure)
 *   - The single ADMIN user
 * Run: npx tsx scripts/wipe_for_launch.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Finding admin user…");
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) { console.error("❌ No ADMIN user found — aborting."); process.exit(1); }
  console.log(`✅ Keeping admin: @${admin.username} (${admin.email})`);

  console.log("\n🗑  Wiping data in dependency order…");

  // 1. Messages
  const dm  = await prisma.directMessage.deleteMany();
  console.log(`   DirectMessages:       ${dm.count}`);
  const conv = await prisma.conversation.deleteMany();
  console.log(`   Conversations:        ${conv.count}`);

  // 2. Support cases
  const cm = await prisma.caseMessage.deleteMany();
  console.log(`   CaseMessages:         ${cm.count}`);
  const sc = await prisma.supportCase.deleteMany();
  console.log(`   SupportCases:         ${sc.count}`);

  // 3. Orders
  const oi = await prisma.orderItem.deleteMany();
  console.log(`   OrderItems:           ${oi.count}`);
  const or = await prisma.order.deleteMany();
  console.log(`   Orders:               ${or.count}`);

  // 4. Promotions & redemptions
  const red = await prisma.redemption.deleteMany();
  console.log(`   Redemptions:          ${red.count}`);
  const promo = await prisma.promotion.deleteMany();
  console.log(`   Promotions:           ${promo.count}`);

  // 5. Activity
  const ce = await prisma.clickEvent.deleteMany();
  console.log(`   ClickEvents:          ${ce.count}`);
  const ci = await prisma.checkIn.deleteMany();
  console.log(`   CheckIns:             ${ci.count}`);

  // 6. Wallet
  const wt = await prisma.walletTxn.deleteMany();
  console.log(`   WalletTxns:           ${wt.count}`);
  const wa = await prisma.walletAccount.deleteMany();
  console.log(`   WalletAccounts:       ${wa.count}`);

  // 7. Social
  const bud = await prisma.buddy.deleteMany();
  console.log(`   Buddies:              ${bud.count}`);

  // 8. Leaderboard / voting
  const vote = await prisma.vote.deleteMany();
  console.log(`   Votes:                ${vote.count}`);
  const wp = await prisma.weeklyPick.deleteMany();
  console.log(`   WeeklyPicks:          ${wp.count}`);
  const wc = await prisma.weekCycle.deleteMany();
  console.log(`   WeekCycles:           ${wc.count}`);

  // 9. Venue subscriptions + menu
  const sp = await prisma.subscriptionPayment.deleteMany();
  console.log(`   SubscriptionPayments: ${sp.count}`);
  const mix = await prisma.mixer.deleteMany();
  console.log(`   Mixers:               ${mix.count}`);
  const mi = await prisma.menuItem.deleteMany();
  console.log(`   MenuItems:            ${mi.count}`);
  const ven = await prisma.venue.deleteMany();
  console.log(`   Venues:               ${ven.count}`);

  // 10. All users except admin
  const usr = await prisma.user.deleteMany({ where: { id: { not: admin.id } } });
  console.log(`   Users (non-admin):    ${usr.count}`);

  console.log(`\n✅ Done. Admin @${admin.username} is the only remaining user.`);
  console.log("   Municipalities and Zones were left intact.\n");
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
