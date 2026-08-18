// ===========================================================================
// RankRentDeep OS — Google Trends provider
// Seasonal / interest-over-time data. Note: Google Trends has no stable
// official REST API; DataForSEO's Google Trends endpoint is preferred and is
// used automatically by the unified client when configured. This provider is
// retained for completeness and returns empty results by default.
// ===========================================================================

import type { SeasonalityPoint } from "@/core/types";
import { BaseProvider } from "./base";
import type { SeoProvider } from "./types";

export class GoogleTrendsProvider extends BaseProvider implements SeoProvider {
  readonly name = "google_trends";

  isConfigured(): boolean {
    // No stable keyed API; always considered unconfigured so the unified
    // client falls back to DataForSEO for trend data.
    return false;
  }

  async trends(keyword: string, location?: string): Promise<SeasonalityPoint[]> {
    void keyword;
    void location;
    return [];
  }

  async keywordVolume(): Promise<never> {
    return this.unsupported("keywordVolume");
  }
  async serpOverview(): Promise<never> {
    return this.unsupported("serpOverview");
  }
  async domainRating(): Promise<never> {
    return this.unsupported("domainRating");
  }
  async placeAutocomplete(): Promise<never> {
    return this.unsupported("placeAutocomplete");
  }
  async placeDetails(): Promise<never> {
    return this.unsupported("placeDetails");
  }
  async businessSearch(): Promise<never> {
    return this.unsupported("businessSearch");
  }
}
