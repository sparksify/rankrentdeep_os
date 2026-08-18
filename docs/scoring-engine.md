# Scoring Engine — RankRentDeep OS

All scoring is deterministic, pure TypeScript in `src/core/`. External data
feeds the models; no AI or heuristic-free magic numbers. This document lists
every weight, threshold, and formula.

## 1. Weights

Default weights (normalized to sum to 1; overridable via `W_DEMAND`,
`W_RANKABILITY`, `W_RENTABILITY`, `W_ENTITY`):

| Component   | Weight |
| ----------- | ------ |
| Demand      | 0.30   |
| Rankability | 0.30   |
| Rentability | 0.30   |
| Entity      | 0.10   |

`finalScore = demand*0.30 + rankability*0.30 + rentability*0.30 + entity*0.10`

## 2. Module A — Geographic Entity Resolution

- **Ambiguity score** (0–100) = ratio of runner-up strength to top candidate
  strength, where strength is `relativeVolume` or `log10(population + 1)`.
  - 0 = unambiguous, 100 = fully ambiguous.
- **Confidence** = `100 − ambiguity`.
- **Hard reject** when confidence < **70%**.
- **City-name collision** = two or more candidates sharing the same name in
  different states (e.g., Bellevue WA vs NE, Rochester MN vs NY). Always
  surfaced as a flag with the alternative interpretations.
- **Entity score** fed into the scorecard:
  - `confidence ≥ 70` → `entityScore = confidence`.
  - `confidence < 70` → `entityScore = (confidence / 70) * 50` (aggressive
    penalty below the floor).

## 3. Module B — Demand Extraction

- **Estimate** = median of per-source volumes; **confidence interval** =
  [25th, 75th] percentile of volumes.
- **Source agreement** = `(1 − (max−min)/max) * 100` across provider means.
  - **Conflict** when spread > **30%**.
- **Commercial intent** (0–100): baseline 20, +8 per modifier (`near me`,
  `cost`, `contractor`, `repair`, `installation`, `emergency`, `quote`, etc.).
- **Local intent** (0–100): +30 per local modifier (`near me`, `local`,
  `nearby`, `in …`, `around me`), +40 if the location is in the keyword.
- **Seasonality severity** = `(max − min) / max * 100` over the 12-month curve.
- **Demand score** =
  `volumeScore*0.40 + agreement*0.20 + commercialIntent*0.25 + seasonality*0.15`
  where `volumeScore = min(100, estimate/500 * 100)`.
- **Recommendation**: `reject` if estimate < `minDemand` (default 100/mo);
  `caution` if agreement < 70 or seasonality severity > 60; else `proceed`.

## 4. Module C — SERP Rankability

Two independent models estimate **competition strength** (0–100); rankability
is the inverse.

- **Per-result strength** = `domainRating*0.40 + contentDepth*0.25 +
  localSignals*0.20 + pageSpeed*0.15`, where `contentDepth = min(100,
  words/2000*100)`.
- **Model A** = mean per-result strength of top-10 organic results.
- **Model B** = `min(100, avgReferringDomains/200 * 100)` (link equity).
- **Rankability** = `100 − mean(ModelA, ModelB)`.
- **Confidence interval** = `[100 − max(A,B), 100 − min(A,B)]`.
- **Model agreement**:
  - `|A − B| ≤ 15` → agree
  - `15 < |A − B| ≤ 30` → disagree
  - `|A − B| > 30` → high uncertainty
- **Time to top 3 (months)** = `2 + (strength/100) * 16`.
- **Link budget** = `round(avgReferringDomains * 0.8)`.
- **Content gaps** = thin content (<800 words avg), weak local signals (<50),
  slow pages (<60), no exact-match domain, directory-heavy SERP.

## 5. Module D — Rentability & Monetization

- **Lead value** = `ticketSize * closeRate` (industry benchmark table in
  `src/lib/benchmarks.ts`); refined upward by CPC when available
  (`max(benchmark, cpc*5)`).
- **Monthly leads** = `demandEstimate * 0.05`.
- **Rental floor/ceiling** = `leadValue * monthlyLeads * {0.4, 0.8}`.
- **Rentability score** =
  `rentersScore*0.40 + leadValueScore*0.30 + adCompetition*0.30 − aggregatorPenalty`
  - `rentersScore = min(100, potentialRenters/10*100)`
  - `leadValueScore = min(100, leadValue/100*100)`
  - `adCompetition = fraction of businesses running ads * 100`
  - `aggregatorPenalty = 30` when the market is dominated by 1–2 aggregators.
- **Flags**: fewer than 3 renters, lead value < $25, aggregator dominance.

## 6. Module E — Classification & Checklist

Minimum thresholds (defaults):

| Threshold              | Value |
| ---------------------- | ----- |
| minDemand (searches/mo)| 100   |
| minEntityConfidence    | 70%   |
| minRenters             | 3     |
| minLeadValue           | $25   |
| modelDisagreementPts   | 15    |
| sourceConflictPercent  | 30%   |
| coreBetMin             | 70    |
| rejectMax              | 40    |

Classification:

- **Reject** — `hardReject`, or fails any minimum (demand/renters/lead value),
  or `finalScore < 40`.
- **Core Revenue Bet** — all four sub-scores > 70, entity confidence ≥ 70,
  and models agree.
- **Validation Probe** — `finalScore ≥ 55` but not a core bet (something sits in
  the 50–70 uncertainty zone).
- **Learning Asset** — otherwise (low cost, tests a specific assumption).

Pre-flight checklist (each item must pass before a build):

1. Demand above minimum threshold
2. Entity disambiguated > 70% confidence
3. Top-10 organic results beatable (rankability ≥ 50)
4. ≥ 3 local businesses identified as potential renters
5. Estimated lead value > $25
6. No severe seasonality collapse (severity < 60)

## 7. Suggested batch allocation

For a portfolio of ~10 candidates: **5–8 revenue bets, 2–3 probes, 0–1
learning asset** (see `DEFAULT_BATCH_ALLOCATION` in `src/core/final.ts`).

## 8. Active learning (weights update)

Feedback events (rankings, traffic, calls, inquiries) are stored per candidate.
The monthly job compares predicted vs. actual time-to-rank and flags
underperforming domains for park/redirect/invest decisions. Scoring weights are
adjustable via env vars, and the monthly reclassification reflects observed
performance.

## 9. AI committee (advisory — not a score)

The AI committee (`src/lib/ai/`) is a **qualitative** review layer that runs
*before* a monetary test. It does not participate in scoring: it receives the
deterministic scores and research facts as inputs and returns independent
judgments from multiple models.

- **Members** (roles fixed, models configurable via `COMMITTEE_MODELS`):
  conservative underwriter, SEO technician, local market economist,
  monetization strategist, red-team skeptic.
- **Each member returns** `{ stance, confidence, thesis, risks, opportunities,
  maxBudget }`.
- **Aggregation** requires a **strict majority** (`>50%`) of non-errored votes
  for `approve` or `reject`; any tie/plurality resolves to `hold`
  (validation probe).

## 10. Data sources & search-method enrichment

- **Demand** is enriched with DataForSEO **People Also Ask** and **related
  searches** (autocomplete-style), surfaced in `demand_details`.
- **Entity resolution** enriches population via **US Census ACS** (key-gated)
  and falls back to **OpenStreetMap/Nominatim** geocoding (free, no key) when
  Google Places is absent — providing bounding boxes for neighborhood/community
  polygons.
- **Renters** are discovered from Google Places, **Yelp Fusion**, and
  DataForSEO business data, then de-duplicated by name+address.

