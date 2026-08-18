# RankRentDeep OS

A rank-and-rent research assistant that automates the research, scoring, and
validation of lead-gen domains **before** you invest in building them.

Five modules — Geographic Entity Resolution, Demand Extraction, SERP
Rankability, Rentability/Monetization, and a Scoring Engine — are orchestrated
from a single dashboard backed by Supabase.

## Stack

- **Frontend & API:** Next.js (App Router) on Vercel
- **Database & Auth:** Supabase (PostgreSQL, RLS, Realtime, Edge Functions)
- **External APIs:** DataForSEO, Ahrefs, Semrush, Google Places, Google Trends
- **UI:** Tailwind CSS, shadcn-style components, Recharts, Leaflet

No Google Sheets. All data lives in Supabase.

## Quick start

```bash
npm install
cp .env.example .env.local
# fill in .env.local (see below)
npm run dev
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in `supabase/migrations/` (via the SQL editor or CLI):

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

3. Copy the project URL, anon key, and service-role key into `.env.local`.

The migrations create the schema, enable Row Level Security, enable Realtime on
`candidates`/`scores`/`research_runs`/`feedback_events`, and define the job-queue
RPC (`claim_next_job`) and the cache RPC (`cache_get`/`cache_set`).

### API keys

All credentials live in environment variables (never the database). The unified
client (`src/lib/providers`) auto-detects which providers are configured and
routes each query to the best available source:

| Provider      | Variable                 | Used for                                          |
| ------------- | ------------------------ | ------------------------------------------------- |
| DataForSEO    | `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | SERP scraping, keyword volume, Google Trends, business data, PAA + related searches |
| Ahrefs        | `AHREFS_API_TOKEN`       | keyword volume, SERP, domain rating, backlinks    |
| Semrush       | `SEMRUSH_API_KEY`        | keyword volume, domain analytics, traffic, CPC    |
| Google Places | `GOOGLE_PLACES_API_KEY`  | place resolution, autocomplete, business search   |
| Google Trends | `GOOGLE_TRENDS_DATASOURCE` | interest-over-time (falls back to DataForSEO)   |
| Yelp Fusion   | `YELP_API_KEY`           | additional renter discovery                       |
| US Census ACS | `CENSUS_API_KEY`         | population + median income enrichment             |
| OpenStreetMap / Nominatim | `NOMINATIM_EMAIL` | free geocoding fallback (no key required)  |
| OpenRouter    | `OPENROUTER_API_KEY`     | multi-model AI committee (advisory review)        |

Only the providers you configure are used; the rest are skipped gracefully.
Nominatim requires no key and is used automatically as a geocoding fallback.

### Scoring weights

Override the default weights via env vars (`W_DEMAND`, `W_RANKABILITY`,
`W_RENTABILITY`, `W_ENTITY`). Weights are normalized to sum to 1. See
[docs/scoring-engine.md](docs/scoring-engine.md) for the full formulas and
thresholds.

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # production build
npm run test         # Vitest (deterministic scoring + entity/demand/rankability/rentability)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

## How it works

1. Add candidates in the **Research Pipeline** (`/pipeline`) — individually or
   in bulk (`domain, keyword, location` per line, up to 200 at once).
2. Each candidate is enqueued in the `jobs` table. The cron worker
   (`/api/cron/worker`, every 5 minutes) claims jobs atomically via
   `claim_next_job` and runs the full pipeline (Modules A–E).
3. Results are written to Supabase; the dashboard updates live via Realtime.

### Background jobs

- **Daily** (`/api/cron/daily`): re-scrape SERPs for built/scored candidates and
  store feedback events (rankings).
- **Weekly** (`/api/cron/weekly`): re-calculate demand + rentability for active
  candidates.
- **Monthly** (`/api/cron/monthly`): generate a portfolio report and reclassify
  underperforming domains (park/redirect decisions).

The queue (`jobs` table + `claim_next_job` RPC with `SKIP LOCKED`) processes
candidates in batches without hitting provider rate limits.

### AI committee

Before committing money to a "monetary test", the **AI Committee** (`/committee`,
and a per-site panel on each candidate detail page) convenes multiple models via
OpenRouter. Each model adopts a distinct role and gives an independent
perspective:

| Role                     | Focus                                              |
| ------------------------ | -------------------------------------------------- |
| Conservative Underwriter | downside risk, capital preservation, red flags     |
| SEO Technician           | rankability realism, link/domain gap, time-to-rank |
| Local Market Economist   | demand integrity, seasonality, competition         |
| Monetization Strategist  | rentability, lead value, rental pricing            |
| Red Team Skeptic         | attacks the thesis, finds what breaks              |

Each model returns a structured verdict (approve/hold/reject + confidence,
thesis, risks, opportunities, max budget). The committee aggregates votes and
requires a **strict majority** before "approve"; otherwise it recommends a
validation probe. **The committee never computes scores** — it receives the
deterministic scores as inputs and only adds qualitative judgment. Configure
the models via `COMMITTEE_MODELS` (comma-separated OpenRouter IDs).

## Deploy to Vercel

```bash
npm i -g vercel
vercel          # one command; link the project and deploy
```

Then set the environment variables (see `.env.example`) in the Vercel project
settings — including `CRON_SECRET`, which Vercel uses to authenticate cron
requests. The cron schedule is declared in `vercel.json`.

## Layout

- `src/core/` — deterministic, framework-free scoring logic (entity ambiguity,
  demand, rankability models A/B, rentability, final classification, weights).
  Tested directly.
- `src/lib/providers/` — unified SEO provider abstraction + DataForSEO/Ahrefs/
  Semrush/Google Places/Google Trends clients.
- `src/lib/` — Supabase clients/types, cache, queue, worker, geo + industry
  benchmark helpers, AI committee (OpenRouter client + aggregation).
- `src/modules/` — Modules A–D orchestration + Module E scoring + persistence.
- `src/app/` — dashboard pages and API routes (`/api/candidates`,
  `/api/research`, `/api/committee`, `/api/cron/*`).
- `supabase/migrations/` — schema, RLS, Realtime, RPC.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-only (never `NEXT_PUBLIC_`).
- The anon key is read-only for all tables; writes happen through server route
  handlers using the service role. To add multi-user auth, tighten the RLS
  SELECT policies to `authenticated` and add an owner column — see
  `supabase/migrations/0002_rls.sql`.
- `CRON_SECRET` protects the cron/worker endpoints.

## Model disagreement

The scoring engine surfaces uncertainty, not just single numbers:

- Rankability is computed with **two independent models** (authority/content
  vs. link equity); a disagreement >15 points is flagged.
- Demand computes a **source-agreement** score; a >30% spread across providers
  flags a conflict.
- Every scorecard carries a confidence interval and a pre-flight checklist.
