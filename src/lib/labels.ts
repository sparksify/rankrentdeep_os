import type { Classification } from "@/core/types";

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  core_revenue_bet: "Core Revenue Bet",
  validation_probe: "Validation Probe",
  learning_asset: "Learning Asset",
  reject: "Reject",
};

export const CLASSIFICATION_VARIANT: Record<
  Classification,
  "success" | "info" | "warning" | "destructive"
> = {
  core_revenue_bet: "success",
  validation_probe: "info",
  learning_asset: "warning",
  reject: "destructive",
};

export const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  researching: "Researching",
  scored: "Scored",
  rejected: "Rejected",
  built: "Built",
  parked: "Parked",
};

export function classificationLabel(c: string | null | undefined): string {
  return CLASSIFICATION_LABEL[c as Classification] ?? (c ?? "—");
}

export function classificationVariant(
  c: string | null | undefined,
): "success" | "info" | "warning" | "destructive" | "secondary" {
  return CLASSIFICATION_VARIANT[c as Classification] ?? "secondary";
}

export function agreementLabel(a: string | null | undefined): string {
  switch (a) {
    case "agree":
      return "Agree";
    case "disagree":
      return "Disagree";
    case "high_uncertainty":
      return "High uncertainty";
    default:
      return "—";
  }
}
