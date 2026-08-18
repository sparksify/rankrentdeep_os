// ===========================================================================
// RankRentDeep OS — Module B: Demand Extraction Engine
// Queries keyword volume across sources, Google Trends seasonality, and
// computes commercial/local intent + a normalized demand score.
// ===========================================================================

import type { DemandResult, DemandObservation } from "@/core/types";
import { buildDemandResult } from "@/core/demand";
import type { UnifiedSeoClient } from "@/lib/providers";

export interface DemandInput {
  keyword: string;
  location: string;
  minDemand?: number;
}

export async function runDemandExtraction(
  seo: UnifiedSeoClient,
  input: DemandInput,
): Promise<DemandResult> {
  const { keyword, location } = input;

  // Exact-match local phrases + bare keyword for context.
  const phrases = [
    `${keyword} in ${location}`,
    `${keyword} ${location}`,
    keyword,
  ];

  const observations: DemandObservation[] = [];
  await Promise.all(
    phrases.map(async (phrase) => {
      const obs = await seo.keywordVolume(phrase, location);
      observations.push(...obs);
    }),
  );

  const curve = await seo.trends(`${keyword} ${location}`, location);
  const [relatedSearches, peopleAlsoAsk] = await Promise.all([
    seo.relatedSearches(`${keyword} ${location}`, location),
    seo.peopleAlsoAsk(`${keyword} ${location}`, location),
  ]);

  return buildDemandResult({
    observations,
    keyword,
    location,
    curve,
    minDemand: input.minDemand,
    relatedSearches,
    peopleAlsoAsk,
  });
}
