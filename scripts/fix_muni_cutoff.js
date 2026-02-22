const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.municipality.updateMany({ data: { defaultAlcoholCutoffMins: 120 } })
  .then(r => console.log("Updated", r.count, "municipalities to 2:00am cutoff"))
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
