import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommitteePanel } from "@/components/committee-panel";
import { listCommitteeReports } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CommitteePage() {
  const reports = await listCommitteeReports("portfolio");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Committee</h1>
        <p className="text-sm text-muted-foreground">
          Multiple models review the full portfolio and its batch allocation before any
          monetary test.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio committee</CardTitle>
          <CardDescription>
            Each model (underwriter, SEO technician, market economist, monetization
            strategist, red-team skeptic) gives an independent verdict.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommitteePanel scope="portfolio" initialReports={reports} />
        </CardContent>
      </Card>
    </div>
  );
}
