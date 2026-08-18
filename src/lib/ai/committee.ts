// ===========================================================================
// RankRentDeep OS — AI committee
// Multiple models review a candidate/portfolio before a monetary test. Each
// model adopts a distinct role and returns a structured perspective. The
// committee NEVER computes scores — it receives deterministic scores as inputs
// and only offers qualitative judgment + a go/no-go stance.
// ===========================================================================

import { chatCompletion } from "./openrouter";

export type Stance = "approve" | "hold" | "reject";

export interface CommitteeMember {
  model: string;
  role: string;
  focus: string;
}

export interface ModelResult {
  model: string;
  role: string;
  stance: Stance;
  confidence: number; // 0..100
  thesis: string;
  risks: string[];
  opportunities: string[];
  maxBudget: number | null; // USD, monetary-test cap the member would allow
  error?: string;
}

export type CommitteeAggregate = {
  votes: Record<Stance, number>;
  consensus: Stance;
  averageConfidence: number;
  recommendation: string;
  keyThemes: string[];
};

export interface CommitteeReport {
  modelResults: ModelResult[];
  aggregate: CommitteeAggregate;
}

const DEFAULT_COMMITTEE: CommitteeMember[] = [
  {
    model: "deepseek/deepseek-chat",
    role: "Conservative Underwriter",
    focus: "downside risk, capital preservation, and red flags that could sink the investment",
  },
  {
    model: "openai/gpt-4o-mini",
    role: "SEO Technician",
    focus: "rankability realism — SERP competitiveness, domain/link gap, and realistic time-to-rank",
  },
  {
    model: "anthropic/claude-3.5-haiku",
    role: "Local Market Economist",
    focus: "demand integrity, seasonality, and local competition dynamics",
  },
  {
    model: "google/gemini-flash-1.5",
    role: "Monetization Strategist",
    focus: "rentability — lead value, rental pricing, and the pool of real renters",
  },
  {
    model: "meta-llama/llama-3.1-70b-instruct",
    role: "Red Team Skeptic",
    focus: "attack the thesis — find what breaks, what was missed, and the worst-case scenario",
  },
];

function resolveCommittee(): CommitteeMember[] {
  const override = process.env.COMMITTEE_MODELS;
  if (!override) return DEFAULT_COMMITTEE;
  const models = override.split(",").map((m) => m.trim()).filter(Boolean);
  return models.map((model, i) => ({
    model,
    role: DEFAULT_COMMITTEE[i % DEFAULT_COMMITTEE.length].role,
    focus: DEFAULT_COMMITTEE[i % DEFAULT_COMMITTEE.length].focus,
  }));
}

// ---------------------------------------------------------------------------
// Brief construction — compact, deterministic summary of the research.
// ---------------------------------------------------------------------------

export interface SerpBrief {
  position: number;
  type: string;
  domainRating: number;
}

export interface CommitteeBrief {
  domain: string;
  keyword: string;
  location: string;
  finalScore: number;
  classification: string;
  demandScore: number;
  rankabilityScore: number;
  rentabilityScore: number;
  entityConfidence: number;
  demandEstimate: number;
  sourceAgreement: number;
  seasonalitySeverity: number;
  modelAgreement: string;
  timeToRank: number;
  linkBudget: number;
  potentialRenters: number;
  leadValue: number;
  rentalFloor: number;
  rentalCeiling: number;
  aggregatorDominance: boolean;
  serp: SerpBrief[];
  flags: string[];
  contentGaps: string[];
  relatedSearches: string[];
  peopleAlsoAsk: string[];
  checklist: { label: string; passed: boolean }[];
  /** Optional additional context (e.g. a full portfolio summary). */
  extraContext?: string;
}

function briefToText(b: CommitteeBrief): string {
  const serp = b.serp
    .slice(0, 10)
    .map((s) => `  #${s.position} [${s.type}] DR ${s.domainRating}`)
    .join("\n");
  const lines = [
    b.extraContext ?? "",
    `Domain: ${b.domain}`,
    `Keyword: ${b.keyword} in ${b.location}`,
    `Final score: ${b.finalScore}/100 (${b.classification})`,
    `Sub-scores — demand ${b.demandScore}, rankability ${b.rankabilityScore}, rentability ${b.rentabilityScore}, entity confidence ${b.entityConfidence}%`,
    `Demand estimate: ${b.demandEstimate}/mo (source agreement ${b.sourceAgreement}%, seasonality severity ${b.seasonalitySeverity}%)`,
    `Rankability: models ${b.modelAgreement}, time-to-rank ${b.timeToRank}mo, link budget ${b.linkBudget} ref. domains`,
    `Rentability: ${b.potentialRenters} renters, lead value $${b.leadValue}, rental $${b.rentalFloor}–$${b.rentalCeiling}/mo, aggregator dominance ${b.aggregatorDominance}`,
    `Flags: ${b.flags.length ? b.flags.join("; ") : "none"}`,
    `Content gaps: ${b.contentGaps.join("; ") || "none"}`,
    `Related searches: ${b.relatedSearches.slice(0, 8).join(", ") || "n/a"}`,
    `People Also Ask: ${b.peopleAlsoAsk.slice(0, 8).join(" | ") || "n/a"}`,
    `Top SERP:\n${serp}`,
    `Checklist: ${b.checklist.map((c) => `${c.label}=${c.passed ? "pass" : "fail"}`).join("; ")}`,
  ];
  return lines.filter(Boolean).join("\n");
}

