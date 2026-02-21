<<<<<<< HEAD
# clicks.pr
Clicks PR — PWA-first nightlife radar + ordering platform. Zones, venue cards, check-ins, Clicks engagement, wallet credits, promos, weekly voting, and more.
=======
# Clicks V1 (PWA-first) — Starter Codebase

This repo is a *buildable scaffold* for the Clicks V1 spec:
- PWA shell (installable)
- Role routing (user / venue / admin)
- Postgres schema via Prisma
- Seeds: 78 municipalities (names) + zones (Isla Verde disabled)
- Core endpoints: auth, zones, venues, check-in, wallet ledger (mock top-ups/transfers), weekly voting
- Time windows: leaderboard stop + summary at 2:00am, settlement reset at 4:00am (jobs are stubs)

This is **not** a finished production app. It is a working foundation you can run locally and extend.

## 0) Requirements
- Node.js 18+ (recommended 20+)
- Docker Desktop (for Postgres) OR a Postgres connection string

## 1) Quick start (local)
```bash
# 1) install
npm install

# 2) start postgres (docker)
docker compose up -d

# 3) create env file
cp .env.example .env

# 4) generate prisma client + migrate + seed
npm run db:setup

# 5) start dev server
npm run dev
```

Open: http://localhost:3000

## 2) Default logins
After seeding, create an admin via the script:
```bash
npm run create:admin
```
It will print credentials.

Users are created via the signup UI.

## 3) PWA install
- On iPhone Safari: Share → “Add to Home Screen”
- On Chrome: install icon in the URL bar

## 4) Project structure
- `src/app/*` — Next.js App Router pages
- `src/app/api/*` — API routes
- `prisma/schema.prisma` — DB schema
- `prisma/seed.ts` — seed municipalities/zones

## 5) What to build next
- Stripe/Apple Pay integration for wallet top-up
- Venue dashboard: orders status updates
- Settlement job (4:00am) and payouts

## 6) Important
This scaffold enforces:
- check-in required for ordering
- 1.0 mile fixed check-in radius (server-side Haversine calc)
- alcohol cutoff per venue (based on municipality default + per-venue override)
- zones + municipality governance is admin-only

>>>>>>> 59056e8 (Initial version beta testing commit)
