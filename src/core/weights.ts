// ===========================================================================
// RankRentDeep OS — scoring weights & thresholds
// Central, versioned configuration for the scoring engine. Overridable via
// environment variables (W_DEMAND, W_RANKABILITY, W_RENTABILITY, W_ENTITY).
// ===========================================================================

import type { ScoringThresholds, ScoringWeights } from "./types";

export const DEFAULT_WEIGHTS: ScoringWeights = {
  demand: 0.3,
  rankability: 0.3,
  rentability: 0.3,
  entity: 0.1,
};

export const DEFAULT_THRESHOLDS: ScoringThresholds = {
  minDemand: 100, // searches / month
  minEntityConfidence: 70, // %
  minRenters: 3,
  minLeadValue: 25, // USD
  modelDisagreementPoints: 15,
  sourceConflictPercent: 30,
  coreBetMin: 70,
  rejectMax: 40,
};

function readWeight(env: string | undefined, fallback: number): number {
  if (!env) return fallback;
  const n = Number(env);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Resolve weights from environment, normalizing so they sum to 1.
 * Deterministic: given the same env, always returns the same weights.
 */
export function resolveWeights(env: Record<string, string | undefined> = {}): ScoringWeights {
  const raw: ScoringWeights = {
    demand: readWeight(env.W_DEMAND, DEFAULT_WEIGHTS.demand),
    rankability: readWeight(env.W_RANKABILITY, DEFAULT_WEIGHTS.rankability),
    rentability: readWeight(env.W_RENTABILITY, DEFAULT_WEIGHTS.rentability),
    entity: readWeight(env.W_ENTITY, DEFAULT_WEIGHTS.entity),
  };
  const total = raw.demand + raw.rankability + raw.rentability + raw.entity;
  if (total === 0) return DEFAULT_WEIGHTS;
  return {
    demand: raw.demand / total,
    rankability: raw.rankability / total,
    rentability: raw.rentability / total,
    entity: raw.entity / total,
  };
}

export function resolveThresholds(
  env: Record<string, string | undefined> = {},
): ScoringThresholds {
  void env;
  return { ...DEFAULT_THRESHOLDS };
}

/** Clamp a number to [0, 100] and round to 1 decimal. */
export function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 10;
}

/** Clamp to [0, 100] integer. */
export function clamp100(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}
