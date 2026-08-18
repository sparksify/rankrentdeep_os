// ===========================================================================
// RankRentDeep OS — Module E: scoring engine & test design
// Pure functions. Combines Modules A–D into a final go/no-go recommendation.
// ===========================================================================

import type {
  BatchAllocation,
  ChecklistItem,
  Classification,
  ModelAgreement,
  Scorecard,
  ScoringThresholds,
  ScoringWeights,
} from "./types";
import { clampScore } from "./weights";

export interface FinalScoreInput {
  demandScore: number;
  rankabilityScore: number;
  rentabilityScore: number;
  entityScore: number;
  entityConfidence: number;
  modelAgreement: ModelAgreement;
  demandEstimate: number;
  sourceConflict: boolean;
  seasonalitySeverity: number;
  potentialRenters: number;
  leadValue: number;
  hardReject: boolean;
  weights: ScoringWeights;
  thresholds: ScoringThresholds;
}

export function computeFinalScore(input: FinalScoreInput): number {
  const { weights } = input;
  return clampScore(
    input.demandScore * weights.demand +
      input.rankabilityScore * weights.rankability +
      input.rentabilityScore * weights.rentability +
      input.entityScore * weights.entity,
  );
}

export function buildChecklist(input: FinalScoreInput): ChecklistItem[] {
  const t = input.thresholds;
  return [
    {
      key: "demand",
      label: "Demand above minimum threshold",
      passed: input.demandEstimate >= t.minDemand,
      detail: `${input.demandEstimate} searches/mo (min ${t.minDemand})`,
    },
    {
      key: "entity",
      label: "Entity disambiguated >70% confidence",
      passed: input.entityConfidence >= t.minEntityConfidence,
      detail: `${input.entityConfidence}% confidence`,
    },
    {
      key: "rankability",
      label: "Top 10 organic results beatable",
      passed: input.rankabilityScore >= 50,
      detail: `rankability ${input.rankabilityScore}/100`,
    },
    {
      key: "renters",
      label: "At least 3 local businesses identified",
      passed: input.potentialRenters >= t.minRenters,
      detail: `${input.potentialRenters} potential renters`,
    },
    {
      key: "lead_value",
      label: "Estimated lead value > $25",
      passed: input.leadValue >= t.minLeadValue,
      detail: `$${input.leadValue} per lead`,
    },
    {
      key: "seasonality",
      label: "No severe seasonality collapse",
      passed: input.seasonalitySeverity < 60,
      detail: `seasonality severity ${input.seasonalitySeverity}/100`,
    },
  ];
}

export function classify(input: FinalScoreInput, finalScore: number): Classification {
  const t = input.thresholds;

  const failsMinimums =
    input.hardReject ||
    input.demandEstimate < t.minDemand ||
    input.potentialRenters < t.minRenters ||
    input.leadValue < t.minLeadValue;

  if (failsMinimums || finalScore < t.rejectMax) return "reject";

  const allStrong =
    input.demandScore > t.coreBetMin &&
    input.rankabilityScore > t.coreBetMin &&
    input.rentabilityScore > t.coreBetMin &&
    input.entityScore > t.coreBetMin;

  const lowAmbiguity = input.entityConfidence >= t.minEntityConfidence;
  const modelsAgree = input.modelAgreement === "agree";

  if (allStrong && lowAmbiguity && modelsAgree) return "core_revenue_bet";

  // High value but something sits in the uncertainty zone.
  if (finalScore >= 55) return "validation_probe";

  // Low cost, tests a specific assumption (e.g. neighborhood demand).
  return "learning_asset";
}

export function collectFlags(input: FinalScoreInput): string[] {
  const flags: string[] = [];
  if (input.hardReject) flags.push("Entity resolution hard-rejected (<70% confidence).");
  if (input.sourceConflict) flags.push("Demand sources conflict by >30%.");
  if (input.modelAgreement !== "agree") {
    flags.push(`Rankability models ${input.modelAgreement}.`);
  }
  if (input.seasonalitySeverity >= 60) flags.push("Severe seasonality collapse.");
  return flags;
}

export const DEFAULT_BATCH_ALLOCATION: BatchAllocation = {
  revenueBets: 6,
  probes: 2,
  learningAssets: 1,
};

export function buildScorecard(input: FinalScoreInput): Scorecard {
  const finalScore = computeFinalScore(input);
  const classification = classify(input, finalScore);
  return {
    demandScore: clampScore(input.demandScore),
    rankabilityScore: clampScore(input.rankabilityScore),
    rentabilityScore: clampScore(input.rentabilityScore),
    entityScore: clampScore(input.entityScore),
    finalScore,
    classification,
    modelAgreement: input.modelAgreement,
    flags: collectFlags(input),
    checklist: buildChecklist(input),
    batchAllocation: DEFAULT_BATCH_ALLOCATION,
  };
}
