import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClassificationBadge } from "@/components/classification-badge";
import { agreementLabel } from "@/lib/labels";
import { formatScore } from "@/lib/utils";
import type { ScoreRow } from "@/lib/supabase/types";

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{formatScore(value)}</span>
      </div>
      <Progress value={value ?? 0} />
    </div>
  );
}

export function Scorecard({ score }: { score: ScoreRow }) {
  const rank = score.rankability_details as {
    modelAScore?: number;
    modelBScore?: number;
    confidenceInterval?: [number, number];
    timeToRankTop3Months?: number;
    linkBudget?: number;
  } | null;

  const rent = score.rentability_details as {
    leadValue?: number;
    rentalFloor?: number;
    rentalCeiling?: number;
    potentialRenters?: number;
  } | null;

  const entity = score.entity_details as {
    ambiguityScore?: number;
    confidence?: number;
    collisionDetected?: boolean;
  } | null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Final Score</CardTitle>
          <ClassificationBadge classification={score.classification} />
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-5xl font-bold">{formatScore(score.final_score)}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <div className="space-y-3">
            <ScoreBar label="Demand" value={score.demand_score} />
            <ScoreBar label="Rankability" value={score.rankability_score} />
            <ScoreBar label="Rentability" value={score.rentability_score} />
            <ScoreBar label="Entity confidence" value={score.entity_score} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model agreement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rankability models</span>
            <span className="font-medium">{agreementLabel(score.model_agreement)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model A / Model B</span>
            <span className="font-medium">
              {formatScore(rank?.modelAScore)} / {formatScore(rank?.modelBScore)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rankability CI</span>
            <span className="font-medium">
              {rank?.confidenceInterval
                ? `${formatScore(rank.confidenceInterval[0])}–${formatScore(rank.confidenceInterval[1])}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time to top 3</span>
            <span className="font-medium">{rank?.timeToRankTop3Months ?? "—"} months</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Link budget</span>
            <span className="font-medium">{rank?.linkBudget ?? "—"} ref. domains</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entity ambiguity</span>
            <span className="font-medium">{formatScore(entity?.ambiguityScore)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monetization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lead value</span>
            <span className="font-medium">${rent?.leadValue ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rental floor / ceiling</span>
            <span className="font-medium">
              ${rent?.rentalFloor ?? "—"} / ${rent?.rentalCeiling ?? "—"}/mo
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Potential renters</span>
            <span className="font-medium">{rent?.potentialRenters ?? "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
