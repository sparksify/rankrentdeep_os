import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScoreRow } from "@/lib/supabase/types";

interface ChecklistItem {
  label?: string;
  passed: boolean;
  detail: string;
}

export function Checklist({ score }: { score: ScoreRow }) {
  const checklist = (score.checklist ?? {}) as Record<string, ChecklistItem>;
  const entries = Object.entries(checklist);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No checklist available.</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map(([key, item]) => (
        <li key={key} className="flex items-start gap-2 text-sm">
          <span
            className={cn(
              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
              item.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400",
            )}
          >
            {item.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </span>
          <span>
            <span className="font-medium">{item.label ?? key}</span>
            <span className="text-muted-foreground"> — {item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
