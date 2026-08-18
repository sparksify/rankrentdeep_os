// ===========================================================================
// RankRentDeep OS — Ahrefs provider
// Keyword volume, SERP overview, domain rating, backlinks.
// Auth: Bearer token. Base URL: https://api.ahrefs.com/v3
// ===========================================================================

import type { DemandObservation, SeasonalityPoint, SerpResult } from "@/core/types";
import { BaseProvider, ProviderHttp } from "./base";
import type { DomainMetrics, SeoProvider } from "./types";

const BASE_URL = "https://api.ahrefs.com/v3";

interface AhrefsKeywordsResponse {
  keywords?: Array<{ keyword: string; volume: number; cpc?: number }>;
}

interface AhrefsDomainRatingResponse {
  domain?: { domain: string; domain_rating: number };
  metrics?: { backlinks: number; referring_domains: number };
}

export class AhrefsProvider extends BaseProvider implements SeoProvider {
  readonly name = "ahrefs";
  private http: ProviderHttp;

  constructor(token?: string) {
    super();
    this.http = new ProviderHttp(BASE_URL, {
      bearerToken: token ?? process.env.AHREFS_API_TOKEN ?? "",
    });
  }

  isConfigured(): boolean {
    return Boolean(process.env.AHREFS_API_TOKEN);
  }

  async keywordVolume(keyword: string, location?: string): Promise<DemandObservation[]> {
    void location;
    const res = await this.http.get<AhrefsKeywordsResponse>(
      "/keywords-explorer/keyword-data",
      { keyword, country: location ? "us" : "us" },
    );
    return (res.keywords ?? []).map((k) => ({
      source: "ahrefs",
      keyword: k.keyword,
      volume: k.volume,
      confidence: 85,
      device: "all",
    }));
  }

  async serpOverview(keyword: string, location?: string): Promise<SerpResult[]> {
    void location;
    const res = await this.http.get<{
      serp?: Array<{ url: string; title: string; position: number; domain_rating: number }>;
    }>("/keywords-explorer/serp-overview", { keyword, country: "us" });
    return (res.serp ?? []).map((r) => ({
      position: r.position,
      resultType: "organic",
      url: r.url,
      title: r.title,
      domainRating: r.domain_rating ?? 0,
      backlinks: 0,
      referringDomains: 0,
      contentDepth: 0,
      onPageLocalSignals: 0,
      pageSpeed: 0,
    }));
  }

  async domainRating(domain: string): Promise<DomainMetrics | null> {
    const res = await this.http.get<AhrefsDomainRatingResponse>(
      "/sites-explorer/domain-rating",
      { target: domain },
    );
    if (!res.domain) return null;
    return {
      domainRating: res.domain.domain_rating ?? 0,
      backlinks: res.metrics?.backlinks ?? 0,
      referringDomains: res.metrics?.referring_domains ?? 0,
    };
  }

  // Unsupported capabilities.
  async trends(): Promise<SeasonalityPoint[]> {
    return [];
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
