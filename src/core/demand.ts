// ===========================================================================
// RankRentDeep OS — Module B scoring: demand extraction
// Pure functions. Given demand observations + keyword, compute the demand
// estimate, source agreement, seasonality, intent, and normalized score.
// ===========================================================================

import type {
  DemandObservation,
  DemandRecommendation,
  DemandResult,
  Seasonality,
  SeasonalityPoint,
} from "./types";
import { clamp100, clampScore } from "./weights";

// --- Keyword intent heuristics ---------------------------------------------

const COMMERCIAL_MODIFIERS = [
  "near me",
  "cost",
  "price",
  "pricing",
  "contractor",
  "repair",
  "installation",
  "install",
  "service",
  "company",
  "quote",
  "estimate",
  "emergency",
  "24 hour",
  "24/7",
  "best",
  "top",
  "reviews",
  "hire",
  "local",
  "replacement",
  "fix",
];

const LOCAL_MODIFIERS = ["near me", "nearby", "local", "in ", "around me"];

export function commercialIntentScore(keyword: string): number {
  const k = keyword.toLowerCase();
  let score = 20; // baseline
  for (const m of COMMERCIAL_MODIFIERS) {
    if (k.includes(m)) score += 8;
  }
  return clamp100(score);
}

export function localIntentProbability(keyword: string, location?: string): number {
  const k = keyword.toLowerCase();
  let score = 0;
  for (const m of LOCAL_MODIFIERS) {
    if (k.includes(m)) score += 30;
  }
  if (location && k.includes(location.toLowerCase())) score += 40;
  return clamp100(score);
}

// --- Demand estimate --------------------------------------------------------

export interface DemandEstimate {
  low: number;
  high: number;
  estimate: number;
  confidenceInterval: [number, number];
}

/**
 * Aggregate observations into a demand range. Uses the median as the point
 * estimate and the interquartile-ish spread as the confidence interval.
 */
export function estimateDemand(observations: DemandObservation[]): DemandEstimate {
  const volumes = observations
    .map((o) => o.volume)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  if (volumes.length === 0) {
    return { low: 0, high: 0, estimate: 0, confidenceInterval: [0, 0] };
  }

  const sorted = [...volumes].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const low = sorted[Math.floor(sorted.length * 0.25)];
  const high = sorted[Math.floor(sorted.length * 0.75)];

  return {
    low,
    high,
    estimate: median,
    confidenceInterval: [low, high],
  };
}

/**
 * Source agreement (0..100). Compares the spread of volumes across distinct
 * sources; a >30% disagreement flags a conflict.
 */
export function sourceAgreement(observations: DemandObservation[]): {
  agreement: number;
  conflict: boolean;
} {
  const bySource = new Map<string, number[]>();
  for (const o of observations) {
    if (typeof o.volume !== "number") continue;
    const list = bySource.get(o.source) ?? [];
    list.push(o.volume);
    bySource.set(o.source, list);
  }

  const means = [...bySource.values()].map(
    (v) => v.reduce((a, b) => a + b, 0) / v.length,
  );

  if (means.length <= 1) return { agreement: 100, conflict: false };

  const max = Math.max(...means);
  const min = Math.min(...means);
  if (max <= 0) return { agreement: 100, conflict: false };

  const spread = (max - min) / max; // 0..1
  const agreement = clamp100((1 - spread) * 100);
  return { agreement, conflict: spread > 0.3 };
}

// --- Seasonality ------------------------------------------------------------

export function seasonalityFromCurve(curve: SeasonalityPoint[]): Seasonality {
  if (curve.length === 0) {
    return { peak: "", trough: "", curve: [], severity: 0 };
  }
  const sorted = [...curve].sort((a, b) => b.value - a.value);
  const peak = sorted[0].month;
  const trough = sorted[sorted.length - 1].month;
  const max = sorted[0].value;
  const min = sorted[sorted.length - 1].value;
  const severity = max > 0 ? clamp100(((max - min) / max) * 100) : 0;
  return { peak, trough, curve, severity };
}

// --- Demand score -----------------------------------------------------------

export interface DemandScoreInput {
  estimate: DemandEstimate;
  agreement: number;
  commercialIntent: number;
  seasonalitySeverity: number;
}

/**
 * Normalized demand score (0..100).
 *   volume 40% · agreement 20% · commercial intent 25% · seasonality 15%
 */
export function demandScore(input: DemandScoreInput): number {
  const volumeScore = clamp100((input.estimate.estimate / 500) * 100);
  const seasonalityScore = 100 - input.seasonalitySeverity;
  const score =
    volumeScore * 0.4 +
    input.agreement * 0.2 +
    input.commercialIntent * 0.25 +
    seasonalityScore * 0.15;
  return clampScore(score);
}

export function demandRecommendation(
  estimate: number,
  agreement: number,
  seasonalitySeverity: number,
  minDemand: number,
): DemandRecommendation {
  if (estimate < minDemand) return "reject";
  if (agreement < 70 || seasonalitySeverity > 60) return "caution";
  return "proceed";
}

// --- Full result ------------------------------------------------------------

export interface BuildDemandResultInput {
  observations: DemandObservation[];
  keyword: string;
  location?: string;
  curve?: SeasonalityPoint[];
  minDemand?: number;
  relatedSearches?: string[];
  peopleAlsoAsk?: string[];
}

export function buildDemandResult(input: BuildDemandResultInput): DemandResult {
  const estimate = estimateDemand(input.observations);
  const { agreement, conflict } = sourceAgreement(input.observations);
  const seasonality = seasonalityFromCurve(input.curve ?? []);
  const commercialIntent = commercialIntentScore(input.keyword);
  const localIntent = localIntentProbability(input.keyword, input.location);
  const score = demandScore({
    estimate,
    agreement,
    commercialIntent,
    seasonalitySeverity: seasonality.severity,
  });
  const recommendation = demandRecommendation(
    estimate.estimate,
    agreement,
    seasonality.severity,
    input.minDemand ?? 100,
  );

  return {
    observations: input.observations,
    estimateLow: estimate.low,
    estimateHigh: estimate.high,
    estimate: estimate.estimate,
    confidenceInterval: estimate.confidenceInterval,
    sourceAgreement: agreement,
    sourceConflict: conflict,
    seasonality,
    localIntentProbability: localIntent,
    commercialIntentScore: commercialIntent,
    demandScore: score,
    recommendation,
    relatedSearches: input.relatedSearches ?? [],
    peopleAlsoAsk: input.peopleAlsoAsk ?? [],
  };
}
