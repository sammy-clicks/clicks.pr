import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
p.user.findMany({ where: { role: "ADMIN" }, select: { id: true, username: true, email: true, role: true } })
  .then(u => console.log(JSON.stringify(u, null, 2)))
  .finally(() => p.$disconnect());
