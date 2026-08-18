// ===========================================================================
// RankRentDeep OS — orchestration
// Runs Modules A–D, computes the final scorecard (Module E), and persists all
// results to Supabase.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EntityResolutionResult,
  DemandResult,
  RankabilityResult,
  RentabilityResult,
  Scorecard,
} from "@/core/types";
import { entityScore } from "@/core/entity";
import { buildScorecard } from "@/core/final";
import { resolveThresholds, resolveWeights } from "@/core/weights";
import type { Database } from "@/lib/supabase/database.types";
import type { UnifiedSeoClient } from "@/lib/providers";
import { runEntityResolution } from "./entity-resolution";
import { runDemandExtraction } from "./demand";
import { runRankabilityAnalysis } from "./rankability";
import { runRentabilityValidation } from "./rentability";

export interface CandidateInput {
  id: string;
  domain: string;
  keyword: string;
  location: string;
}

export interface ResearchOutcome {
  entity: EntityResolutionResult;
  demand: DemandResult;
  rankability: RankabilityResult;
  rentability: RentabilityResult;
  scorecard: Scorecard;
}

export async function runResearch(
  seo: UnifiedSeoClient,
  db: SupabaseClient<Database>,
  candidate: CandidateInput,
): Promise<ResearchOutcome> {
  const { domain, keyword, location } = candidate;

  // --- Module A: entity resolution ---
  const entity = await runEntityResolution(seo, { location, domain });

  // --- Module B: demand ---
  const demand = await runDemandExtraction(seo, { keyword, location });

  // --- Module C: rankability ---
  const rankability = await runRankabilityAnalysis(seo, {
    keyword,
    location,
    targetUrl: domain,
  });

  // --- Module D: rentability ---
  const cpc = maxCpc(demand);
  const rentability = await runRentabilityValidation(seo, {
    keyword,
    location,
    demandEstimate: demand.estimate,
    cpc,
  });

  // --- Module E: scoring engine ---
  const weights = resolveWeights(process.env);
  const thresholds = resolveThresholds(process.env);
  const scorecard = buildScorecard({
    demandScore: demand.demandScore,
    rankabilityScore: rankability.rankabilityScore,
    rentabilityScore: rentability.rentabilityScore,
    entityScore: entityScore(entity.confidence),
    entityConfidence: entity.confidence,
    modelAgreement: rankability.modelAgreement,
    demandEstimate: demand.estimate,
    sourceConflict: demand.sourceConflict,
    seasonalitySeverity: demand.seasonality.severity,
    potentialRenters: rentability.potentialRenters,
    leadValue: rentability.leadValue,
    hardReject: entity.hardReject,
    weights,
    thresholds,
  });

  // --- Persist ---
  await persist(db, candidate, { entity, demand, rankability, rentability, scorecard });

  return { entity, demand, rankability, rentability, scorecard };
}

function maxCpc(demand: DemandResult): number | undefined {
  const cpcs = demand.observations
    .map((o) => o.cpc)
    .filter((c): c is number => typeof c === "number" && c > 0);
  if (cpcs.length === 0) return undefined;
  return Math.max(...cpcs);
}

