// ===========================================================================
// RankRentDeep OS — DataForSEO provider
// SERP scraping, keyword volume, Google Trends, and business data.
// Auth: Basic (login:password). Base URL: https://api.dataforseo.com/v3
// ===========================================================================

import type {
  Business,
  DemandObservation,
  PlaceCandidate,
  SeasonalityPoint,
  SerpResult,
  SerpResultType,
} from "@/core/types";
import { BaseProvider, ProviderHttp } from "./base";
import type { DomainMetrics, SeoProvider } from "./types";

const BASE_URL = "https://api.dataforseo.com/v3";
const DEFAULT_LOCATION_CODE = 2840; // United States
const DEFAULT_LANGUAGE = "en";

// Common US location codes to avoid a Locations API round-trip.
const LOCATION_HINTS: Record<string, number> = {
  "united states": 2840,
  "new york": 21167,
  "los angeles": 21137,
  chicago: 21138,
  houston: 21139,
  phoenix: 21140,
  austin: 21137,
  dallas: 21141,
  denver: 21142,
  seattle: 21143,
  miami: 21144,
  atlanta: 21145,
  boston: 21146,
  "san francisco": 21147,
  "san diego": 21148,
  portland: 21149,
  nashville: 21150,
  orlando: 21151,
  tampa: 21152,
  "las vegas": 21153,
};

const DIRECTORY_DOMAINS = [
  "yelp.com",
  "angi.com",
  "angieslist.com",
  "homeadvisor.com",
  "thumbtack.com",
  "houzz.com",
  "yellowpages.com",
  "bbb.org",
  "nextdoor.com",
  "facebook.com",
  "mapquest.com",
  "superpages.com",
];

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function classifyOrganic(url: string, keyword: string): SerpResultType {
  const host = hostname(url);
  if (DIRECTORY_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return "directory";
  }
  // Exact-match domain: the keyword slug appears as the domain's SLD.
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const sld = host.split(".")[0] ?? "";
  if (sld === slug || sld.includes(slug)) return "emd";
  return "lead_gen";
}

interface DfsTask<T> {
  tasks?: { result?: T[] }[];
}

export class DataForSeoProvider extends BaseProvider implements SeoProvider {
  readonly name = "dataforseo";
  private http: ProviderHttp;
  private locationCache = new Map<string, number>();

  constructor(login?: string, password?: string) {
    super();
    this.http = new ProviderHttp(BASE_URL, {
      basicAuth: { login: login ?? "", password: password ?? "" },
    });
  }

  isConfigured(): boolean {
    return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
  }

  private async resolveLocationCode(location?: string): Promise<number> {
    if (!location) return DEFAULT_LOCATION_CODE;
    const key = location.trim().toLowerCase();
    if (LOCATION_HINTS[key]) return LOCATION_HINTS[key];
    if (this.locationCache.has(key)) return this.locationCache.get(key)!;

    try {
      const res = await this.http.post<DfsTask<{ location_code: number; location_name: string }>>(
        "/locations",
        [{ name: location }],
      );
      const result = res.tasks?.[0]?.result?.[0];
      if (result?.location_code) {
        this.locationCache.set(key, result.location_code);
        return result.location_code;
      }
    } catch {
      // fall through to default
    }
    return DEFAULT_LOCATION_CODE;
  }

  async keywordVolume(keyword: string, location?: string): Promise<DemandObservation[]> {
    const locationCode = await this.resolveLocationCode(location);
    const res = await this.http.post<DfsTask<{
      keyword: string;
      search_volume: number;
      cpc: number;
      competition: number;
    }>>("/keywords_data/google/search_volume/live", [
      {
        keywords: [keyword],
        location_code: locationCode,
        language_code: DEFAULT_LANGUAGE,
      },
    ]);
    const result = res.tasks?.[0]?.result?.[0];
    if (!result) return [];
    return [
      {
        source: "dataforseo",
        keyword: result.keyword,
        volume: result.search_volume ?? 0,
        confidence: 90,
        device: "all",
        cpc: result.cpc ?? 0,
      },
    ];
  }

  async serpOverview(keyword: string, location?: string): Promise<SerpResult[]> {
    const locationCode = await this.resolveLocationCode(location);
    const res = await this.http.post<DfsTask<{
      items?: Array<{
        type: string;
        rank_group?: number;
        rank_absolute?: number;
        url?: string;
        title?: string;
        domain?: string;
      }>;
    }>>("/serp/google/organic/live/regular", [
      {
        keyword,
        location_code: locationCode,
        language_code: DEFAULT_LANGUAGE,
        depth: 20,
      },
    ]);

    const items = res.tasks?.[0]?.result?.[0]?.items ?? [];
    const results: SerpResult[] = [];
    let position = 0;

    for (const item of items) {
      if (!item.url) continue;
      position += 1;
      const type = mapDfsType(item.type, item.url, keyword);
      results.push({
        position,
        resultType: type,
        url: item.url,
        title: item.title ?? "",
        domainRating: 0, // enriched later via backlinks API
        backlinks: 0,
        referringDomains: 0,
        contentDepth: 0,
        onPageLocalSignals: 0,
        pageSpeed: 0,
      });
    }
    return results;
  }

