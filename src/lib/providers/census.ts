// ===========================================================================
// RankRentDeep OS — US Census ACS provider
// Population + median household income for geographic entity resolution and
// market validation. Key-gated (CENSUS_API_KEY). Non-blocking: failures return
// empty results.
// ===========================================================================

const ACS_URL = "https://api.census.gov/data/2022/acs/acs5";

// State abbreviation → FIPS code (used to scope place queries).
const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10",
  DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19",
  KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27",
  MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35",
  NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44",
  SC: "45", SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53",
  WV: "54", WI: "55", WY: "56",
};

export interface CensusPlace {
  name: string;
  state: string;
  population: number;
  medianIncome: number | null;
}

export async function censusLookupPlace(name: string, state?: string): Promise<CensusPlace | null> {
  const key = process.env.CENSUS_API_KEY;
  if (!key) return null;

  const fips = state ? STATE_FIPS[state.toUpperCase()] : undefined;
  const url = new URL(ACS_URL);
  url.searchParams.set("get", "NAME,B01001_001E,B19013_001E");
  url.searchParams.set("key", key);
  if (fips) {
    url.searchParams.set("for", "place:*");
    url.searchParams.set("in", `state:${fips}`);
  } else {
    // Nationwide place search (large payload; best-effort).
    url.searchParams.set("for", "place:*");
    url.searchParams.set("in", "state:*");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) return null;
    const rows = (await res.json()) as string[][];
    const header = rows[0];
    const nameIdx = header.indexOf("NAME");
    const popIdx = header.indexOf("B01001_001E");
    const incIdx = header.indexOf("B19013_001E");
    if (nameIdx < 0) return null;

    const needle = name.trim().toLowerCase();
    let best: CensusPlace | null = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const placeName = row[nameIdx] ?? "";
      if (!placeName.toLowerCase().includes(needle)) continue;
      const population = Number(row[popIdx] ?? 0);
      if (!best || population > best.population) {
        best = {
          name: placeName,
          state: row[header.indexOf("state")] ?? "",
          population,
          medianIncome: Number(row[incIdx]) || null,
        };
      }
    }
    return best;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
