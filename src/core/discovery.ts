// ===========================================================================
// RankRentDeep OS — discovery engine (pure)
// The "hit go" layer: a curated set of rank-and-rent-friendly service niches
// cross-joined against a seed list of US metro markets to generate candidate
// hypotheses (domain/keyword/location) that the research pipeline then scores.
// ===========================================================================

export interface Market {
  city: string;
  state: string;
}

export interface CandidateSpec {
  domain: string;
  keyword: string;
  location: string;
}

// Rank-and-rent-friendly service verticals. These are high-ticket,
// local-intent services with recurring/emergency demand that businesses pay
// per lead for — the classic rentable niches.
export const DEFAULT_NICHES: string[] = [
  "sprinkler repair",
  "plumber",
  "hvac repair",
  "air conditioning repair",
  "roofing contractor",
  "electrician",
  "landscaping",
  "tree service",
  "garage door repair",
  "pest control",
  "pressure washing",
  "window cleaning",
  "house painting",
  "fence installation",
  "concrete contractor",
  "water damage restoration",
  "mold remediation",
  "locksmith",
  "appliance repair",
  "junk removal",
  "carpet cleaning",
  "gutter cleaning",
  "pool cleaning",
  "septic tank service",
];

// Seed metro markets (top ~100 US metros). State is included for entity
// disambiguation — several are deliberate name-collision pairs (Aurora,
// Bellevue, Rochester) that exercise Module A's ambiguity detection.
export const DEFAULT_MARKETS: Market[] = [
  { city: "New York", state: "NY" }, { city: "Los Angeles", state: "CA" },
  { city: "Chicago", state: "IL" }, { city: "Houston", state: "TX" },
  { city: "Phoenix", state: "AZ" }, { city: "Philadelphia", state: "PA" },
  { city: "San Antonio", state: "TX" }, { city: "San Diego", state: "CA" },
  { city: "Dallas", state: "TX" }, { city: "San Jose", state: "CA" },
  { city: "Austin", state: "TX" }, { city: "Jacksonville", state: "FL" },
  { city: "Fort Worth", state: "TX" }, { city: "Columbus", state: "OH" },
  { city: "Charlotte", state: "NC" }, { city: "San Francisco", state: "CA" },
  { city: "Indianapolis", state: "IN" }, { city: "Seattle", state: "WA" },
  { city: "Denver", state: "CO" }, { city: "Nashville", state: "TN" },
  { city: "Oklahoma City", state: "OK" }, { city: "Boston", state: "MA" },
  { city: "Portland", state: "OR" }, { city: "Las Vegas", state: "NV" },
  { city: "Detroit", state: "MI" }, { city: "Memphis", state: "TN" },
  { city: "Louisville", state: "KY" }, { city: "Baltimore", state: "MD" },
  { city: "Milwaukee", state: "WI" }, { city: "Albuquerque", state: "NM" },
  { city: "Tucson", state: "AZ" }, { city: "Fresno", state: "CA" },
  { city: "Sacramento", state: "CA" }, { city: "Kansas City", state: "MO" },
  { city: "Atlanta", state: "GA" }, { city: "Omaha", state: "NE" },
  { city: "Colorado Springs", state: "CO" }, { city: "Raleigh", state: "NC" },
  { city: "Miami", state: "FL" }, { city: "Virginia Beach", state: "VA" },
  { city: "Minneapolis", state: "MN" }, { city: "Tulsa", state: "OK" },
  { city: "Wichita", state: "KS" }, { city: "New Orleans", state: "LA" },
  { city: "Cleveland", state: "OH" }, { city: "Tampa", state: "FL" },
  { city: "Aurora", state: "CO" }, { city: "Honolulu", state: "HI" },
  { city: "Riverside", state: "CA" }, { city: "St. Louis", state: "MO" },
  { city: "Lexington", state: "KY" }, { city: "Pittsburgh", state: "PA" },
  { city: "Anchorage", state: "AK" }, { city: "Cincinnati", state: "OH" },
  { city: "Henderson", state: "NV" }, { city: "Greensboro", state: "NC" },
  { city: "Plano", state: "TX" }, { city: "Lincoln", state: "NE" },
  { city: "Toledo", state: "OH" }, { city: "Orlando", state: "FL" },
  { city: "Jersey City", state: "NJ" }, { city: "Chandler", state: "AZ" },
  { city: "Fort Wayne", state: "IN" }, { city: "Buffalo", state: "NY" },
  { city: "Durham", state: "NC" }, { city: "St. Petersburg", state: "FL" },
  { city: "Irvine", state: "CA" }, { city: "Madison", state: "WI" },
  { city: "Norfolk", state: "VA" }, { city: "Lubbock", state: "TX" },
  { city: "Richmond", state: "VA" }, { city: "Boise", state: "ID" },
  { city: "Winston-Salem", state: "NC" }, { city: "Spokane", state: "WA" },
  { city: "Des Moines", state: "IA" }, { city: "Baton Rouge", state: "LA" },
  { city: "Grand Rapids", state: "MI" }, { city: "Bellevue", state: "WA" },
  { city: "Rochester", state: "NY" }, { city: "Rochester", state: "MN" },
  { city: "Aurora", state: "IL" }, { city: "Bellevue", state: "NE" },
  { city: "Salt Lake City", state: "UT" }, { city: "Kansas City", state: "KS" },
  { city: "Birmingham", state: "AL" }, { city: "Little Rock", state: "AR" },
  { city: "Hartford", state: "CT" }, { city: "New Haven", state: "CT" },
  { city: "Dayton", state: "OH" }, { city: "Akron", state: "OH" },
  { city: "Savannah", state: "GA" }, { city: "Columbia", state: "SC" },
  { city: "Charleston", state: "SC" }, { city: "Knoxville", state: "TN" },
  { city: "Chattanooga", state: "TN" }, { city: "Reno", state: "NV" },
  { city: "Salem", state: "OR" }, { city: "Eugene", state: "OR" },
];

/** Lowercase and strip non-alphanumerics (for EMD-style domain generation). */
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function generateDomain(city: string, keyword: string, state?: string): string {
  const loc = state ? `${slugify(city)}${slugify(state)}` : slugify(city);
  return `${loc}${slugify(keyword)}.com`;
}

/**
 * Cross-join niches × markets into candidate specs. Cities whose name appears
 * in multiple markets (Aurora CO/IL, Kansas City MO/KS, Rochester MN/NY, …)
 * get the state abbreviation baked into the domain so every candidate has a
 * unique, non-colliding domain.
 */
export function generateCandidates(
  niches: string[],
  markets: Market[],
): CandidateSpec[] {
  const cityCount = new Map<string, number>();
  for (const m of markets) cityCount.set(m.city, (cityCount.get(m.city) ?? 0) + 1);

  const out: CandidateSpec[] = [];
  for (const m of markets) {
    const ambiguous = (cityCount.get(m.city) ?? 0) > 1;
    for (const n of niches) {
      out.push({
        domain: generateDomain(m.city, n, ambiguous ? m.state : undefined),
        keyword: n,
        location: `${m.city}, ${m.state}`,
      });
    }
  }
  return out;
}