  async domainRating(domain: string): Promise<DomainMetrics | null> {
    try {
      const res = await this.http.post<DfsTask<{
        domain_rank: number;
        backlinks: number;
        referring_domains: number;
      }>>("/backlinks/summary/live", [{ target: domain }]);
      const r = res.tasks?.[0]?.result?.[0];
      if (!r) return null;
      return {
        domainRating: r.domain_rank ?? 0,
        backlinks: r.backlinks ?? 0,
        referringDomains: r.referring_domains ?? 0,
      };
    } catch {
      return null;
    }
  }

  /** People Also Ask questions for a keyword (search-method enrichment). */
  async peopleAlsoAsk(keyword: string, location?: string): Promise<string[]> {
    const items = await this.rawSerpItems(keyword, location);
    const paa = items.find((i) => i.type === "people_also_ask");
    return (paa?.items ?? []).map((i) => i.title).filter(Boolean);
  }

  /** Related searches for a keyword (autocomplete-style enrichment). */
  async relatedSearches(keyword: string, location?: string): Promise<string[]> {
    const items = await this.rawSerpItems(keyword, location);
    const related = items.find((i) => i.type === "related_searches");
    return (related?.items ?? []).map((i) => i.title).filter(Boolean);
  }

  private async rawSerpItems(
    keyword: string,
    location?: string,
  ): Promise<Array<{ type: string; url?: string; title?: string; items?: Array<{ title: string }> }>> {
    const locationCode = await this.resolveLocationCode(location);
    const res = await this.http.post<DfsTask<{
      items?: Array<{ type: string; url?: string; title?: string; items?: Array<{ title: string }> }>;
    }>>("/serp/google/organic/live/regular", [
      {
        keyword,
        location_code: locationCode,
        language_code: DEFAULT_LANGUAGE,
        depth: 20,
      },
    ]);
    return res.tasks?.[0]?.result?.[0]?.items ?? [];
  }

  async trends(keyword: string, location?: string): Promise<SeasonalityPoint[]> {
    const locationCode = await this.resolveLocationCode(location);
    const now = new Date();
    const from = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const res = await this.http.post<DfsTask<{
      items?: Array<{
        data?: Array<{ date: string; values?: Array<{ value: number }> }>;
      }>;
    }>>("/keywords_data/google_trends/explore/live", [
      {
        keywords: [keyword],
        location_code: locationCode,
        date_from: from.toISOString().slice(0, 10),
        date_to: now.toISOString().slice(0, 10),
        type: "web",
      },
    ]);

    const data = res.tasks?.[0]?.result?.[0]?.items?.[0]?.data ?? [];
    return data.map((d) => ({
      month: d.date.slice(0, 7),
      value: d.values?.[0]?.value ?? 0,
    }));
  }

  async placeAutocomplete(query: string): Promise<PlaceCandidate[]> {
    void query;
    // DataForSEO does not provide place autocomplete; use Google Places.
    return [];
  }

  async placeDetails(placeId: string): Promise<PlaceCandidate | null> {
    void placeId;
    return null;
  }

  async businessSearch(location: string, keyword: string): Promise<Business[]> {
    const locationCode = await this.resolveLocationCode(location);
    const res = await this.http.post<DfsTask<{
      items?: Array<{
        title: string;
        rating?: { value: number; votes_count: number };
        address?: string;
        phone?: string;
        url?: string;
        place_id?: string;
      }>;
    }>>("/business_data/google/my_business_info/live", [
      {
        keyword: `${keyword} ${location}`,
        location_code: locationCode,
        language_code: DEFAULT_LANGUAGE,
      },
    ]);

    const items = res.tasks?.[0]?.result?.[0]?.items ?? [];
    return items.map((b) => ({
      name: b.title ?? "",
      address: b.address,
      phone: b.phone,
      website: b.url,
      rating: b.rating?.value,
      reviewCount: b.rating?.votes_count ?? 0,
      googlePlaceId: b.place_id,
      adsDetected: false,
      callTrackingDetected: false,
      websiteQuality: b.url ? "basic" : "none",
      source: "dataforseo",
    }));
  }
}

function mapDfsType(type: string, url: string, keyword: string): SerpResultType {
  switch (type) {
    case "paid":
      return "ads";
    case "local_pack":
      return "local_pack";
    case "images":
      return "image";
    case "video":
      return "video";
    case "people_also_ask":
      return "paa";
    case "organic":
    default:
      return classifyOrganic(url, keyword);
  }
}