const SYSTEM_TEMPLATE = (m: CommitteeMember) => `
You are a member of a rank-and-rent investment committee. Your role is the
"${m.role}". You focus on ${m.focus}.

You are reviewing a candidate lead-generation domain before the owner commits
real money to a "monetary test" (building the site and buying links). You have
already been given deterministic research scores — do NOT recalculate them and
do NOT invent facts (search volumes, backlink counts, revenues). Base your
perspective ONLY on the data provided.

Give your independent, role-specific judgment. Be concrete and skeptical.
Respond with ONLY valid JSON (no markdown fences), with exactly this shape:

{
  "stance": "approve" | "hold" | "reject",
  "confidence": 0-100,
  "thesis": "2-3 sentence role-specific assessment",
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1"],
  "maxBudget": <integer USD cap you would allow for this monetary test, or null if reject>
}
`;

function parseJson<T>(content: string): T | null {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

async function runMember(
  member: CommitteeMember,
  briefText: string,
): Promise<ModelResult> {
  try {
    const content = await chatCompletion(member.model, [
      { role: "system", content: SYSTEM_TEMPLATE(member) },
      { role: "user", content: briefText },
    ]);
    const parsed = parseJson<{
      stance?: string;
      confidence?: number;
      thesis?: string;
      risks?: string[];
      opportunities?: string[];
      maxBudget?: number | null;
    }>(content);

    const stance: Stance = parsed?.stance === "approve" || parsed?.stance === "hold"
      ? parsed.stance
      : parsed?.stance === "reject"
        ? "reject"
        : "hold";

    return {
      model: member.model,
      role: member.role,
      stance,
      confidence: Math.min(100, Math.max(0, Math.round(parsed?.confidence ?? 50))),
      thesis: parsed?.thesis ?? content.slice(0, 400),
      risks: Array.isArray(parsed?.risks) ? parsed.risks.slice(0, 6) : [],
      opportunities: Array.isArray(parsed?.opportunities) ? parsed.opportunities.slice(0, 6) : [],
      maxBudget: typeof parsed?.maxBudget === "number" ? parsed.maxBudget : null,
    };
  } catch (err) {
    return {
      model: member.model,
      role: member.role,
      stance: "hold",
      confidence: 0,
      thesis: "",
      risks: [],
      opportunities: [],
      maxBudget: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function aggregateResults(results: ModelResult[]): CommitteeAggregate {
  const votes: Record<Stance, number> = { approve: 0, hold: 0, reject: 0 };
  for (const r of results) {
    if (!r.error) votes[r.stance]++;
  }

  const total = votes.approve + votes.hold + votes.reject;
  // A strict majority is required; ties and pluralities resolve to "hold"
  // (treat as a validation probe, not a committed bet).
  const consensus: Stance =
    total > 0 && votes.approve > total / 2
      ? "approve"
      : total > 0 && votes.reject > total / 2
        ? "reject"
        : "hold";

  const valid = results.filter((r) => !r.error);
  const averageConfidence = valid.length
    ? Math.round(valid.reduce((s, r) => s + r.confidence, 0) / valid.length)
    : 0;

  const themes = new Map<string, number>();
  for (const r of valid) {
    for (const risk of r.risks.slice(0, 3)) {
      const k = risk.toLowerCase();
      themes.set(k, (themes.get(k) ?? 0) + 1);
    }
  }
  const keyThemes = [...themes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const recommendation =
    consensus === "approve"
      ? "Committee leans approve — proceed with the monetary test within the agreed budget."
      : consensus === "reject"
        ? "Committee leans reject — do not commit capital; revisit the weakest module first."
        : "Committee is split — treat as a validation probe, not a core revenue bet.";

  return { votes, consensus, averageConfidence, recommendation, keyThemes };
}

export async function runCommittee(brief: CommitteeBrief): Promise<CommitteeReport> {
  const members = resolveCommittee();
  const text = briefToText(brief);
  const results = await Promise.all(members.map((m) => runMember(m, text)));
  return { modelResults: results, aggregate: aggregateResults(results) };
}

export function isCommitteeConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}
