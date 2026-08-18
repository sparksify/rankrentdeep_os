// ===========================================================================
// RankRentDeep OS — committee brief builder
// Maps Supabase research data into the structured brief the committee reviews.
// ===========================================================================

import type { CommitteeBrief, SerpBrief } from "./committee";
import type { CandidateDetail, CandidateWithScore } from "@/lib/queries";
import type { ScoreRow } from "@/lib/supabase/types";

function scoreDetail<T>(score: ScoreRow | null | undefined, key: keyof ScoreRow): T {
  return (score?.[key] ?? null) as T;
}

export function buildCandidateBrief(detail: CandidateDetail): CommitteeBrief {
  const score = detail.score;
  const demand = scoreDetail<Record<string, unknown>>(score, "demand_details") ?? {};
  const rankability = scoreDetail<Record<string, unknown>>(score, "rankability_details") ?? {};
  const rentability = scoreDetail<Record<string, unknown>>(score, "rentability_details") ?? {};
  const entity = scoreDetail<Record<string, unknown>>(score, "entity_details") ?? {};

  const serp: SerpBrief[] = detail.serp.map((s) => ({
    position: s.position ?? 0,
    type: s.result_type,
    domainRating: s.domain_rating ?? 0,
  }));

  const checklist = Object.entries(score?.checklist ?? {}).map(([, v]) => {
    const item = v as { label?: string; passed?: boolean };
    return { label: item.label ?? "", passed: Boolean(item.passed) };
  });

  return {
    domain: detail.candidate.domain,
    keyword: detail.candidate.keyword,
    location: detail.candidate.location,
    finalScore: Number(score?.final_score ?? 0),
    classification: score?.classification ?? "",
    demandScore: Number(score?.demand_score ?? 0),
    rankabilityScore: Number(score?.rankability_score ?? 0),
    rentabilityScore: Number(score?.rentability_score ?? 0),
    entityConfidence: Number(entity.confidence ?? 0),
    demandEstimate: Number(demand.estimate ?? 0),
    sourceAgreement: Number(demand.sourceAgreement ?? 0),
    seasonalitySeverity: Number((demand.seasonality as { severity?: number })?.severity ?? 0),
    modelAgreement: score?.model_agreement ?? "",
    timeToRank: Number(rankability.timeToRankTop3Months ?? 0),
    linkBudget: Number(rankability.linkBudget ?? 0),
    potentialRenters: Number(rentability.potentialRenters ?? 0),
    leadValue: Number(rentability.leadValue ?? 0),
    rentalFloor: Number(rentability.rentalFloor ?? 0),
    rentalCeiling: Number(rentability.rentalCeiling ?? 0),
    aggregatorDominance: Boolean(rentability.aggregatorDominance),
    serp,
    flags: Array.isArray(score?.flags) ? score.flags.map(String) : [],
    contentGaps: Array.isArray(rankability.contentGaps) ? rankability.contentGaps.map(String) : [],
    relatedSearches: Array.isArray(demand.relatedSearches) ? demand.relatedSearches.map(String) : [],
    peopleAlsoAsk: Array.isArray(demand.peopleAlsoAsk) ? demand.peopleAlsoAsk.map(String) : [],
    checklist,
  };
}

export function buildPortfolioBrief(candidates: CandidateWithScore[]): CommitteeBrief {
  const scored = candidates.filter((c) => c.scores?.[0]?.final_score != null);
  const lines = scored.map((c) => {
    const s = c.scores?.[0];
    return `- ${c.domain} | ${c.keyword} in ${c.location} | score ${s?.final_score} | ${s?.classification}`;
  });

  const avg =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, c) => sum + Number(c.scores?.[0]?.final_score ?? 0), 0) /
            scored.length,
        )
      : 0;

  return {
    domain: "Portfolio review",
    keyword: "aggregate",
    location: "all markets",
    finalScore: avg,
    classification: "portfolio",
    demandScore: 0,
    rankabilityScore: 0,
    rentabilityScore: 0,
    entityConfidence: 0,
    demandEstimate: 0,
    sourceAgreement: 0,
    seasonalitySeverity: 0,
    modelAgreement: "",
    timeToRank: 0,
    linkBudget: 0,
    potentialRenters: 0,
    leadValue: 0,
    rentalFloor: 0,
    rentalCeiling: 0,
    aggregatorDominance: false,
    serp: [],
    flags: [],
    contentGaps: [],
    relatedSearches: [],
    peopleAlsoAsk: [],
    checklist: [],
    extraContext: [
      `This is a PORTFOLIO review of ${scored.length} scored candidate domains (average final score ${avg}).`,
      `Assess the batch allocation strategy and flag the strongest and weakest sites.`,
      "Candidate list:",
      ...(lines.length ? lines : ["(no scored candidates)"]),
    ].join("\n"),
  };
}
