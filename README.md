# CivilIQ

> The bill-cycle workspace for Indian civil-construction firms.
>
> *"Know what's billed, what's certified, what's owed — across every project, every day."*

Single Next.js 14 (App Router) full-stack app. Postgres 16 via Drizzle. Auth.js. shadcn/ui. Razorpay for subscriptions.

## Quick start

```bash
pnpm install
cp .env.example .env.local        # fill DATABASE_URL + NEXTAUTH_SECRET
pnpm db:generate                  # generate the first migration from schema.ts
pnpm db:migrate                   # apply migrations to your local Postgres
pnpm db:seed                      # OPTIONAL: load the demo tenant (skip if onboarding a real firm)
pnpm dev                          # http://localhost:3000
```

## Scripts

| Command          | What it does                                                       |
| ---------------- | ------------------------------------------------------------------ |
| `pnpm dev`       | Next.js dev server                                                 |
| `pnpm build`     | Production build                                                   |
| `pnpm start`     | Run the production build                                           |
| `pnpm lint`      | `next lint`                                                        |
| `pnpm typecheck` | `tsc --noEmit` — strict, no `any`, no unchecked indexed access     |
| `pnpm test`      | `node --test` over `lib/` — bill-math and tenant-isolation         |
| `pnpm db:generate` | Generate Drizzle migrations from `lib/db/schema.ts`              |
| `pnpm db:migrate`  | Apply pending migrations                                         |
| `pnpm db:push`     | Push schema directly (use only for prototyping)                  |
| `pnpm db:studio`   | Open Drizzle Studio                                              |
| `pnpm db:seed`     | Run `lib/db/seed.ts`                                             |

## Environment

| Var                       | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`            | Postgres 16 connection string (Neon ap-south-1 recommended)    |
| `NEXTAUTH_SECRET`         | JWT signing secret. `openssl rand -base64 32`                   |
| `NEXTAUTH_URL`            | `http://localhost:3000` in dev                                 |
| `RAZORPAY_KEY_ID`         | Razorpay test or live key id                                   |
| `RAZORPAY_KEY_SECRET`     | Razorpay key secret                                            |
| `RAZORPAY_WEBHOOK_SECRET` | For verifying webhook signatures                               |

See `.env.example` for the template.

## Architecture

- **Single repo, single service.** No separate API server. Server Actions + RSC for everything.
- **Six tables**: `tenants`, `users`, `clients`, `projects`, `tenders`, `bills` (+ `voice_notes` placeholder for Phase 2). Anything outside this list needs justification — see `CIVILIQ_BUILD_PLAN.md`.
- **Tenant scoping at the query layer only.** Every Server Action starts with `getCurrentTenant()` from `lib/tenant.ts`. No Row-Level Security in v1.
- **Bill math is the moat.** `lib/bill-math.ts` is pure, deterministic, and fully unit-tested. Components never recompute net amounts.
- **Money: `numeric(18,2)` end-to-end.** All currency lives in rupees with 2-decimal precision. Indian formatting (`en-IN`, lakhs/crores) via `lib/currency.ts`.

## Phase map (this repo)

| Phase | What                                                                          |
| ----- | ----------------------------------------------------------------------------- |
| **0** | Scaffold, schema, bill-math, app shell, login renders. **← current**         |
| 1     | Auth.js credentials + tenancy + sidebar shell                                 |
| 2     | Clients (list + detail + create)                                              |
| 3     | Projects (list + detail + create + variations)                                |
| 4     | Tenders (Kanban + WON-to-project conversion)                                  |
| 5     | Bill form (live math) + bills board + inline status edit + WhatsApp share    |
| 6     | Today command-center                                                          |
| 7     | Settings + Razorpay subscriptions + team invites                              |
| 8     | ⌘K palette, Quick-Create, CSV export, mobile QA, polish                       |

## Legacy

The previous `constructcrm` codebase (FastAPI backend + Next.js 15 frontend) lives on `legacy/constructcrm-v0` and on `main` until v1 lands. Do not migrate the database — schemas are too different.
