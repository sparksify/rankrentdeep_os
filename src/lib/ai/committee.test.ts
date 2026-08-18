import { describe, expect, it } from "vitest";
import { aggregateResults, type ModelResult } from "./committee";

function result(stance: ModelResult["stance"], confidence: number): ModelResult {
  return {
    model: "test/model",
    role: "Tester",
    stance,
    confidence,
    thesis: "",
    risks: ["low demand"],
    opportunities: [],
    maxBudget: 1000,
  };
}

describe("committee aggregation", () => {
  it("reaches approve consensus when approve wins a majority", () => {
    const agg = aggregateResults([
      result("approve", 80),
      result("approve", 70),
      result("hold", 60),
    ]);
    expect(agg.consensus).toBe("approve");
    expect(agg.votes.approve).toBe(2);
  });

  it("reaches reject consensus when reject wins", () => {
    const agg = aggregateResults([
      result("reject", 90),
      result("reject", 85),
      result("approve", 50),
    ]);
    expect(agg.consensus).toBe("reject");
  });

  it("falls back to hold on a split", () => {
    const agg = aggregateResults([
      result("approve", 80),
      result("reject", 80),
    ]);
    expect(agg.consensus).toBe("hold");
  });

  it("ignores errored members and averages confidence over valid ones", () => {
    const errored: ModelResult = {
      model: "test/model",
      role: "Tester",
      stance: "hold",
      confidence: 0,
      thesis: "",
      risks: [],
      opportunities: [],
      maxBudget: null,
      error: "boom",
    };
    const agg = aggregateResults([result("approve", 90), result("approve", 70), errored]);
    expect(agg.votes.approve).toBe(2);
    expect(agg.averageConfidence).toBe(80);
  });
});
