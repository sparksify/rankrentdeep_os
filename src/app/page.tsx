import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CandidatesTable } from "@/components/candidates-table";
import { listCandidates } from "@/lib/queries";
import { BatchAllocationSummary } from "@/components/batch-allocation";

export const dynamic = "force-dynamic";

export default async function BatchOverviewPage() {
  const candidates = await listCandidates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Batch Overview</h1>
          <p className="text-sm text-muted-foreground">
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"} under research
          </p>
        </div>
        <Link href="/pipeline">
          <Button>Add candidates</Button>
        </Link>
      </div>

      <BatchAllocationSummary candidates={candidates} />

      <Card>
        <CardHeader>
          <CardTitle>All candidates</CardTitle>
          <CardDescription>
            Domain, keyword, location, final score, classification, and key flags.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CandidatesTable candidates={candidates} />
        </CardContent>
      </Card>
    </div>
  );
}
