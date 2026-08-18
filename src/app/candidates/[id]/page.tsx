import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Scorecard } from "@/components/scorecard";
import { Checklist } from "@/components/checklist";
import { SerpTable } from "@/components/serp-table";
import { BusinessList } from "@/components/business-list";
import { ClassificationBadge } from "@/components/classification-badge";
import { CommitteePanel } from "@/components/committee-panel";
import { STATUS_LABEL } from "@/lib/labels";
import { getCandidateDetail, listCommitteeReports } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCandidateDetail(id);
  if (!detail) notFound();

  const committeeReports = await listCommitteeReports("candidate", id);

  const { candidate, place, serp, businesses, score, feedback } = detail;
  const contentGaps = (score?.rankability_details as { contentGaps?: string[] } | null)
    ?.contentGaps ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{candidate.domain}</h1>
            <p className="text-sm text-muted-foreground">
              {candidate.keyword} · {candidate.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{STATUS_LABEL[candidate.status] ?? candidate.status}</Badge>
          {score && <ClassificationBadge classification={score.classification} />}
        </div>
      </div>

      {score ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Scorecard score={score} />

          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pre-flight checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <Checklist score={score} />
              </CardContent>
            </Card>

            {place && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Geographic entity</CardTitle>
                  <CardDescription>
                    {place.canonical_name} · {[place.county, place.state].filter(Boolean).join(", ")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confidence</span>
                    <span>{place.confidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ambiguity</span>
                    <span>{place.ambiguity_score}</span>
                  </div>
                  {place.hard_reject && (
                    <Badge variant="destructive">Hard reject — low confidence</Badge>
                  )}
                  {(place.alternative_names as { name: string; state?: string }[]).length > 0 && (
                    <div>
                      <div className="mb-1 text-muted-foreground">Alternatives</div>
                      <div className="flex flex-wrap gap-1">
                        {(place.alternative_names as { name: string; state?: string }[]).map((a, i) => (
                          <Badge key={i} variant="outline">
                            {a.name}
                            {a.state ? `, ${a.state}` : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content gaps</CardTitle>
              </CardHeader>
              <CardContent>
                {contentGaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No content gap analysis available.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {contentGaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Research not yet complete. Check the Research Pipeline for live status.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SERP results</CardTitle>
          <CardDescription>Top results classified by type with authority metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <SerpTable results={serp} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Potential renters</CardTitle>
          <CardDescription>Local businesses that could rent this lead-gen site.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessList businesses={businesses} />
        </CardContent>
      </Card>

      {feedback.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {feedback.map((f) => (
                <li key={f.id} className="flex justify-between">
                  <span>{f.date}</span>
                  <span className="text-muted-foreground">
                    calls {f.calls ?? 0} · forms {f.form_submissions ?? 0} · inquiries {f.rentals_inquired ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {score && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Committee review</CardTitle>
            <CardDescription>
              Independent perspectives from multiple models before the monetary test.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommitteePanel
              scope="candidate"
              candidateId={id}
              initialReports={committeeReports}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
