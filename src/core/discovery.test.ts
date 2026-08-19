import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKETS,
  DEFAULT_NICHES,
  generateCandidates,
  generateDomain,
  slugify,
} from "./discovery";

describe("discovery engine", () => {
  it("slugifies into EMD-style domain tokens", () => {
    expect(slugify("St. Louis")).toBe("stlouis");
    expect(generateDomain("Austin", "sprinkler repair")).toBe(
      "austinsprinklerrepair.com",
    );
  });

  it("cross-joins niches and markets with unique domains", () => {
    const specs = generateCandidates(DEFAULT_NICHES, DEFAULT_MARKETS);
    expect(specs.length).toBe(DEFAULT_NICHES.length * DEFAULT_MARKETS.length);
    const domains = new Set(specs.map((s) => s.domain));
    expect(domains.size).toBe(specs.length);
  });

  it("disambiguates collision cities in the domain", () => {
    const aurora = generateCandidates(["plumber"], [
      { city: "Aurora", state: "CO" },
      { city: "Aurora", state: "IL" },
    ]);
    expect(aurora[0].domain).not.toBe(aurora[1].domain);
    expect(aurora[0].domain).toBe("auroracoplumber.com");
    expect(aurora[1].domain).toBe("aurorailplumber.com");
  });

  it("produces a large opportunity space by default", () => {
    expect(DEFAULT_NICHES.length * DEFAULT_MARKETS.length).toBeGreaterThan(1000);
  });

  it("includes deliberate name-collision markets for entity disambiguation", () => {
    const auroras = DEFAULT_MARKETS.filter((m) => m.city === "Aurora");
    expect(auroras.length).toBeGreaterThan(1);
  });
});
