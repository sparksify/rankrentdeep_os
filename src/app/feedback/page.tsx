import { FeedbackCharts } from "@/components/feedback-charts";
import { listFeedbackSeries } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const series = await listFeedbackSeries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback Loop</h1>
        <p className="text-sm text-muted-foreground">
          Actual rankings, traffic, and calls over time for built domains.
        </p>
      </div>
      <FeedbackCharts series={series} />
    </div>
  );
}
