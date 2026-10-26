/**
 * Asset-first market selection V2.
 * Pure, deterministic underwriting overlay; does not change legacy scoring
 * until the research pipeline provides measured inputs.
 */
export interface AssetMarketEvidence {
  niche: string;
  location: string;
  organicRankability: number; // 0..100, organic results excluding map pack
  qualifiedMonthlySearches: number;
  immediateNeed: number; // 0..100
  subjectivePurchase: number; // 0..100 (higher is worse)
  phoneFirstIntent: number; // 0..100
  credibleRenters: number;
  paidAcquisitionEvidence: boolean;
  estimatedQualifiedCalls: number;
  contractorGrossProfitPerJob: number;
  estimatedCloseRate: number; // 0..1
  monthlyOperatingCost: number;
  demandStability: number; // 0..100
  dataConfidence: number; // 0..100
}
export interface AssetDecision {
  status: "reject" | "validate" | "candidate";
  score: number;
  estimatedMonthlyRenterValue: number;
  indicativeMonthlyRent: number;
  reasons: string[];
}
const clamp = (v: number) => Math.max(0, Math.min(100, v));
export function evaluateAssetMarket(e: AssetMarketEvidence): AssetDecision {
  const reasons: string[] = [];
  const valid = Object.values(e).every(v => typeof v !== "number" || Number.isFinite(v));
  if (!valid) reasons.push("Non-finite input");
  if (e.credibleRenters < 5) reasons.push("Fewer than five credible potential renters");
  if (e.qualifiedMonthlySearches < 100) reasons.push("Insufficient qualified search demand");
  if (e.organicRankability < 50) reasons.push("Organic ranking opportunity not established");
  if (e.subjectivePurchase > 60) reasons.push("Highly subjective purchasing decision");
  if (e.immediateNeed < 50 || e.phoneFirstIntent < 50) reasons.push("Weak immediate phone-first intent");
  if (e.estimatedQualifiedCalls < 0 || e.contractorGrossProfitPerJob < 0 ||
      e.monthlyOperatingCost < 0 || e.estimatedCloseRate < 0 || e.estimatedCloseRate > 1) {
    reasons.push("Invalid economic inputs");
  }
  const renterValue = Math.max(0, e.estimatedQualifiedCalls * e.estimatedCloseRate * e.contractorGrossProfitPerJob);
  // Conservative starting hypothesis: 20% of modeled gross profit, not a market quote.
  const indicativeRent = Math.max(0, Math.round(renterValue * 0.2));
  const economics = clamp(indicativeRent / 1500 * 100);
  const renterScore = clamp(e.credibleRenters / 10 * 100);
  const intent = (clamp(e.immediateNeed) + clamp(e.phoneFirstIntent) + (100-clamp(e.subjectivePurchase)))/3;
  const demand = clamp(e.qualifiedMonthlySearches / 500 * 100);
  const score = Math.round((
    clamp(e.organicRankability)*0.25 +
    (economics*0.65+renterScore*0.35)*0.25 +
    intent*0.20 + renterScore*0.15 + demand*0.10 +
    clamp(e.demandStability)*0.05
  )*10)/10;
  if (e.dataConfidence < 70) reasons.push("Insufficient research confidence");
  if (!e.paidAcquisitionEvidence) reasons.push("No evidence renters pay to acquire customers");
  if (indicativeRent < 300) reasons.push("Modeled rent below $300 monthly");
  const hard = reasons.some(r => /Non-finite|Invalid economic|Fewer than|Insufficient qualified|Organic ranking|Highly subjective|Weak immediate/.test(r));
  return { status: hard ? "reject" : reasons.length ? "validate" : "candidate",
    score, estimatedMonthlyRenterValue: Math.round(renterValue),
    indicativeMonthlyRent: indicativeRent, reasons };
}
