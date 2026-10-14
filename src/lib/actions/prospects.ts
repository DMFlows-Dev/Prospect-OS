"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCsv, rowsToProspects } from "@/lib/csv";
import { fieldsFromForm, normalizeUrl, str } from "@/lib/prospect-fields";
import { replyActivityType, sentActivityType } from "@/lib/channels";
import { fail, type ActionResult } from "@/lib/action-result";
import type { ActivityType, ChannelKey } from "@/types/database";

export async function createProspect(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      name: str(formData, "name") ?? "Untitled prospect",
      title: str(formData, "title"),
      company: str(formData, "company"),
      company_website: str(formData, "company_website"),
      linkedin_url: str(formData, "linkedin_url"),
      linkedin_company_url: str(formData, "linkedin_company_url"),
      instagram_url: str(formData, "instagram_url"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      industry_id: str(formData, "industry_id"),
      service_line_id: str(formData, "service_line_id"),
      campaign_id: str(formData, "campaign_id"),
      assigned_bdr_id: str(formData, "assigned_bdr_id") ?? user!.id,
      data_source: str(formData, "data_source") ?? "Manual entry",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { data: stage } = await supabase.from("lifecycle_stages").select("id").eq("key", "new_prospect").single();

  if (stage) {
    await supabase.from("prospects").update({ lifecycle_stage_id: stage.id }).eq("id", data!.id);
    await supabase.from("lifecycle_history").insert({
      prospect_id: data!.id,
      new_stage_id: stage.id,
      changed_by_user_id: user!.id,
      reason: "Prospect created",
    });
  }

  await supabase.from("activities").insert({
    prospect_id: data!.id,
    bdr_id: user!.id,
    activity_type: "prospect_imported" satisfies ActivityType,
    notes: "Added manually.",
  });

  revalidatePath("/prospects");
  redirect(`/prospects/${data!.id}`);
}

export async function updateProspectFields(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const patch = fieldsFromForm(formData);
    const { error } = await supabase.from("prospects").update(patch).eq("id", id);
    if (error) return fail(error.message);
    revalidatePath(`/prospects/${id}`);
    revalidatePath("/prospects", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Logs a message the BDR sent (outbound) or the prospect's reply (inbound). */
export async function logMessage(input: {
  prospectId: string;
  channel: ChannelKey;
  stepKey: string;
  stepLabel?: string;
  direction: "outbound" | "inbound";
  content: string;
}): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Not signed in.");

    const content = input.content.trim();
    const isNote = input.stepKey === "note";
    if (!content && input.direction === "outbound") return fail("Nothing to log — the message is empty.");
    if (!content && !(input.direction === "inbound" && input.stepKey === "connect")) {
      return fail("Paste what they replied before logging it.");
    }

    const activityType: ActivityType = isNote
      ? "note_added"
      : input.direction === "outbound"
        ? sentActivityType(input.channel, input.stepKey, input.stepLabel)
        : replyActivityType(input.channel, input.stepKey);

    const { data: prospect } = await supabase.from("prospects").select("campaign_id").eq("id", input.prospectId).single();

    const { error } = await supabase.from("activities").insert({
      prospect_id: input.prospectId,
      bdr_id: user.id,
      campaign_id: prospect?.campaign_id ?? null,
      channel: input.channel,
      activity_type: activityType,
      direction: input.direction,
      content: content || null,
      notes: input.stepLabel ? `Step: ${input.stepLabel}` : null,
    });
    if (error) return fail(error.message);

    revalidatePath(`/prospects/${input.prospectId}`);
    revalidatePath("/prospects", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Manual lifecycle change — always logged, never silent. */
export async function changeLifecycleStage(prospectId: string, newStageId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prospect } = await supabase.from("prospects").select("lifecycle_stage_id").eq("id", prospectId).single();
  if (prospect?.lifecycle_stage_id === newStageId) return;

  const { error: updateError } = await supabase.from("prospects").update({ lifecycle_stage_id: newStageId }).eq("id", prospectId);
  if (updateError) throw new Error(updateError.message);

  const { error: historyError } = await supabase.from("lifecycle_history").insert({
    prospect_id: prospectId,
    previous_stage_id: prospect?.lifecycle_stage_id ?? null,
    new_stage_id: newStageId,
    changed_by_user_id: user!.id,
    changed_by_ai: false,
    reason,
  });
  if (historyError) throw new Error(historyError.message);

  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/prospects", "layout");
}

export async function setProspectStage(prospectId: string, stageId: string): Promise<ActionResult> {
  try {
    await changeLifecycleStage(prospectId, stageId, "Manual update by BDR");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Marks a prospect Interested/Qualified and records the qualification details. */
export async function markQualified(prospectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const status = (str(formData, "qualification_status") as "interested" | "qualified") ?? "interested";

  const { error: statusError } = await supabase.from("prospects").update({ qualification_status: status }).eq("id", prospectId);
  if (statusError) throw new Error(statusError.message);

  const { error: qualError } = await supabase.from("qualifications").insert({
    prospect_id: prospectId,
    qualified_by_user_id: user!.id,
    notes: str(formData, "notes"),
    pain_point: str(formData, "pain_point"),
    service_of_interest: str(formData, "service_of_interest"),
    budget: str(formData, "budget"),
    timeline: str(formData, "timeline"),
    decision_maker_status: str(formData, "decision_maker_status"),
    next_action: str(formData, "next_action"),
  });
  if (qualError) throw new Error(qualError.message);

  await supabase.from("activities").insert({
    prospect_id: prospectId,
    bdr_id: user!.id,
    activity_type: "qualified_marked",
    notes: `Marked ${status}.`,
  });

  const stageKey = status === "qualified" ? "qualified_lead" : "interested_lead";
  const { data: stage } = await supabase.from("lifecycle_stages").select("id").eq("key", stageKey).single();
  if (stage) {
    await changeLifecycleStage(prospectId, stage.id, `Marked ${status} by BDR`);
  }

  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/prospects", "layout");
}

export async function deleteProspect(prospectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").delete().eq("id", prospectId);
  if (error) throw new Error(error.message);
  revalidatePath("/prospects", "layout");
  redirect("/prospects");
}

const MAX_IMPORT_ROWS = 500;

function importError(message: string): never {
  redirect(`/prospects/import?error=${encodeURIComponent(message)}`);
}

export async function importProspects(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let text = String(formData.get("csv") ?? "");
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) text = await file.text();
  if (!text.trim()) importError("Choose a CSV file or paste CSV text.");

  const { prospects, skipped } = rowsToProspects(parseCsv(text));
  if (prospects.length === 0) {
    importError("No usable rows. The first row must be a header and include a name column (or first and last name).");
  }
  if (prospects.length > MAX_IMPORT_ROWS) importError(`Import at most ${MAX_IMPORT_ROWS} rows at a time.`);

  const { data: existing } = await supabase.from("prospects").select("linkedin_url").not("linkedin_url", "is", null);
  const seen = new Set((existing ?? []).map((r) => normalizeUrl(r.linkedin_url)));

  let duplicates = 0;
  const fresh = prospects.filter((p) => {
    const key = normalizeUrl(p.linkedin_url);
    if (key && seen.has(key)) {
      duplicates++;
      return false;
    }
    if (key) seen.add(key);
    return true;
  });
  if (fresh.length === 0) importError("Every row was already in your prospects (matched on LinkedIn URL).");

  const { data: stage } = await supabase.from("lifecycle_stages").select("id").eq("key", "new_prospect").single();
  const campaignId = str(formData, "campaign_id");

  const { data: inserted, error } = await supabase
    .from("prospects")
    .insert(
      fresh.map((p) => ({
        ...p,
        campaign_id: campaignId,
        assigned_bdr_id: user!.id,
        data_source: "CSV import",
        lifecycle_stage_id: stage?.id ?? null,
      }))
    )
    .select("id");
  if (error) importError(error.message);

  const ids = (inserted ?? []).map((r) => r.id as string);
  if (stage) {
    await supabase.from("lifecycle_history").insert(
      ids.map((id) => ({ prospect_id: id, new_stage_id: stage.id, changed_by_user_id: user!.id, reason: "Imported from CSV" }))
    );
  }
  await supabase.from("activities").insert(
    ids.map((id) => ({
      prospect_id: id,
      bdr_id: user!.id,
      activity_type: "prospect_imported" satisfies ActivityType,
      notes: "Imported from CSV.",
    }))
  );

  revalidatePath("/prospects", "layout");
  redirect(`/prospects/import?done=${ids.length}&dupes=${duplicates}&skipped=${skipped}`);
}
