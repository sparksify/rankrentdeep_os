import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidatesTable } from "@/components/candidates-table";
import { listDisagreements } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DisagreementsPage() {
  const candidates = await listDisagreements();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Model Disagreements</h1>
        <p className="text-sm text-muted-foreground">
          Candidates where rankability models disagree by &gt;15 points or demand sources conflict.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flagged candidates</CardTitle>
          <CardDescription>Review these manually before committing budget.</CardDescription>
        </CardHeader>
        <CardContent>
          <CandidatesTable candidates={candidates} />
        </CardContent>
      </Card>
    </div>
  );
}
