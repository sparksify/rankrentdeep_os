import { describe, expect, it } from "vitest";
import {
  buildDemandResult,
  buildRankabilityResult,
  buildRentabilityResult,
  buildScorecard,
  classify,
  commercialIntentScore,
  computeFinalScore,
  detectCollision,
  entityScore,
  estimateDemand,
  estimateLeadValue,
  localIntentProbability,
  modelA,
  modelB,
  modelAgreement,
  rentalRange,
  resolveEntity,
  resolveWeights,
  sourceAgreement,
} from "./index";
import type { Business, PlaceCandidate, SerpResult } from "./types";

describe("entity resolution", () => {
  const bellevueWA: PlaceCandidate = {
    name: "Bellevue",
    state: "WA",
    type: "city",
    population: 150000,
    relativeVolume: 0.9,
  };
  const bellevueNE: PlaceCandidate = {
    name: "Bellevue",
    state: "NE",
    type: "city",
    population: 50000,
    relativeVolume: 0.08,
  };

  it("detects name collisions", () => {
    expect(detectCollision([bellevueWA, bellevueNE])).toBe(true);
    expect(detectCollision([bellevueWA])).toBe(false);
  });

  it("computes low ambiguity when one candidate dominates", () => {
    const result = resolveEntity([bellevueWA, bellevueNE]);
    expect(result.canonical?.state).toBe("WA");
    expect(result.ambiguityScore).toBeLessThan(20);
    expect(result.confidence).toBeGreaterThan(80);
    expect(result.hardReject).toBe(false);
    expect(result.collisionDetected).toBe(true);
  });

  it("hard-rejects when no candidate resolves", () => {
    const result = resolveEntity([]);
    expect(result.hardReject).toBe(true);
    expect(result.confidence).toBe(0);
  });

  it("hard-rejects when ambiguity is high", () => {
    const a: PlaceCandidate = { name: "Rochester", state: "MN", type: "city", relativeVolume: 0.5 };
    const b: PlaceCandidate = { name: "Rochester", state: "NY", type: "city", relativeVolume: 0.5 };
    const result = resolveEntity([a, b]);
    expect(result.hardReject).toBe(true);
    expect(result.confidence).toBeLessThan(70);
  });

  it("scores entity confidence", () => {
    expect(entityScore(100)).toBe(100);
    expect(entityScore(50)).toBeLessThan(50);
  });
});

describe("demand", () => {
  it("estimates demand range from observations", () => {
    const est = estimateDemand([
      { source: "dataforseo", keyword: "x", volume: 300, confidence: 90 },
      { source: "ahrefs", keyword: "x", volume: 250, confidence: 80 },
      { source: "semrush", keyword: "x", volume: 400, confidence: 85 },
    ]);
    expect(est.estimate).toBe(300);
    expect(est.low).toBeLessThanOrEqual(est.high);
  });

  it("flags source conflict when spread > 30%", () => {
    const { conflict } = sourceAgreement([
      { source: "a", keyword: "x", volume: 100, confidence: 90 },
      { source: "b", keyword: "x", volume: 500, confidence: 90 },
    ]);
    expect(conflict).toBe(true);
  });

  it("scores commercial intent", () => {
    expect(commercialIntentScore("sprinkler repair near me")).toBeGreaterThan(
      commercialIntentScore("sprinkler"),
    );
  });

  it("scores local intent", () => {
    expect(localIntentProbability("plumber near me", "Austin")).toBeGreaterThan(
      localIntentProbability("plumber"),
    );
  });

  it("rejects demand below minimum", () => {
    const result = buildDemandResult({
      observations: [{ source: "a", keyword: "x", volume: 20, confidence: 90 }],
      keyword: "sprinkler repair",
      minDemand: 100,
    });
    expect(result.recommendation).toBe("reject");
  });
});

describe("rankability", () => {
  const weakSerp: SerpResult[] = Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    resultType: "directory",
    url: `https://example.com/${i}`,
    title: "x",
    domainRating: 20,
    backlinks: 10,
    referringDomains: 5,
    contentDepth: 300,
    onPageLocalSignals: 20,
    pageSpeed: 40,
  }));

  const strongSerp: SerpResult[] = Array.from({ length: 10 }, (_, i) => ({
    position: i + 1,
    resultType: "lead_gen",
    url: `https://example.com/${i}`,
    title: "x",
    domainRating: 80,
    backlinks: 5000,
    referringDomains: 300,
    contentDepth: 2000,
    onPageLocalSignals: 90,
    pageSpeed: 90,
  }));

  it("weak SERP yields high rankability", () => {
    const r = buildRankabilityResult({ topResults: weakSerp });
    expect(r.rankabilityScore).toBeGreaterThan(60);
  });

  it("strong SERP yields low rankability", () => {
    const r = buildRankabilityResult({ topResults: strongSerp });
    expect(r.rankabilityScore).toBeLessThan(40);
  });

