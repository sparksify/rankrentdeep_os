// ===========================================================================
// RankRentDeep OS — Module C scoring: SERP rankability
// Pure functions. Two independent models estimate how hard the SERP is to
// beat; disagreement between them is surfaced explicitly.
// ===========================================================================

import type { ModelAgreement, RankabilityResult, SerpResult } from "./types";
import { clamp100, clampScore } from "./weights";

const MODEL_DISAGREEMENT_POINTS = 15;

/** Normalize word count to a 0..100 content-depth score (2000 words = 100). */
export function normalizeContentDepth(words: number): number {
  return clamp100((words / 2000) * 100);
}

/**
 * Per-result "strength" (0..100) — how hard a single result is to outrank.
 * Weighted: domain rating 40% · content depth 25% · local signals 20% · speed 15%.
 */
export function resultStrength(r: SerpResult): number {
  const content = normalizeContentDepth(r.contentDepth);
  return (
    r.domainRating * 0.4 +
    content * 0.25 +
    r.onPageLocalSignals * 0.2 +
    r.pageSpeed * 0.15
  );
}

/**
 * Model A — weighted average of domain authority, content quality, and
 * on-page local signals across the top 10 organic results.
 * Returns competition strength (0..100).
 */
export function modelA(topResults: SerpResult[]): number {
  const organic = topResults.filter((r) => r.resultType !== "ads");
  if (organic.length === 0) return 0;
  const avg = organic.reduce((sum, r) => sum + resultStrength(r), 0) / organic.length;
  return clamp100(avg);
}

/**
 * Model B — link equity of the top 10 (referring domains + backlinks).
 * Returns competition strength (0..100).
 */
export function modelB(topResults: SerpResult[]): number {
  const organic = topResults.filter((r) => r.resultType !== "ads");
  if (organic.length === 0) return 0;
  const avgRefDomains =
    organic.reduce((sum, r) => sum + (r.referringDomains || 0), 0) / organic.length;
  // 200 referring domains => full strength.
  return clamp100((avgRefDomains / 200) * 100);
}

/** Rankability = 100 - competition strength (weak SERP => high rankability). */
export function rankabilityFromStrength(strength: number): number {
  return clampScore(100 - strength);
}

export function modelAgreement(a: number, b: number): ModelAgreement {
  const diff = Math.abs(a - b);
  if (diff > MODEL_DISAGREEMENT_POINTS * 2) return "high_uncertainty";
  if (diff > MODEL_DISAGREEMENT_POINTS) return "disagree";
  return "agree";
}

/** Estimated months to reach top 3, from competition strength. */
export function timeToRankTop3(strength: number): number {
  // Weak SERP (strength 0) => ~2 months; strong (100) => ~18 months.
  return Math.round(2 + (strength / 100) * 16);
}

/** Estimated referring domains required to compete. */
export function linkBudget(topResults: SerpResult[]): number {
  const organic = topResults.filter((r) => r.resultType !== "ads");
  if (organic.length === 0) return 0;
  const avg =
    organic.reduce((sum, r) => sum + (r.referringDomains || 0), 0) / organic.length;
  return Math.max(0, Math.round(avg * 0.8));
}

/** Identify exploitable gaps in the top 10. */
export function contentGaps(topResults: SerpResult[]): string[] {
  const organic = topResults.filter((r) => r.resultType !== "ads");
  if (organic.length === 0) return ["No organic results — wide-open SERP."];

  const gaps: string[] = [];
  const avgDepth =
    organic.reduce((sum, r) => sum + r.contentDepth, 0) / organic.length;
  const avgLocal =
    organic.reduce((sum, r) => sum + r.onPageLocalSignals, 0) / organic.length;
  const avgSpeed =
    organic.reduce((sum, r) => sum + r.pageSpeed, 0) / organic.length;
  const types = new Set(organic.map((r) => r.resultType));

  if (avgDepth < 800) gaps.push("Thin content — top results average <800 words.");
  if (avgLocal < 50) gaps.push("Weak local signals (NAP/schema/map) across the SERP.");
  if (avgSpeed < 60) gaps.push("Slow pages — speed/mobile usability is beatable.");
  if (!types.has("emd")) gaps.push("No exact-match domain — EMD opportunity available.");
  if (types.has("directory") && !types.has("lead_gen")) {
    gaps.push("Directory-heavy SERP — room for a dedicated lead-gen site.");
  }
  if (gaps.length === 0) gaps.push("Competitive SERP — no obvious content gap.");
  return gaps;
}

/**
 * SERP volatility (0..100) from a series of top-10 domain snapshots.
 * Measures churn via mean Jaccard distance between consecutive snapshots.
 * High volatility => incumbents are unstable => easier to displace.
 */
export function serpVolatility(snapshots: string[][]): number {
  if (snapshots.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = new Set(snapshots[i - 1].slice(0, 10));
    const curr = new Set(snapshots[i].slice(0, 10));
    const union = new Set([...prev, ...curr]).size;
    if (union === 0) continue;
    const intersection = [...curr].filter((d) => prev.has(d)).length;
    total += 1 - intersection / union;
  }
  return clamp100((total / (snapshots.length - 1)) * 100);
}

// --- Full result ------------------------------------------------------------

export interface BuildRankabilityInput {
  topResults: SerpResult[];
  /** Historical top-10 domain snapshots (chronological) for volatility. */
  historyDomains?: string[][];
}

export function buildRankabilityResult(input: BuildRankabilityInput): RankabilityResult {
  const a = modelA(input.topResults);
  const b = modelB(input.topResults);
  const strength = (a + b) / 2;
  const baseRankability = rankabilityFromStrength(strength);
  const agreement = modelAgreement(a, b);

  // Confidence interval: spread between the two models.
  const low = rankabilityFromStrength(Math.max(a, b));
  const high = rankabilityFromStrength(Math.min(a, b));

  const history = input.historyDomains ?? [];
  const volatility = serpVolatility(history);

  // With ≥2 snapshots, blend volatility in (10% weight) — churn is a positive
  // signal. Without history, the base score is unchanged.
  const rankability =
    history.length >= 2
      ? clampScore(baseRankability * 0.9 + volatility * 0.1)
      : baseRankability;

  return {
    modelAScore: clampScore(rankabilityFromStrength(a)),
    modelBScore: clampScore(rankabilityFromStrength(b)),
    rankabilityScore: rankability,
    confidenceInterval: [Math.min(low, high), Math.max(low, high)],
    modelAgreement: agreement,
    timeToRankTop3Months: timeToRankTop3(strength),
    linkBudget: linkBudget(input.topResults),
    topResults: input.topResults,
    contentGaps: contentGaps(input.topResults),
    volatility,
    snapshotCount: history.length,
  };
}
