Render deployment checklist for `clicks.pr`

Recommended Render service settings:

- Environment: `Node`
- Node version: set to `22` (or `22.x`) in the Render UI or leave to respect `engines.node` in `package.json`.
- Build Command: `npm run build`
  - This repo's `build` script runs `prisma generate && next build` so the Prisma client is prepared during the build.
- Start Command: `npm run start`
- Root Directory: where `package.json` lives (default = repository root)

Environment variables (Render -> Environment):
- `DATABASE_URL` = Postgres connection string for your DB (use the internal Render DB URL if using a Render-managed Postgres).
- Any other secrets (Stripe keys, JWT secret) go here as well.

Notes & troubleshooting:

- Do NOT run `prisma migrate` during the Render build step unless the target DB is accessible and you intend to run migrations during deploy. Migrations require a reachable Postgres and can fail the build if not available. Use `npx prisma migrate deploy` in a separate deploy step or run migrations manually.

- If Render shows errors like `Unknown command: "install,"` that means the Build Command was entered with commas. Use `&&` between commands or a single npm script (recommended).

- If Prisma client is missing at runtime, ensure `prisma generate` ran during build. This repo runs it in `build` and `postinstall` to be safe.

- CI: this repo includes a GitHub Actions workflow at `.github/workflows/ci.yml` that runs `npm ci`, `prisma generate`, optional migrations (if `DATABASE_URL` secret is set), `npm run lint`, and `npm run build` on pushes/PRs to `main`.

- Local dev: create a `.env` with `DATABASE_URL=postgres://user:pass@localhost:5432/clicks_dev` and run `npm run dev`.

If you want, I can:
- Add an automated migration/deploy job (GitHub Actions -> Render API) that runs migrations safely before promoting a deploy.
- Add a pre-deploy checklist script that validates required env vars are present.

Paste any Render build logs if you want me to diagnose the current failing step.