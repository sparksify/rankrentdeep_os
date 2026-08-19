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
  { city: "Chattanooga", state: "TN" },   { city: "Reno", state: "NV" },
  { city: "Salem", state: "OR" }, { city: "Eugene", state: "OR" },
  // --- Mid-size / smaller metros (100k–500k): the real EMD sweet spot ---
  { city: "Huntsville", state: "AL" }, { city: "Mobile", state: "AL" },
  { city: "Montgomery", state: "AL" }, { city: "Tuscaloosa", state: "AL" },
  { city: "Fayetteville", state: "AR" }, { city: "Springdale", state: "AR" },
  { city: "Fort Smith", state: "AR" }, { city: "Scottsdale", state: "AZ" },
  { city: "Glendale", state: "AZ" }, { city: "Tempe", state: "AZ" },
  { city: "Surprise", state: "AZ" }, { city: "Yuma", state: "AZ" },
  { city: "Flagstaff", state: "AZ" }, { city: "Lake Havasu City", state: "AZ" },
  { city: "Modesto", state: "CA" }, { city: "Visalia", state: "CA" },
  { city: "Oxnard", state: "CA" }, { city: "Santa Clarita", state: "CA" },
  { city: "Temecula", state: "CA" }, { city: "Roseville", state: "CA" },
  { city: "Elk Grove", state: "CA" }, { city: "Corona", state: "CA" },
  { city: "Rancho Cucamonga", state: "CA" }, { city: "Ontario", state: "CA" },
  { city: "Fontana", state: "CA" }, { city: "Moreno Valley", state: "CA" },
  { city: "Huntington Beach", state: "CA" }, { city: "Santa Rosa", state: "CA" },
  { city: "Lancaster", state: "CA" }, { city: "Palmdale", state: "CA" },
  { city: "Salinas", state: "CA" }, { city: "Hayward", state: "CA" },
  { city: "Sunnyvale", state: "CA" }, { city: "Fullerton", state: "CA" },
  { city: "Pasadena", state: "CA" }, { city: "Torrance", state: "CA" },
  { city: "Thousand Oaks", state: "CA" }, { city: "Concord", state: "CA" },
  { city: "Vallejo", state: "CA" }, { city: "San Bernardino", state: "CA" },
  { city: "Fort Collins", state: "CO" }, { city: "Boulder", state: "CO" },
  { city: "Greeley", state: "CO" }, { city: "Pueblo", state: "CO" },
  { city: "Loveland", state: "CO" }, { city: "Longmont", state: "CO" },
  { city: "Bridgeport", state: "CT" }, { city: "Stamford", state: "CT" },
  { city: "Waterbury", state: "CT" }, { city: "Norwalk", state: "CT" },
  { city: "Wilmington", state: "DE" },
  { city: "Cape Coral", state: "FL" }, { city: "Port St. Lucie", state: "FL" },
  { city: "Lakeland", state: "FL" }, { city: "Fort Lauderdale", state: "FL" },
  { city: "Pembroke Pines", state: "FL" }, { city: "Hollywood", state: "FL" },
  { city: "Miramar", state: "FL" }, { city: "Gainesville", state: "FL" },
  { city: "Clearwater", state: "FL" }, { city: "Palm Bay", state: "FL" },
  { city: "Coral Springs", state: "FL" }, { city: "West Palm Beach", state: "FL" },
  { city: "Daytona Beach", state: "FL" }, { city: "Ocala", state: "FL" },
  { city: "Fort Myers", state: "FL" },
  { city: "Augusta", state: "GA" }, { city: "Columbus", state: "GA" },
  { city: "Macon", state: "GA" }, { city: "Athens", state: "GA" },
  { city: "Sandy Springs", state: "GA" }, { city: "Roswell", state: "GA" },
  { city: "Cedar Rapids", state: "IA" }, { city: "Davenport", state: "IA" },
  { city: "Sioux City", state: "IA" }, { city: "Iowa City", state: "IA" },
  { city: "Nampa", state: "ID" }, { city: "Meridian", state: "ID" },
  { city: "Idaho Falls", state: "ID" }, { city: "Pocatello", state: "ID" },
  { city: "Naperville", state: "IL" }, { city: "Rockford", state: "IL" },
  { city: "Joliet", state: "IL" }, { city: "Springfield", state: "IL" },
  { city: "Peoria", state: "IL" }, { city: "Elgin", state: "IL" },
  { city: "Champaign", state: "IL" }, { city: "Bloomington", state: "IL" },
  { city: "Evansville", state: "IN" }, { city: "South Bend", state: "IN" },
  { city: "Carmel", state: "IN" }, { city: "Fishers", state: "IN" },
  { city: "Overland Park", state: "KS" }, { city: "Olathe", state: "KS" },
  { city: "Topeka", state: "KS" }, { city: "Lawrence", state: "KS" },
  { city: "Bowling Green", state: "KY" }, { city: "Owensboro", state: "KY" },
  { city: "Shreveport", state: "LA" }, { city: "Lafayette", state: "LA" },
  { city: "Lake Charles", state: "LA" },
  { city: "Worcester", state: "MA" }, { city: "Cambridge", state: "MA" },
  { city: "Lowell", state: "MA" }, { city: "Springfield", state: "MA" },
  { city: "New Bedford", state: "MA" }, { city: "Brockton", state: "MA" },
  { city: "Frederick", state: "MD" }, { city: "Gaithersburg", state: "MD" },
  { city: "Rockville", state: "MD" }, { city: "Portland", state: "ME" },
  { city: "Ann Arbor", state: "MI" }, { city: "Lansing", state: "MI" },
  { city: "Flint", state: "MI" }, { city: "Kalamazoo", state: "MI" },
  { city: "Warren", state: "MI" }, { city: "Sterling Heights", state: "MI" },
  { city: "Dearborn", state: "MI" },
  { city: "Duluth", state: "MN" }, { city: "St. Paul", state: "MN" },
  { city: "Bloomington", state: "MN" }, { city: "Brooklyn Park", state: "MN" },
  { city: "Springfield", state: "MO" }, { city: "Independence", state: "MO" },
  { city: "Columbia", state: "MO" }, { city: "St. Charles", state: "MO" },
  { city: "Jackson", state: "MS" }, { city: "Gulfport", state: "MS" },
  { city: "Billings", state: "MT" }, { city: "Missoula", state: "MT" },
  { city: "Fayetteville", state: "NC" }, { city: "Wilmington", state: "NC" },
  { city: "High Point", state: "NC" }, { city: "Cary", state: "NC" },
  { city: "Asheville", state: "NC" }, { city: "Gastonia", state: "NC" },
  { city: "Fargo", state: "ND" }, { city: "Bismarck", state: "ND" },
  { city: "Grand Island", state: "NE" },
  { city: "Manchester", state: "NH" }, { city: "Nashua", state: "NH" },
  { city: "Elizabeth", state: "NJ" }, { city: "Paterson", state: "NJ" },
  { city: "Clifton", state: "NJ" }, { city: "Trenton", state: "NJ" },
  { city: "Las Cruces", state: "NM" }, { city: "Santa Fe", state: "NM" },
  { city: "Rio Rancho", state: "NM" },
  { city: "North Las Vegas", state: "NV" }, { city: "Sparks", state: "NV" },
  { city: "Carson City", state: "NV" },
  { city: "Albany", state: "NY" }, { city: "Syracuse", state: "NY" },
  { city: "Yonkers", state: "NY" }, { city: "New Rochelle", state: "NY" },
  { city: "Mount Vernon", state: "NY" }, { city: "Schenectady", state: "NY" },
  { city: "Utica", state: "NY" }, { city: "White Plains", state: "NY" },
  { city: "Canton", state: "OH" }, { city: "Youngstown", state: "OH" },
  { city: "Lorain", state: "OH" }, { city: "Parma", state: "OH" },
  { city: "Hamilton", state: "OH" }, { city: "Kettering", state: "OH" },
  { city: "Norman", state: "OK" }, { city: "Broken Arrow", state: "OK" },
  { city: "Lawton", state: "OK" }, { city: "Edmond", state: "OK" },
  { city: "Gresham", state: "OR" }, { city: "Hillsboro", state: "OR" },
  { city: "Beaverton", state: "OR" }, { city: "Bend", state: "OR" },
  { city: "Medford", state: "OR" }, { city: "Corvallis", state: "OR" },
  { city: "Allentown", state: "PA" }, { city: "Erie", state: "PA" },
  { city: "Reading", state: "PA" }, { city: "Scranton", state: "PA" },
  { city: "Bethlehem", state: "PA" }, { city: "Lancaster", state: "PA" },
  { city: "Providence", state: "RI" }, { city: "Warwick", state: "RI" },
  { city: "Cranston", state: "RI" }, { city: "Pawtucket", state: "RI" },
  { city: "Greenville", state: "SC" }, { city: "North Charleston", state: "SC" },
  { city: "Mount Pleasant", state: "SC" }, { city: "Rock Hill", state: "SC" },
  { city: "Sioux Falls", state: "SD" }, { city: "Rapid City", state: "SD" },
  { city: "Clarksville", state: "TN" }, { city: "Murfreesboro", state: "TN" },
  { city: "Franklin", state: "TN" }, { city: "Johnson City", state: "TN" },
  { city: "Abilene", state: "TX" }, { city: "Amarillo", state: "TX" },
  { city: "Beaumont", state: "TX" }, { city: "Brownsville", state: "TX" },
  { city: "Carrollton", state: "TX" }, { city: "Denton", state: "TX" },
  { city: "Frisco", state: "TX" }, { city: "Garland", state: "TX" },
  { city: "Grand Prairie", state: "TX" }, { city: "Irving", state: "TX" },
  { city: "Killeen", state: "TX" }, { city: "McAllen", state: "TX" },
  { city: "McKinney", state: "TX" }, { city: "Mesquite", state: "TX" },
  { city: "Midland", state: "TX" }, { city: "Odessa", state: "TX" },
  { city: "Pearland", state: "TX" }, { city: "Round Rock", state: "TX" },
  { city: "Sugar Land", state: "TX" }, { city: "Tyler", state: "TX" },
  { city: "Waco", state: "TX" }, { city: "Wichita Falls", state: "TX" },
  { city: "Longview", state: "TX" }, { city: "College Station", state: "TX" },
  { city: "Lewisville", state: "TX" }, { city: "Allen", state: "TX" },
  { city: "Provo", state: "UT" }, { city: "West Valley City", state: "UT" },
  { city: "Ogden", state: "UT" }, { city: "Orem", state: "UT" },
  { city: "Sandy", state: "UT" }, { city: "Layton", state: "UT" },
  { city: "St. George", state: "UT" },
  { city: "Chesapeake", state: "VA" }, { city: "Newport News", state: "VA" },
  { city: "Alexandria", state: "VA" }, { city: "Hampton", state: "VA" },
  { city: "Lynchburg", state: "VA" }, { city: "Roanoke", state: "VA" },
  { city: "Tacoma", state: "WA" }, { city: "Spokane Valley", state: "WA" },
  { city: "Kent", state: "WA" }, { city: "Everett", state: "WA" },
  { city: "Vancouver", state: "WA" }, { city: "Kennewick", state: "WA" },
  { city: "Yakima", state: "WA" }, { city: "Bellingham", state: "WA" },
  { city: "Appleton", state: "WI" }, { city: "Green Bay", state: "WI" },
  { city: "Kenosha", state: "WI" }, { city: "Racine", state: "WI" },
  { city: "Eau Claire", state: "WI" }, { city: "Oshkosh", state: "WI" },
  { city: "Charleston", state: "WV" }, { city: "Huntington", state: "WV" },
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
