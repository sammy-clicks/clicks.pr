// Load .env so DATABASE_URL is available when running locally
import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function randPass() {
  return Math.random().toString(36).slice(2, 10) + "!A9";
}

async function main() {
  const email = "admin@clicks.local";
  const password = randPass();
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      role: "ADMIN",
      firstName: "Admin",
      lastName: "Clicks",
      birthdate: new Date("1990-01-01"),
      country: "PR",
      email,
      passwordHash,
    },
    update: {
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log("Admin created/updated:");
  console.log("Email:", admin.email);
  console.log("Password:", password);
}

main().finally(async () => prisma.$disconnect());
