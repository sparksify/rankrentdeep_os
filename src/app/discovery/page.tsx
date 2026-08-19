import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidatesTable } from "@/components/candidates-table";
import { DiscoveryScanner } from "@/components/discovery-scanner";
import { DiscoveryActivity } from "@/components/discovery-activity";
import { listCandidates, type CandidateWithScore } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const candidates = await listCandidates();
  const scored = candidates.filter((c) => c.scores?.[0]?.final_score != null);

  const counts = {
    scored: scored.length,
    bets: scored.filter((c) => c.scores?.[0]?.classification === "core_revenue_bet").length,
    probes: scored.filter((c) => c.scores?.[0]?.classification === "validation_probe").length,
    rejected: scored.filter((c) => c.scores?.[0]?.classification === "reject").length,
  };

  const leaderboard: CandidateWithScore[] = scored
    .filter((c) => c.scores?.[0]?.classification !== "reject")
    .sort(
      (a, b) =>
        Number(b.scores?.[0]?.final_score ?? 0) - Number(a.scores?.[0]?.final_score ?? 0),
    )
    .slice(0, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discovery</h1>
        <p className="text-sm text-muted-foreground">
          The engine finds and ranks opportunities for you — no manual niche or city picking.
        </p>
      </div>

      <DiscoveryScanner />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Scanned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{candidates.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Scored</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{counts.scored}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue bets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-emerald-400">{counts.bets}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Probes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-sky-400">{counts.probes}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top opportunities</CardTitle>
              <CardDescription>
                Ranked by final score, rejecting nothing. Open any domain for the full
                scorecard, SERP breakdown, renters, and AI committee verdict.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CandidatesTable candidates={leaderboard} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Live activity</CardTitle>
              <CardDescription>Updates in real time as the worker runs.</CardDescription>
            </CardHeader>
            <CardContent>
              <DiscoveryActivity />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
