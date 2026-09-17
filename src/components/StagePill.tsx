import type { LifecycleStage } from "@/types/database";

// Coloring roughly follows Prospect Wire's semantic pattern: cold/neutral
// early, amber mid-sequence, teal for positive momentum, green for won.
function toneFor(stage: LifecycleStage | null | undefined): string {
  if (!stage) return "bg-surface-2 text-text-faint";
  if (stage.key === "closed_won") return "bg-accent-soft text-accent-dark";
  if (stage.is_closed || ["not_interested", "disqualified", "do_not_contact"].includes(stage.key)) {
    return "bg-surface-2 text-text-faint";
  }
  if (["interested_lead", "qualified_lead", "connection_accepted", "in_conversation"].includes(stage.key)) {
    return "bg-info-soft text-info";
  }
  if (
    ["contacted", "connection_sent", "appointment_scheduled", "proposal_consideration", "out_for_signature"].includes(
      stage.key
    )
  ) {
    return "bg-warn-soft text-warn";
  }
  return "bg-surface-2 text-text-dim";
}

export function StagePill({ stage }: { stage: LifecycleStage | null | undefined }) {
  return <span className={`pill ${toneFor(stage)}`}>{stage?.label ?? "Unknown"}</span>;
}
