"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getActivities,
  getAiModel,
  getBdrInstructions,
  getCampaign,
  getChannelPlaybook,
  getIndustries,
  getProspect,
  getServiceLines,
} from "@/lib/data";
import { channelLabel } from "@/lib/channels";
import { fail, type ActionResult } from "@/lib/action-result";
import { fieldsFromForm } from "@/lib/prospect-fields";
import {
  buildSequencePrompt,
  buildSuggestPrompt,
  parseJsonObject,
  runClaude,
  type AiUsage,
  type CampaignBrief,
  type SequenceExtraction,
} from "@/lib/ai/generate";
import type { ChannelKey, Prospect } from "@/types/database";

const PLACEHOLDER_NAME = "Untitled prospect";
const isEmpty = (v: string | null | undefined) => !v || v === PLACEHOLDER_NAME;

async function loadContext(prospect: Prospect, channel: ChannelKey, userId: string) {
  const [playbook, bdrRows, campaign] = await Promise.all([
    getChannelPlaybook(channel),
    getBdrInstructions(userId),
    prospect.campaign_id ? getCampaign(prospect.campaign_id) : Promise.resolve(null),
  ]);
  const brief: CampaignBrief = campaign
    ? {
        name: campaign.name,
        objective: campaign.objective,
        icp_description: campaign.icp_description,
        ai_instructions: campaign.ai_instructions,
      }
    : null;
  return {
    steps: playbook?.steps ?? [],
    adminInstructions: playbook?.instructions ?? "",
    bdrInstructions: bdrRows.find((r) => r.channel === channel)?.instructions ?? "",
    brief,
  };
}

function knownProperties(p: Prospect): Record<string, string | null> {
  return { name: p.name === PLACEHOLDER_NAME ? null : p.name, title: p.title, company: p.company, website: p.company_website };
}

/**
 * Saves the form, then makes one Claude call that extracts properties, finds
 * gaps & opportunities, and drafts every step for the channel.
 * mode "regenerate" re-drafts without touching the property fields.
 */
export async function extractAndDraft(
  prospectId: string,
  channel: ChannelKey,
  formData: FormData | null,
  mode: "extract" | "regenerate"
): Promise<ActionResult<{ usage: AiUsage; model: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Not signed in.");

    if (formData) {
      const { error } = await supabase.from("prospects").update(fieldsFromForm(formData)).eq("id", prospectId);
      if (error) return fail(error.message);
    }

    const prospect = await getProspect(prospectId);
    if (!prospect) return fail("Prospect not found.");

    const hasText = (prospect.profile_text ?? "").trim().length >= 40 || (prospect.company_text ?? "").trim().length >= 40;
    if (!hasText) {
      return fail("Add the profile or company text first — paste it or use the Chrome extension's Capture button.");
    }

    const [ctx, industries, serviceLines, model] = await Promise.all([
      loadContext(prospect, channel, user.id),
      getIndustries(),
      getServiceLines(),
      getAiModel(),
    ]);
    if (ctx.steps.length === 0) return fail(`No sequence steps are set up for ${channelLabel(channel)} yet. Ask an admin to add them in Playbook.`);

    const { system, user: userPrompt } = buildSequencePrompt({
      channelLabel: channelLabel(channel),
      steps: ctx.steps,
      adminInstructions: ctx.adminInstructions,
      bdrInstructions: ctx.bdrInstructions,
      campaign: ctx.brief,
      serviceLines: serviceLines.map((s) => s.name),
      industries: industries.map((i) => i.name),
      known: knownProperties(prospect),
      profileText: prospect.profile_text,
      companyText: prospect.company_text,
    });

    const { text, usage } = await runClaude({ model, system, user: userPrompt });
    const parsed = parseJsonObject<SequenceExtraction>(text);

    const stepKeys = new Set(ctx.steps.map((s) => s.key));
    const steps = (parsed.steps ?? [])
      .filter((s) => stepKeys.has(s.key) && typeof s.body === "string")
      .map((s) => ({ key: s.key, body: s.body.trim() }));
    const gaps = (parsed.gaps ?? []).filter((g) => typeof g === "string" && g.trim()).map((g) => g.trim());

    const { error: seqError } = await supabase.from("prospect_sequences").upsert(
      {
        prospect_id: prospectId,
        channel,
        gaps,
        rationale: parsed.rationale?.trim() || null,
        steps,
        model,
        generated_by: user.id,
      },
      { onConflict: "prospect_id,channel" }
    );
    if (seqError) return fail(seqError.message);

    const patch: Record<string, string | null> = { last_researched_at: new Date().toISOString() };
    if (mode === "extract") {
      const e = parsed.extracted ?? {};
      if (isEmpty(prospect.name) && e.name) patch.name = e.name;
      if (isEmpty(prospect.title) && e.title) patch.title = e.title;
      if (isEmpty(prospect.company) && e.company) patch.company = e.company;
      if (isEmpty(prospect.company_blurb) && e.company_blurb) patch.company_blurb = e.company_blurb;
      if (!prospect.industry_id && e.industry) {
        patch.industry_id = industries.find((i) => i.name.toLowerCase() === e.industry!.toLowerCase())?.id ?? null;
      }
      if (!prospect.service_line_id && e.service_line) {
        patch.service_line_id = serviceLines.find((s) => s.name.toLowerCase() === e.service_line!.toLowerCase())?.id ?? null;
      }
    }
    await supabase.from("prospects").update(patch).eq("id", prospectId);

    if (mode === "extract") {
      await supabase.from("activities").insert({
        prospect_id: prospectId,
        bdr_id: user.id,
        channel,
        activity_type: "prospect_researched",
        notes: `AI drafted a ${channelLabel(channel)} sequence (${model}).`,
      });
    }

    revalidatePath(`/prospects/${prospectId}`);
    revalidatePath("/prospects", "layout");
    return { ok: true, usage, model };
  } catch (e) {
    return fail(e);
  }
}

/** Reads the timeline and drafts whatever should go out next on this channel. */
export async function suggestNextMessage(
  prospectId: string,
  channel: ChannelKey
): Promise<ActionResult<{ text: string; usage: AiUsage }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Not signed in.");

    const prospect = await getProspect(prospectId);
    if (!prospect) return fail("Prospect not found.");

    const [ctx, activities, model] = await Promise.all([
      loadContext(prospect, channel, user.id),
      getActivities(prospectId),
      getAiModel(),
    ]);

    const timeline = activities
      .filter((a) => a.content)
      .slice(-20)
      .map((a) => `[${a.created_at.slice(0, 10)}] ${a.direction === "inbound" ? "THEM" : "US"} (${a.activity_type.replaceAll("_", " ")}): ${a.content}`)
      .join("\n");

    const { system, user: userPrompt } = buildSuggestPrompt({
      channelLabel: channelLabel(channel),
      steps: ctx.steps,
      adminInstructions: ctx.adminInstructions,
      bdrInstructions: ctx.bdrInstructions,
      campaign: ctx.brief,
      known: knownProperties(prospect),
      profileText: prospect.profile_text,
      companyText: prospect.company_text,
      timeline,
    });

    const { text, usage } = await runClaude({ model, system, user: userPrompt, maxTokens: 3000 });
    return { ok: true, text: text.trim(), usage };
  } catch (e) {
    return fail(e);
  }
}
