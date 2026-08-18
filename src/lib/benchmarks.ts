// ===========================================================================
// RankRentDeep OS — industry benchmarks
// Average ticket sizes and close rates used to estimate lead value (Module D).
// Deterministic fallbacks; enriched by CPC data when available.
// ===========================================================================

interface ServiceBenchmark {
  ticketSize: number; // USD
  closeRate: number; // 0..1
}

const BENCHMARKS: Record<string, ServiceBenchmark> = {
  sprinkler: { ticketSize: 350, closeRate: 0.3 },
  plumbing: { ticketSize: 400, closeRate: 0.3 },
  plumber: { ticketSize: 400, closeRate: 0.3 },
  hvac: { ticketSize: 1200, closeRate: 0.25 },
  "air conditioning": { ticketSize: 1200, closeRate: 0.25 },
  roofing: { ticketSize: 800, closeRate: 0.2 },
  electrician: { ticketSize: 450, closeRate: 0.3 },
  "electrical": { ticketSize: 450, closeRate: 0.3 },
  landscaping: { ticketSize: 300, closeRate: 0.3 },
  "tree service": { ticketSize: 600, closeRate: 0.25 },
  "tree removal": { ticketSize: 600, closeRate: 0.25 },
  garage: { ticketSize: 700, closeRate: 0.25 },
  "pest control": { ticketSize: 300, closeRate: 0.35 },
  "pressure washing": { ticketSize: 250, closeRate: 0.3 },
  "window cleaning": { ticketSize: 250, closeRate: 0.3 },
  painting: { ticketSize: 900, closeRate: 0.2 },
  "fencing": { ticketSize: 1500, closeRate: 0.2 },
  concrete: { ticketSize: 1000, closeRate: 0.2 },
  "water damage": { ticketSize: 2000, closeRate: 0.3 },
  "mold remediation": { ticketSize: 1500, closeRate: 0.3 },
  locksmith: { ticketSize: 150, closeRate: 0.4 },
  "appliance repair": { ticketSize: 300, closeRate: 0.3 },
  "auto repair": { ticketSize: 500, closeRate: 0.25 },
  "towing": { ticketSize: 200, closeRate: 0.35 },
  "moving": { ticketSize: 1000, closeRate: 0.2 },
  "cleaning": { ticketSize: 200, closeRate: 0.3 },
  "junk removal": { ticketSize: 400, closeRate: 0.3 },
  "carpet cleaning": { ticketSize: 200, closeRate: 0.3 },
  "gutters": { ticketSize: 350, closeRate: 0.25 },
};

const DEFAULT_BENCHMARK: ServiceBenchmark = { ticketSize: 500, closeRate: 0.2 };

export function lookupBenchmark(keyword: string): ServiceBenchmark {
  const k = keyword.toLowerCase();
  for (const [service, bench] of Object.entries(BENCHMARKS)) {
    if (k.includes(service)) return bench;
  }
  return DEFAULT_BENCHMARK;
}

export const DEFAULT_CLOSE_RATE = 0.2;
