import { RentersExplorer } from "@/components/renters-explorer";
import { listRenterMarkets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RentersPage() {
  const markets = await listRenterMarkets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rentability Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Map of target markets and the local businesses that could rent a lead-gen site.
        </p>
      </div>
      <RentersExplorer markets={markets} />
    </div>
  );
}
