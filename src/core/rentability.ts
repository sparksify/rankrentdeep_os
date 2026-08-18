// ===========================================================================
// RankRentDeep OS — Module D scoring: rentability & monetization
// Pure functions. Given real local businesses + market economics, compute the
// rentability score, lead value, and rental floor/ceiling.
// ===========================================================================

import type { Business, RentabilityResult } from "./types";
import { clamp100, clampScore } from "./weights";

const MIN_RENTERS = 3;
const MIN_LEAD_VALUE = 25;

/**
 * Estimate lead value (USD) from ticket size and close rate.
 * leadValue = avgTicketSize * closeRate.
 */
export function estimateLeadValue(avgTicketSize: number, closeRate: number): number {
  return Math.round(avgTicketSize * closeRate);
}

/**
 * Estimate monthly leads from demand (searches/month) using a conservative
 * 5% search-to-lead conversion.
 */
export function estimateMonthlyLeads(demandEstimate: number): number {
  return Math.round(demandEstimate * 0.05);
}

/**
 * Rental floor/ceiling (USD/month) from lead value and monthly lead volume.
 * The site owner captures 40% (floor) to 80% (ceiling) of the lead value.
 */
export function rentalRange(
  leadValue: number,
  monthlyLeads: number,
): { floor: number; ceiling: number } {
  const gross = leadValue * monthlyLeads;
  return {
    floor: Math.round(gross * 0.4),
    ceiling: Math.round(gross * 0.8),
  };
}

export interface RentabilityInput {
  businesses: Business[];
  leadValue: number;
  demandEstimate: number;
  aggregatorDominance: boolean;
}

export function buildRentabilityResult(input: RentabilityInput): RentabilityResult {
  const { businesses, leadValue, demandEstimate, aggregatorDominance } = input;

  // A "potential renter" is a business with a website gap or no ads — i.e.
  // one that would benefit from a lead-gen site. Businesses with no website
  // or weak websites are the strongest prospects.
  const potentialRenters = businesses.filter(
    (b) => b.websiteQuality === "none" || b.websiteQuality === "basic" || !b.adsDetected,
  ).length;

  const monthlyLeads = estimateMonthlyLeads(demandEstimate);
  const { floor, ceiling } = rentalRange(leadValue, monthlyLeads);

  const rentersScore = clamp100((potentialRenters / 10) * 100);
  const leadValueScore = clamp100((leadValue / 100) * 100);
  const adCompetition = businesses.length
    ? clamp100((businesses.filter((b) => b.adsDetected).length / businesses.length) * 100)
    : 0;

  let score =
    rentersScore * 0.4 + leadValueScore * 0.3 + adCompetition * 0.3;
  if (aggregatorDominance) score -= 30;

  const flags: string[] = [];
  if (potentialRenters < MIN_RENTERS) {
    flags.push(`Fewer than ${MIN_RENTERS} potential renters identified.`);
  }
  if (leadValue < MIN_LEAD_VALUE) {
    flags.push(`Lead value $${leadValue} is below the $${MIN_LEAD_VALUE} floor.`);
  }
  if (aggregatorDominance) {
    flags.push("Market dominated by one or two large aggregators.");
  }

  return {
    rentabilityScore: clampScore(score),
    potentialRenters,
    leadValue,
    rentalFloor: floor,
    rentalCeiling: ceiling,
    businesses,
    aggregatorDominance,
    flags,
  };
}
