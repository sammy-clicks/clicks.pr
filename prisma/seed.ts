import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Default admin credentials — change password after first login via /admin/users
const ADMIN_EMAIL    = "admin@clicks.pr";
const ADMIN_PASSWORD = "ClicksAdmin1!";

async function main() {
  // municipalities (default cutoff 2:00am = 120 mins) — admin can edit later
  for (const name of ["Adjuntas", "Aguada", "Aguadilla", "Aguas Buenas", "Aibonito", "A\u00f1asco", "Arecibo", "Arroyo", "Barceloneta", "Barranquitas", "Bayam\u00f3n", "Cabo Rojo", "Caguas", "Camuy", "Can\u00f3vanas", "Carolina", "Cata\u00f1o", "Cayey", "Ceiba", "Ciales", "Cidra", "Coamo", "Comer\u00edo", "Corozal", "Culebra", "Dorado", "Fajardo", "Florida", "Gu\u00e1nica", "Guayama", "Guayanilla", "Guaynabo", "Gurabo", "Hatillo", "Hormigueros", "Humacao", "Isabela", "Jayuya", "Juana D\u00edaz", "Juncos", "Lajas", "Lares", "Las Mar\u00edas", "Las Piedras", "Lo\u00edza", "Luquillo", "Manat\u00ed", "Maricao", "Maunabo", "Mayag\u00fcez", "Moca", "Morovis", "Naguabo", "Naranjito", "Orocovis", "Patillas", "Pe\u00f1uelas", "Ponce", "Quebradillas", "Rinc\u00f3n", "R\u00edo Grande", "Sabana Grande", "Salinas", "San Germ\u00e1n", "San Juan", "San Lorenzo", "San Sebasti\u00e1n", "Santa Isabel", "Toa Alta", "Toa Baja", "Trujillo Alto", "Utuado", "Vega Alta", "Vega Baja", "Vieques", "Villalba", "Yabucoa", "Yauco"]) {
    await prisma.municipality.upsert({
      where: { name },
      create: { name, defaultAlcoholCutoffMins: 120 },
      update: {},
    });
  }

  // zones
  const zones = [
    { name: "Old San Juan", isEnabled: true },
    { name: "La Placita", isEnabled: true },
    { name: "Calle Cerra", isEnabled: true },
    { name: "Calle Loíza", isEnabled: true },
    { name: "Condado", isEnabled: true },
    { name: "Isla Verde", isEnabled: false, disabledReason: "Temporarily disabled" },
  ];

  for (const z of zones) {
    await prisma.zone.upsert({
      where: { name: z.name },
      create: z as any,
      update: {
        isEnabled: z.isEnabled,
        disabledReason: z.disabledReason ?? null,
      },
    });
  }

  // Create a sample venue in San Juan / La Placita so the UI isn't empty
  const sanJuan = await prisma.municipality.findUnique({ where: { name: "San Juan" } });
  const placita = await prisma.zone.findUnique({ where: { name: "La Placita" } });
  if (sanJuan && placita) {
    await prisma.venue.upsert({
      where: { id: "seed-venue-placita-1" },
      create: {
        id: "seed-venue-placita-1",
        name: "Seed Bar La Placita",
        type: "Bar",
        description: "Demo venue for local testing.",
        address: "La Placita, San Juan, PR",
        lat: 18.4510,
        lng: -66.0665,
        municipalityId: sanJuan.id,
        zoneId: placita.id,
        plan: "PRO",
      },
      update: {},
    });

    // menu items
    await prisma.menuItem.createMany({
      data: [
        { venueId: "seed-venue-placita-1", name: "Medalla", priceCents: 100, isAlcohol: true, isAvailable: true },
        { venueId: "seed-venue-placita-1", name: "Water", priceCents: 200, isAlcohol: false, isAvailable: true },
      ],
    });
  }

  // ── Admin user (always ensure one exists) ────────────────────────────────
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      role: "ADMIN",
      firstName: "Admin",
      lastName: "Clicks",
      birthdate: new Date("1990-01-01"),
      country: "PR",
      email: ADMIN_EMAIL,
      passwordHash: adminHash,
    },
    update: { role: "ADMIN" }, // don't overwrite password if manually changed
  });
  console.log(`[seed] Admin ready  →  ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);

  // Create current week cycle (Week N) ending Monday 4:00am
  const now = new Date();
  const weekInfo = getWeekInfo(now);
  const cycle = buildWeekCycle(now, weekInfo.year, weekInfo.week);
  await prisma.weekCycle.upsert({
    where: { year_week: { year: weekInfo.year, week: weekInfo.week } },
    create: { year: weekInfo.year, week: weekInfo.week, startsAt: cycle.startsAt, endsAt: cycle.endsAt },
    update: { startsAt: cycle.startsAt, endsAt: cycle.endsAt },
  });
}

function getWeekInfo(d: Date) {
  // ISO week
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function buildWeekCycle(now: Date, year: number, week: number) {
  // Cycle ends Monday 4:00am local (server time). For V1, treat server as local PR time.
  // Find next Monday 4:00am.
  const end = new Date(now);
  // set to 4:00am today
  end.setHours(4,0,0,0);
  // advance to next Monday 4:00am if already past
  while (end.getTime() <= now.getTime() || end.getDay() !== 1) {
    end.setDate(end.getDate() + 1);
    end.setHours(4,0,0,0);
  }
  // startsAt is previous Monday 4:00am
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  start.setHours(4,0,0,0);
  return { startsAt: start, endsAt: end };
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
