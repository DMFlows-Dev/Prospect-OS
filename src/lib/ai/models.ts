export const AI_MODELS = [
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", note: "Fastest and cheapest — about $1 in / $5 out per million tokens" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", note: "Better writing — about $2 in / $10 out per million tokens" },
  { id: "claude-opus-5", label: "Claude Opus 5", note: "Highest quality — about $5 in / $25 out per million tokens" },
] as const;

export const DEFAULT_AI_MODEL = "claude-haiku-4-5";

export function isKnownModel(id: string): boolean {
  return AI_MODELS.some((m) => m.id === id);
}
