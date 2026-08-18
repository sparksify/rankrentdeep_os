import { Badge } from "@/components/ui/badge";
import { classificationLabel, classificationVariant } from "@/lib/labels";

export function ClassificationBadge({ classification }: { classification: string | null | undefined }) {
  return (
    <Badge variant={classificationVariant(classification)}>
      {classificationLabel(classification)}
    </Badge>
  );
}
