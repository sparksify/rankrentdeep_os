import { Pipeline } from "@/components/pipeline";

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Research Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Add domains/keywords, run the full research process, and watch status live.
        </p>
      </div>
      <Pipeline />
    </div>
  );
}
