import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.municipality.updateMany({ data: { defaultAlcoholCutoffMins: 120 } });
  console.log("Updated", r.count, "municipalities to 2:00am cutoff (120 mins)");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
