// ===========================================================================
// RankRentDeep OS — Module D: Rentability & Monetization Validation
// Identifies real local businesses that could rent the site, estimates lead
// value from industry benchmarks + CPC, and computes rentability.
// ===========================================================================

import type { RentabilityResult } from "@/core/types";
import { buildRentabilityResult, estimateLeadValue } from "@/core/rentability";
import { lookupBenchmark } from "@/lib/benchmarks";
import type { UnifiedSeoClient } from "@/lib/providers";

export interface RentabilityInput {
  keyword: string;
  location: string;
  demandEstimate: number;
  /** Optional CPC (USD) from keyword data, used to refine lead value. */
  cpc?: number;
}

export async function runRentabilityValidation(
  seo: UnifiedSeoClient,
  input: RentabilityInput,
): Promise<RentabilityResult> {
  const businesses = await seo.businessSearch(input.location, input.keyword);

  const benchmark = lookupBenchmark(input.keyword);
  const ticketSize = benchmark.ticketSize;
  const closeRate = benchmark.closeRate;

  // Lead value from ticket size + close rate; refined upward if CPC is high.
  const baseLeadValue = estimateLeadValue(ticketSize, closeRate);
  const leadValue = input.cpc ? Math.max(baseLeadValue, Math.round(input.cpc * 5)) : baseLeadValue;

  // Aggregator dominance: few independent businesses suggests the market is
  // dominated by directories/aggregators.
  const aggregatorDominance = businesses.length < 3;

  return buildRentabilityResult({
    businesses,
    leadValue,
    demandEstimate: input.demandEstimate,
    aggregatorDominance,
  });
}
