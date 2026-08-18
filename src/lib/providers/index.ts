// ===========================================================================
// RankRentDeep OS — unified SEO client
// Detects which providers are configured and routes each capability to the
// best available provider, merging results where it improves confidence.
// ===========================================================================

import type {
  Business,
  DemandObservation,
  PlaceCandidate,
  SeasonalityPoint,
  SerpResult,
} from "@/core/types";
import type { DomainMetrics, SeoProvider } from "./types";
import { Cache, MemoryCache } from "@/lib/cache";
import { DataForSeoProvider } from "./dataforseo";
import { AhrefsProvider } from "./ahrefs";
import { SemrushProvider } from "./semrush";
import { GooglePlacesProvider } from "./google-places";
import { GoogleTrendsProvider } from "./google-trends";
import { YelpProvider } from "./yelp";
import { nominatimGeocode } from "./nominatim";

export interface UnifiedSeoClient {
  keywordVolume(keyword: string, location?: string): Promise<DemandObservation[]>;
  serpOverview(keyword: string, location?: string): Promise<SerpResult[]>;
  domainRating(domain: string): Promise<DomainMetrics | null>;
  trends(keyword: string, location?: string): Promise<SeasonalityPoint[]>;
  placeAutocomplete(query: string): Promise<PlaceCandidate[]>;
  placeDetails(placeId: string): Promise<PlaceCandidate | null>;
  businessSearch(location: string, keyword: string): Promise<Business[]>;
  /** People Also Ask questions (DataForSEO SERP). */
  peopleAlsoAsk(keyword: string, location?: string): Promise<string[]>;
  /** Related/autocomplete-style searches (DataForSEO SERP). */
  relatedSearches(keyword: string, location?: string): Promise<string[]>;
  /** Free OpenStreetMap/Nominatim geocoding (fallback when no Places key). */
  geocode(query: string): Promise<PlaceCandidate[]>;
  configuredProviders(): string[];
}

interface ClientOptions {
  cache?: Cache;
  providers?: SeoProvider[];
}

const TTL = {
  volume: 60 * 60 * 24 * 7, // 7 days
  serp: 60 * 60 * 24, // 1 day
  trends: 60 * 60 * 24 * 7, // 7 days
  places: 60 * 60 * 24 * 30, // 30 days
  business: 60 * 60 * 24 * 7, // 7 days
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80);
}

export function createProviders(): SeoProvider[] {
  return [
    new DataForSeoProvider(),
    new AhrefsProvider(),
    new SemrushProvider(),
    new GooglePlacesProvider(),
    new GoogleTrendsProvider(),
    new YelpProvider(),
  ];
}

export function createUnifiedClient(options: ClientOptions = {}): UnifiedSeoClient {
  const providers = (options.providers ?? createProviders()).filter((p) =>
    p.isConfigured(),
  );
  const cache = options.cache ?? new MemoryCache();

  const byName = (name: string) => providers.find((p) => p.name === name);

  async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const hit = await cache.get<T>(key);
    if (hit != null) return hit;
    const value = await fn();
    await cache.set(key, value, ttl);
    return value;
  }

  return {
    configuredProviders: () => providers.map((p) => p.name),

    async keywordVolume(keyword, location) {
      const capable = providers.filter(
        (p) => p.name !== "google_places" && p.name !== "google_trends" && p.name !== "yelp",
      );
      const results: DemandObservation[] = [];
      await Promise.all(
        capable.map(async (p) => {
          try {
            const obs = await cached(
              `volume:${p.name}:${slugify(keyword)}:${slugify(location ?? "us")}`,
              TTL.volume,
              () => p.keywordVolume(keyword, location),
            );
            results.push(...obs);
          } catch {
            // provider unavailable — skip
          }
        }),
      );
      return results;
    },

    async serpOverview(keyword, location) {
      const serp = byName("dataforseo") ?? byName("ahrefs");
      if (!serp) return [];
      try {
        return await cached(
          `serp:${slugify(keyword)}:${slugify(location ?? "us")}`,
          TTL.serp,
          () => serp.serpOverview(keyword, location),
        );
      } catch {
        return [];
      }
    },

    async domainRating(domain) {
      const backlinks = byName("dataforseo") ?? byName("ahrefs") ?? byName("semrush");
      if (!backlinks) return null;
      try {
        return await cached(
          `dr:${slugify(domain)}`,
          TTL.volume,
          () => backlinks.domainRating(domain),
        );
      } catch {
        return null;
      }
    },

    async trends(keyword, location) {
      const trends = byName("dataforseo") ?? byName("google_trends");
      if (!trends) return [];
      try {
        return await cached(
          `trends:${slugify(keyword)}:${slugify(location ?? "us")}`,
          TTL.trends,
          () => trends.trends(keyword, location),
        );
      } catch {
        return [];
      }
    },

    async placeAutocomplete(query) {
      const places = byName("google_places");
      if (places) {
        try {
          const results = await cached(`place_ac:${slugify(query)}`, TTL.places, () =>
            places.placeAutocomplete(query),
          );
          if (results.length > 0) return results;
        } catch {
          // fall through to Nominatim
        }
      }
      // Fallback: free OpenStreetMap geocoding.
      return cached(`nom:${slugify(query)}`, TTL.places, () => nominatimGeocode(query));
    },

    async placeDetails(placeId) {
      const places = byName("google_places");
      if (!places) return null;
      try {
        return await cached(`place_dt:${placeId}`, TTL.places, () =>
          places.placeDetails(placeId),
        );
      } catch {
        return null;
      }
    },

    async businessSearch(location, keyword) {
      const sources = ["google_places", "yelp", "dataforseo"]
        .map((name) => byName(name))
        .filter((p): p is SeoProvider => Boolean(p));
      const all: Business[] = [];
      await Promise.all(
        sources.map(async (p) => {
          try {
            const results = await cached(
              `business:${p.name}:${slugify(keyword)}:${slugify(location)}`,
              TTL.business,
              () => p.businessSearch(location, keyword),
            );
            all.push(...results);
          } catch {
            // skip source
          }
        }),
      );
      // De-duplicate by name+address.
      const seen = new Set<string>();
      return all.filter((b) => {
        const key = `${b.name.toLowerCase()}::${(b.address ?? "").toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    async peopleAlsoAsk(keyword, location) {
      const dfs = byName("dataforseo");
      if (!dfs) return [];
      try {
        return await cached(`paa:${slugify(keyword)}:${slugify(location ?? "us")}`, TTL.serp, () =>
          (dfs as DataForSeoProvider).peopleAlsoAsk(keyword, location),
        );
      } catch {
        return [];
      }
    },

    async relatedSearches(keyword, location) {
      const dfs = byName("dataforseo");
      if (!dfs) return [];
      try {
        return await cached(`rel:${slugify(keyword)}:${slugify(location ?? "us")}`, TTL.serp, () =>
          (dfs as DataForSeoProvider).relatedSearches(keyword, location),
        );
      } catch {
        return [];
      }
    },

    async geocode(query) {
      return cached(`nom:${slugify(query)}`, TTL.places, () => nominatimGeocode(query));
    },
  };
}
