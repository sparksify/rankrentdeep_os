import { describe, expect, it } from "vitest";
import { evaluateAssetMarket, type AssetMarketEvidence } from "./asset-selection-v2";

const good: AssetMarketEvidence = {
  niche: "gutter cleaning", location: "Sample City, TX",
  organicRankability: 75, qualifiedMonthlySearches: 400,
  immediateNeed: 90, subjectivePurchase: 10, phoneFirstIntent: 90,
  credibleRenters: 8, paidAcquisitionEvidence: true,
  estimatedQualifiedCalls: 25, contractorGrossProfitPerJob: 250,
  estimatedCloseRate: 0.4, monthlyOperatingCost: 100,
  demandStability: 80, dataConfidence: 90,
};

describe("asset-first selection", () => {
  it("qualifies a strong market with clear renter economics", () => {
    const result = evaluateAssetMarket(good);
    expect(result.status).toBe("candidate");
    expect(result.estimatedMonthlyRenterValue).toBe(2500);
    expect(result.indicativeMonthlyRent).toBe(500);
  });
  it("rejects subjective markets with too few renters", () => {
    const result = evaluateAssetMarket({...good, subjectivePurchase: 90, credibleRenters: 2});
    expect(result.status).toBe("reject");
  });
  it("requires evidence for unverified paid acquisition", () => {
    const result = evaluateAssetMarket({...good, paidAcquisitionEvidence: false});
    expect(result.status).toBe("validate");
  });
  it("rejects invalid conversion assumptions", () => {
    expect(evaluateAssetMarket({...good, estimatedCloseRate: 1.5}).status).toBe("reject");
  });
});