it("detects model disagreement", () => {
    expect(modelAgreement(80, 20)).toBe("high_uncertainty");
    expect(modelAgreement(80, 60)).toBe("disagree");
    expect(modelAgreement(80, 78)).toBe("agree");
  });

  it("model A and B are independent", () => {
    expect(modelA(weakSerp)).not.toBe(modelB(weakSerp));
  });
});

describe("rentability", () => {
  const businesses: Business[] = [
    { name: "A", websiteQuality: "none", adsDetected: false, callTrackingDetected: false, source: "google" },
    { name: "B", websiteQuality: "basic", adsDetected: false, callTrackingDetected: false, source: "google" },
    { name: "C", websiteQuality: "good", adsDetected: true, callTrackingDetected: true, source: "google" },
    { name: "D", websiteQuality: "none", adsDetected: false, callTrackingDetected: false, source: "google" },
  ];

  it("estimates lead value", () => {
    expect(estimateLeadValue(500, 0.2)).toBe(100);
  });

  it("computes rental range", () => {
    const { floor, ceiling } = rentalRange(50, 15);
    expect(floor).toBe(300);
    expect(ceiling).toBe(600);
    expect(floor).toBeLessThan(ceiling);
  });

  it("scores rentability with enough renters", () => {
    const r = buildRentabilityResult({
      businesses,
      leadValue: 50,
      demandEstimate: 300,
      aggregatorDominance: false,
    });
    expect(r.potentialRenters).toBe(3);
    expect(r.rentabilityScore).toBeGreaterThan(0);
  });

  it("penalizes aggregator dominance", () => {
    const normal = buildRentabilityResult({
      businesses,
      leadValue: 50,
      demandEstimate: 300,
      aggregatorDominance: false,
    });
    const dominated = buildRentabilityResult({
      businesses,
      leadValue: 50,
      demandEstimate: 300,
      aggregatorDominance: true,
    });
    expect(dominated.rentabilityScore).toBeLessThan(normal.rentabilityScore);
  });
});

describe("final scoring", () => {
  const weights = resolveWeights();
  const thresholds = {
    minDemand: 100,
    minEntityConfidence: 70,
    minRenters: 3,
    minLeadValue: 25,
    modelDisagreementPoints: 15,
    sourceConflictPercent: 30,
    coreBetMin: 70,
    rejectMax: 40,
  };

  it("weights sum to 1", () => {
    const sum = weights.demand + weights.rankability + weights.rentability + weights.entity;
    expect(sum).toBeCloseTo(1, 5);
  });

  it("classifies a strong candidate as core revenue bet", () => {
    const input = {
      demandScore: 85,
      rankabilityScore: 80,
      rentabilityScore: 78,
      entityScore: 90,
      entityConfidence: 95,
      modelAgreement: "agree" as const,
      demandEstimate: 400,
      sourceConflict: false,
      seasonalitySeverity: 20,
      potentialRenters: 6,
      leadValue: 60,
      hardReject: false,
      weights,
      thresholds,
    };
    const score = computeFinalScore(input);
    expect(classify(input, score)).toBe("core_revenue_bet");
  });

  it("rejects when demand is below minimum", () => {
    const input = {
      demandScore: 10,
      rankabilityScore: 80,
      rentabilityScore: 78,
      entityScore: 90,
      entityConfidence: 95,
      modelAgreement: "agree" as const,
      demandEstimate: 20,
      sourceConflict: false,
      seasonalitySeverity: 20,
      potentialRenters: 6,
      leadValue: 60,
      hardReject: false,
      weights,
      thresholds,
    };
    const score = computeFinalScore(input);
    expect(classify(input, score)).toBe("reject");
  });

  it("builds a full scorecard with checklist", () => {
    const input = {
      demandScore: 85,
      rankabilityScore: 80,
      rentabilityScore: 78,
      entityScore: 90,
      entityConfidence: 95,
      modelAgreement: "agree" as const,
      demandEstimate: 400,
      sourceConflict: false,
      seasonalitySeverity: 20,
      potentialRenters: 6,
      leadValue: 60,
      hardReject: false,
      weights,
      thresholds,
    };
    const card = buildScorecard(input);
    expect(card.checklist).toHaveLength(6);
    expect(card.checklist.every((c) => c.passed)).toBe(true);
    expect(card.finalScore).toBeGreaterThan(70);
  });

it("resolves weights from env", () => {
    const w = resolveWeights({ W_DEMAND: "0.5", W_RANKABILITY: "0.5" });
    // Weights are normalized to sum to 1; demand and rankability stay equal.
    expect(w.demand).toBeCloseTo(w.rankability, 5);
    expect(w.demand + w.rankability + w.rentability + w.entity).toBeCloseTo(1, 5);
  });
});
