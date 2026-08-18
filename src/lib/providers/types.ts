// ===========================================================================
// RankRentDeep OS — provider layer types
// Unified contracts across SEO data providers.
// ===========================================================================

import type {
  Business,
  DemandObservation,
  PlaceCandidate,
  SeasonalityPoint,
  SerpResult,
} from "@/core/types";

export interface DomainMetrics {
  domainRating: number;
  backlinks: number;
  referringDomains: number;
}

export interface KeywordVolumeResult {
  keyword: string;
  volume: number;
  cpc?: number;
  competition?: number;
}

/**
 * A single SEO data provider. Providers implement the subset of capabilities
 * they support and return empty results (or throw `UnsupportedError`) for the
 * rest. The unified client routes each query to the best available provider.
 */
export interface SeoProvider {
  readonly name: string;
  isConfigured(): boolean;

  keywordVolume(keyword: string, location?: string): Promise<DemandObservation[]>;
  serpOverview(keyword: string, location?: string): Promise<SerpResult[]>;
  domainRating(domain: string): Promise<DomainMetrics | null>;
  trends(keyword: string, location?: string): Promise<SeasonalityPoint[]>;
  placeAutocomplete(query: string): Promise<PlaceCandidate[]>;
  placeDetails(placeId: string): Promise<PlaceCandidate | null>;
  businessSearch(location: string, keyword: string): Promise<Business[]>;
}

export class UnsupportedError extends Error {
  constructor(provider: string, capability: string) {
    super(`${provider} does not support ${capability}`);
    this.name = "UnsupportedError";
  }
}