async function persist(
  db: SupabaseClient<Database>,
  candidate: CandidateInput,
  outcome: ResearchOutcome,
): Promise<void> {
  const { entity, demand, rankability, rentability, scorecard } = outcome;
  const { id } = candidate;

  // places
  if (entity.canonical) {
    await db.from("places").insert({
      candidate_id: id,
      canonical_name: entity.canonical.name,
      google_place_id: entity.canonical.googlePlaceId ?? null,
      latitude: entity.canonical.latitude ?? null,
      longitude: entity.canonical.longitude ?? null,
      county: entity.canonical.county ?? null,
      metro: entity.canonical.metro ?? null,
      state: entity.canonical.state ?? null,
      timezone: entity.canonical.timezone ?? null,
      population: entity.canonical.population ?? null,
      ambiguity_score: entity.ambiguityScore,
      confidence: entity.confidence,
      bounding_box: entity.canonical.boundingBox ?? null,
      alternative_names: entity.alternatives.map((a) => ({
        name: a.name,
        state: a.state,
        googlePlaceId: a.googlePlaceId,
      })),
      hard_reject: entity.hardReject,
    });
  }

  // demand_metrics — one row per observation + a summary row.
  const demandRows = [
    ...demand.observations.map((o) => ({
      candidate_id: id,
      source: o.source,
      keyword: o.keyword,
      volume: o.volume,
      confidence: o.confidence,
      month: o.month ?? null,
      device: o.device ?? null,
      intent_score: demand.commercialIntentScore,
      seasonality: null,
    })),
    {
      candidate_id: id,
      source: "summary",
      keyword: `${candidate.keyword} ${candidate.location}`,
      volume: demand.estimate,
      confidence: demand.sourceAgreement,
      month: null,
      device: "all",
      intent_score: demand.commercialIntentScore,
      seasonality: demand.seasonality,
    },
  ];
  await db.from("demand_metrics").insert(demandRows);

  // serp_results
  await db.from("serp_results").insert(
    rankability.topResults.map((r) => ({
      candidate_id: id,
      query: `${candidate.keyword} ${candidate.location}`,
      result_type: r.resultType,
      url: r.url,
      title: r.title,
      domain_rating: r.domainRating,
      backlinks: r.backlinks,
      referring_domains: r.referringDomains,
      content_depth: r.contentDepth,
      last_updated: r.lastUpdated ?? null,
      position: r.position,
      collected_at: new Date().toISOString(),
    })),
  );

  // businesses
  await db.from("businesses").insert(
    rentability.businesses.map((b) => ({
      candidate_id: id,
      name: b.name,
      address: b.address ?? null,
      phone: b.phone ?? null,
      website: b.website ?? null,
      rating: b.rating ?? null,
      review_count: b.reviewCount ?? 0,
      google_place_id: b.googlePlaceId ?? null,
      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,
      ads_detected: b.adsDetected,
      call_tracking_detected: b.callTrackingDetected,
      website_quality: b.websiteQuality,
      marketing_budget_estimate: b.marketingBudgetEstimate ?? null,
      source: b.source,
    })),
  );

  // scores
  await db.from("scores").insert({
    candidate_id: id,
    demand_score: scorecard.demandScore,
    rankability_score: scorecard.rankabilityScore,
    rentability_score: scorecard.rentabilityScore,
    entity_score: scorecard.entityScore,
    final_score: scorecard.finalScore,
    classification: scorecard.classification,
    model_agreement: scorecard.modelAgreement,
    demand_details: demand,
    rankability_details: {
      modelAScore: rankability.modelAScore,
      modelBScore: rankability.modelBScore,
      confidenceInterval: rankability.confidenceInterval,
      timeToRankTop3Months: rankability.timeToRankTop3Months,
      linkBudget: rankability.linkBudget,
      contentGaps: rankability.contentGaps,
    },
    rentability_details: {
      potentialRenters: rentability.potentialRenters,
      leadValue: rentability.leadValue,
      rentalFloor: rentability.rentalFloor,
      rentalCeiling: rentability.rentalCeiling,
      aggregatorDominance: rentability.aggregatorDominance,
      flags: rentability.flags,
    },
    entity_details: {
      ambiguityScore: entity.ambiguityScore,
      confidence: entity.confidence,
      collisionDetected: entity.collisionDetected,
      alternatives: entity.alternatives,
    },
    flags: scorecard.flags,
    checklist: Object.fromEntries(
      scorecard.checklist.map((c) => [c.key, { label: c.label, passed: c.passed, detail: c.detail }]),
    ),
  });

  // update candidate status
  const nextStatus = scorecard.classification === "reject" ? "rejected" : "scored";
  await db.from("candidates").update({ status: nextStatus }).eq("id", id);
}
