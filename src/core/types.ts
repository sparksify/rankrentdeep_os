// ===========================================================================
// RankRentDeep OS — core types
// Pure, framework-free contracts shared by the modules and scoring engine.
// ===========================================================================

// --- Module A: Geographic Entity Resolution --------------------------------

export type PlaceType = "city" | "neighborhood" | "county" | "metro" | "zip";

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PlaceCandidate {
  name: string;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  county?: string;
  metro?: string;
  state?: string;
  timezone?: string;
  population?: number;
  boundingBox?: BoundingBox;
  type: PlaceType;
  /** Relative search volume (0..1) used to disambiguate name collisions. */
  relativeVolume?: number;
  /** Estimated homes/residents for neighborhoods/communities. */
  estimatedHomes?: number;
}

export interface EntityResolutionResult {
  canonical: PlaceCandidate | null;
  alternatives: PlaceCandidate[];
  /** 0..100 — higher means more ambiguous. */
  ambiguityScore: number;
  /** 0..100 — confidence in the canonical resolution. */
  confidence: number;
  /** True when confidence < 70% — hard reject. */
  hardReject: boolean;
  /** True when the location string collides with other same-named places. */
  collisionDetected: boolean;
  collisionNote?: string;
}

// --- Module B: Demand Extraction -------------------------------------------

export type Device = "desktop" | "mobile" | "all";

export interface DemandObservation {
  source: string;
  keyword: string;
  volume: number;
  confidence: number; // 0..100
  device?: Device;
  month?: string; // 'YYYY-MM'
  cpc?: number; // USD
}

export interface SeasonalityPoint {
  month: string; // 'YYYY-MM'
  value: number; // 0..100 relative interest
}

export interface Seasonality {
  peak: string;
  trough: string;
  curve: SeasonalityPoint[];
  /** 0..100 — how severe the seasonal swing is. */
  severity: number;
}

export type DemandRecommendation = "proceed" | "caution" | "reject";

export interface DemandResult {
  /** Raw observations used to compute the estimate. */
  observations: DemandObservation[];
  estimateLow: number;
  estimateHigh: number;
  estimate: number;
  confidenceInterval: [number, number];
  /** 0..100 — agreement across data sources. */
  sourceAgreement: number;
  sourceConflict: boolean;
  seasonality: Seasonality;
  /** 0..100 — probability the query has local intent. */
  localIntentProbability: number;
  /** 0..100 — commercial intent score. */
  commercialIntentScore: number;
  /** 0..100 — normalized demand score. */
  demandScore: number;
  recommendation: DemandRecommendation;
  /** Autocomplete-style related searches. */
  relatedSearches: string[];
  /** People Also Ask questions. */
  peopleAlsoAsk: string[];
}

// --- Module C: SERP Rankability --------------------------------------------

export type SerpResultType =
  | "ads"
  | "local_pack"
  | "directory"
  | "lead_gen"
  | "brand"
  | "emd"
  | "partial"
  | "video"
  | "image"
  | "paa"
  | "organic";

export interface SerpResult {
  position: number;
  resultType: SerpResultType;
  url: string;
  title: string;
  domainRating: number; // 0..100
  backlinks: number;
  referringDomains: number;
  contentDepth: number; // word count
  lastUpdated?: string;
  /** 0..100 — NAP, schema, embedded map, local signals. */
  onPageLocalSignals: number;
  /** 0..100 — page speed / mobile usability. */
  pageSpeed: number;
}

export type ModelAgreement = "agree" | "disagree" | "high_uncertainty";

export interface RankabilityResult {
  modelAScore: number; // 0..100
  modelBScore: number; // 0..100
  rankabilityScore: number; // 0..100 combined
  confidenceInterval: [number, number];
  modelAgreement: ModelAgreement;
  /** Estimated months to reach top 3. */
  timeToRankTop3Months: number;
  /** Estimated number of referring domains required. */
  linkBudget: number;
  topResults: SerpResult[];
  contentGaps: string[];
  /** 0..100 — how much the top-10 SERP churns between snapshots (higher = easier). */
  volatility: number;
  /** Number of SERP snapshots used to compute volatility. */
  snapshotCount: number;
}

// --- Module D: Rentability --------------------------------------------------

export type WebsiteQuality = "none" | "basic" | "good" | "excellent";

export interface Business {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  adsDetected: boolean;
  callTrackingDetected: boolean;
  websiteQuality: WebsiteQuality;
  marketingBudgetEstimate?: number;
  source: string;
}

export interface RentabilityResult {
  rentabilityScore: number; // 0..100
  potentialRenters: number;
  leadValue: number; // USD
  rentalFloor: number; // USD / month
  rentalCeiling: number; // USD / month
  businesses: Business[];
  aggregatorDominance: boolean;
  flags: string[];
}

// --- Module E: Scoring Engine ----------------------------------------------

export type Classification =
  | "core_revenue_bet"
  | "validation_probe"
  | "learning_asset"
  | "reject";

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface BatchAllocation {
  revenueBets: number;
  probes: number;
  learningAssets: number;
}

export interface Scorecard {
  demandScore: number;
  rankabilityScore: number;
  rentabilityScore: number;
  entityScore: number;
  finalScore: number;
  classification: Classification;
  modelAgreement: ModelAgreement;
  flags: string[];
  checklist: ChecklistItem[];
  batchAllocation: BatchAllocation;
}

// --- Weights ----------------------------------------------------------------

export interface ScoringWeights {
  demand: number;
  rankability: number;
  rentability: number;
  entity: number;
}

export interface ScoringThresholds {
  /** Minimum demand (searches/month) to proceed. */
  minDemand: number;
  /** Minimum entity confidence (%) to proceed. */
  minEntityConfidence: number;
  /** Minimum potential renters. */
  minRenters: number;
  /** Minimum lead value (USD). */
  minLeadValue: number;
  /** Model disagreement threshold (points). */
  modelDisagreementPoints: number;
  /** Source conflict threshold (%). */
  sourceConflictPercent: number;
  /** Core revenue bet minimum score. */
  coreBetMin: number;
  /** Reject maximum score. */
  rejectMax: number;
}
