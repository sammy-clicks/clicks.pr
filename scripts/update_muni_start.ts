import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.municipality.updateMany({ data: { defaultAlcoholStartMins: 360 } });
  console.log("Updated", r.count, "municipalities to 6:00am start");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
