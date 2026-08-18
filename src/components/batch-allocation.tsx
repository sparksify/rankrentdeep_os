import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CandidateWithScore } from "@/lib/queries";

export function BatchAllocationSummary({ candidates }: { candidates: CandidateWithScore[] }) {
  const counts = {
    core_revenue_bet: 0,
    validation_probe: 0,
    learning_asset: 0,
    reject: 0,
    pending: 0,
  };

  for (const c of candidates) {
    const cls = c.scores?.[0]?.classification;
    if (!cls) counts.pending++;
    else if (cls in counts) counts[cls as keyof typeof counts]++;
  }

  const items = [
    { label: "Core Revenue Bets", value: counts.core_revenue_bet, color: "text-emerald-400" },
    { label: "Validation Probes", value: counts.validation_probe, color: "text-sky-400" },
    { label: "Learning Assets", value: counts.learning_asset, color: "text-amber-400" },
    { label: "Rejected", value: counts.reject, color: "text-rose-400" },
    { label: "Pending", value: counts.pending, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-semibold ${item.color}`}>{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
