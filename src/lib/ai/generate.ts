import Anthropic from "@anthropic-ai/sdk";
import type { PlaybookStep } from "@/types/database";

export type AiUsage = { input: number; output: number };

export class AiError extends Error {}

/** One non-streaming Claude call. Model is whatever the admin picked. */
export async function runClaude(args: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ text: string; usage: AiUsage }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiError("ANTHROPIC_API_KEY is not set on the server. Add it to .env.local and restart.");
  }
  const client = new Anthropic({ apiKey });

  const params: Record<string, unknown> = {
    model: args.model,
    max_tokens: args.maxTokens ?? 6000,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  };
  // Haiku 4.5 rejects `effort`; Sonnet 5 / Opus 5 think by default, so keep them light.
  if (args.model !== "claude-haiku-4-5") params.output_config = { effort: "low" };

  try {
    const res = await client.messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming);
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (res.stop_reason === "refusal") throw new AiError("The model declined this request.");
    return { text, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.APIError) throw new AiError(`Claude API error (${e.status}): ${e.message}`);
    throw e;
  }
}

/** Pulls the first JSON object out of a model reply, tolerating code fences. */
export function parseJsonObject<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new AiError("The model reply wasn't valid JSON. Try again.");
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("The model reply wasn't valid JSON. Try again.");
  }
}

export type CampaignBrief = {
  name: string;
  objective: string | null;
  icp_description: string | null;
  ai_instructions: string | null;
} | null;

function section(title: string, body: string | null | undefined): string {
  const t = (body ?? "").trim();
  return t ? `\n${title}\n${t}\n` : "";
}

function campaignText(c: CampaignBrief): string {
  if (!c) return "";
  return [
    `Campaign: ${c.name}`,
    c.objective ? `Objective: ${c.objective}` : "",
    c.icp_description ? `Ideal customer: ${c.icp_description}` : "",
    c.ai_instructions ? `Campaign instructions: ${c.ai_instructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export type SequenceExtraction = {
  extracted?: {
    name?: string | null;
    title?: string | null;
    company?: string | null;
    company_blurb?: string | null;
    industry?: string | null;
    service_line?: string | null;
  };
  gaps?: string[];
  rationale?: string;
  steps?: { key: string; body: string }[];
};

export function buildSequencePrompt(a: {
  channelLabel: string;
  steps: PlaybookStep[];
  adminInstructions: string;
  bdrInstructions: string;
  campaign: CampaignBrief;
  serviceLines: string[];
  industries: string[];
  known: Record<string, string | null>;
  profileText: string | null;
  companyText: string | null;
}): { system: string; user: string } {
  const system = `You are the drafting engine inside Prospecting OS, used by business development reps at DM Flows, an agency. DM Flows' service lines: ${a.serviceLines.join(", ") || "not specified"}.

You receive a prospect's LinkedIn profile text, their company's LinkedIn/about text, and a few known properties. Do three jobs:
1. Extract clean properties.
2. List gaps & opportunities — where DM Flows could genuinely help this prospect.
3. Draft the message sequence for the "${a.channelLabel}" channel.

Hard rules
- Use only facts present in the supplied text. Never invent clients, results, numbers, mutual connections, events or tools. If it isn't in the text, leave it out.
- Messages read like one person writing to another: specific, plain, short. No hype, no stacked compliments, no emojis, no placeholders like [Name], no sign-off unless the step is an email.
- Follow each step's purpose, timing hint and max_chars exactly. A step with max_chars must stay under that many characters.
- gaps: 2 to 4 one-sentence observations grounded in the text.
- If the prospect is outside DM Flows' core niche, say so plainly in "rationale" and pick an honest angle (for example a resource for their own clients) instead of a direct pitch.
${section("Admin instructions for this channel (mandatory):", a.adminInstructions)}${section("The BDR's own instructions (apply within the admin rules):", a.bdrInstructions)}${section("Campaign brief:", campaignText(a.campaign))}
Respond with ONLY a JSON object — no prose, no code fences:
{"extracted":{"name":string|null,"title":string|null,"company":string|null,"company_blurb":string|null (one sentence),"industry":string|null (exactly one of: ${a.industries.join(" | ") || "none"}),"service_line":string|null (exactly one of: ${a.serviceLines.join(" | ") || "none"})},"gaps":string[],"rationale":string,"steps":[{"key":string,"body":string}]}
"steps" must contain exactly one entry per step key provided, in order.`;

  const user = `Known properties:
${JSON.stringify(a.known, null, 2)}

Steps to write:
${JSON.stringify(
  a.steps.map((s) => ({ key: s.key, label: s.label, timing_and_purpose: s.hint ?? "", max_chars: s.max_chars ?? null, step_instruction: s.instruction ?? "" })),
  null,
  2
)}

--- PERSON PROFILE TEXT ---
${(a.profileText ?? "").slice(0, 12000) || "(none)"}

--- COMPANY TEXT ---
${(a.companyText ?? "").slice(0, 8000) || "(none)"}`;

  return { system, user };
}

export function buildSuggestPrompt(a: {
  channelLabel: string;
  steps: PlaybookStep[];
  adminInstructions: string;
  bdrInstructions: string;
  campaign: CampaignBrief;
  known: Record<string, string | null>;
  profileText: string | null;
  companyText: string | null;
  timeline: string;
}): { system: string; user: string } {
  const system = `You are the drafting engine inside Prospecting OS. Read the timeline of what has already been sent and received, then write the single best NEXT message to send on the "${a.channelLabel}" channel.

Rules
- Use only facts in the supplied text and timeline. Never invent anything.
- If they replied, answer what they actually said first. If nothing has been sent yet, write the first step. If they have not replied, follow the next unused step in the sequence plan.
- Plain, specific, short. No hype, no emojis, no placeholders.
- Output ONLY the message text (for email, begin with "Subject: ..." on the first line). No commentary.
${section("Admin instructions for this channel (mandatory):", a.adminInstructions)}${section("The BDR's own instructions:", a.bdrInstructions)}${section("Campaign brief:", campaignText(a.campaign))}`;

  const user = `Known properties:
${JSON.stringify(a.known, null, 2)}

Sequence plan for this channel:
${a.steps.map((s, i) => `${i + 1}. ${s.label}${s.hint ? ` — ${s.hint}` : ""}${s.max_chars ? ` (max ${s.max_chars} chars)` : ""}`).join("\n")}

Timeline so far (oldest first):
${a.timeline || "(nothing logged yet)"}

--- PERSON PROFILE TEXT ---
${(a.profileText ?? "").slice(0, 8000) || "(none)"}

--- COMPANY TEXT ---
${(a.companyText ?? "").slice(0, 5000) || "(none)"}`;

  return { system, user };
}
