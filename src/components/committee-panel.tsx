"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CommitteeReportRow } from "@/lib/supabase/types";
import type { ModelResult, CommitteeAggregate, Stance } from "@/lib/ai/committee";

const STANCE_VARIANT: Record<Stance, "success" | "warning" | "destructive"> = {
  approve: "success",
  hold: "warning",
  reject: "destructive",
};

const STANCE_LABEL: Record<Stance, string> = {
  approve: "Approve",
  hold: "Hold",
  reject: "Reject",
};

export function CommitteePanel({
  scope,
  candidateId,
  initialReports,
}: {
  scope: "candidate" | "portfolio";
  candidateId?: string;
  initialReports: CommitteeReportRow[];
}) {
  const [reports, setReports] = useState<CommitteeReportRow[]>(initialReports);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const latest = reports[0];
  const results = (latest?.model_results ?? []) as ModelResult[];
  const aggregate = latest?.aggregate as CommitteeAggregate | null;

  async function run() {
    setRunning(true);
    setError("");
    try {
      const res = await fetch("/api/committee", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          scope === "candidate" ? { candidateId } : { portfolio: true },
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Committee run failed");
      } else {
        setReports([json as CommitteeReportRow, ...reports]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {scope === "candidate"
            ? "Multiple models review this site independently before you commit capital."
            : "Multiple models review the whole portfolio and its batch allocation."}
        </div>
        <Button onClick={run} disabled={running}>
          {running ? "Convening committee…" : "Run committee"}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {aggregate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consensus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STANCE_VARIANT[aggregate.consensus]}>
                {STANCE_LABEL[aggregate.consensus]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Approve {aggregate.votes.approve} · Hold {aggregate.votes.hold} · Reject {aggregate.votes.reject}
                {" · "}avg confidence {aggregate.averageConfidence}%
              </span>
            </div>
            <p className="text-sm">{aggregate.recommendation}</p>
            {aggregate.keyThemes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {aggregate.keyThemes.map((t) => (
                  <Badge key={t} variant="outline" className="max-w-[240px] truncate">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {results.map((r, i) => (
            <Card key={`${r.model}-${i}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{r.role}</CardTitle>
                  <Badge variant={STANCE_VARIANT[r.stance]}>{STANCE_LABEL[r.stance]}</Badge>
                </div>
                <CardDescription className="truncate">{r.model}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Progress value={r.confidence} className="flex-1" />
                  <span className="text-xs text-muted-foreground">{r.confidence}%</span>
                </div>
                {r.error ? (
                  <p className="text-xs text-rose-400">Failed: {r.error}</p>
                ) : (
                  <>
                    <p className="text-sm">{r.thesis}</p>
                    {r.risks.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-rose-400">Risks</div>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground">
                          {r.risks.map((risk) => (
                            <li key={risk}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.opportunities.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-emerald-400">Opportunities</div>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground">
                          {r.opportunities.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.maxBudget != null && (
                      <div className="text-xs text-muted-foreground">
                        Max budget: ${r.maxBudget.toLocaleString()}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!latest && !running && (
        <p className="text-sm text-muted-foreground">
          No committee review yet. Run the committee to get multiple model perspectives.
        </p>
      )}
    </div>
  );
}
