// ===========================================================================
// RankRentDeep OS — Semrush provider
// Keyword volume, domain analytics, traffic, CPC.
// Auth: API key query param. Base URL: https://api.semrush.com
// ===========================================================================

import type { DemandObservation, SeasonalityPoint, SerpResult } from "@/core/types";
import { BaseProvider, ProviderHttp } from "./base";
import type { DomainMetrics, SeoProvider } from "./types";

const BASE_URL = "https://api.semrush.com";

interface SemrushRowsResponse {
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export class SemrushProvider extends BaseProvider implements SeoProvider {
  readonly name = "semrush";
  private http: ProviderHttp;

  constructor(apiKey?: string) {
    super();
    this.http = new ProviderHttp(BASE_URL, {});
    this.apiKey = apiKey ?? process.env.SEMRUSH_API_KEY ?? "";
  }

  private apiKey: string;

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async keywordVolume(keyword: string, location?: string): Promise<DemandObservation[]> {
    void location;
    const res = await this.http.get<SemrushRowsResponse>("/", {
      type: "phrase_this",
      key: this.apiKey,
      phrase: keyword,
      database: "us",
      export_columns: "Ph,Nq,Cpc",
    });
    const volume = parseSemrushVolume(res);
    return volume == null
      ? []
      : [{ source: "semrush", keyword, volume, confidence: 85, device: "all" }];
  }

  async serpOverview(keyword: string, location?: string): Promise<SerpResult[]> {
    void keyword;
    void location;
    return [];
  }

  async domainRating(domain: string): Promise<DomainMetrics | null> {
    const res = await this.http.get<SemrushRowsResponse>("/", {
      type: "domain_ranks",
      key: this.apiKey,
      domain,
      export_columns: "Dt,Dn",
    });
    const dr = parseSemrushMetric(res, "Dt");
    const backlinks = parseSemrushMetric(res, "Dn");
    if (dr == null && backlinks == null) return null;
    return { domainRating: dr ?? 0, backlinks: backlinks ?? 0, referringDomains: 0 };
  }

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

function parseSemrushVolume(res: SemrushRowsResponse): number | null {
  const data = res as { Nq?: string };
  if (data.Nq == null) return null;
  const n = Number(data.Nq);
  return Number.isFinite(n) ? n : null;
}

function parseSemrushMetric(res: SemrushRowsResponse, key: string): number | null {
  const data = res as Record<string, string | undefined>;
  if (data[key] == null) return null;
  const n = Number(data[key]);
  return Number.isFinite(n) ? n : null;
}
