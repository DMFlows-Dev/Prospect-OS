"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActivityType, ChannelKey } from "@/types/database";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

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

  // Seed the lifecycle at "New Prospect" and log the import so the timeline
  // isn't empty on the very first view.
  const { data: stage } = await supabase
    .from("lifecycle_stages")
    .select("id")
    .eq("key", "new_prospect")
    .single();

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

export async function updateProspectFields(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("prospects")
    .update({
      name: str(formData, "name") ?? "Untitled prospect",
      title: str(formData, "title"),
      company: str(formData, "company"),
      company_website: str(formData, "company_website"),
      linkedin_url: str(formData, "linkedin_url"),
      instagram_url: str(formData, "instagram_url"),
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      industry_id: str(formData, "industry_id"),
      service_line_id: str(formData, "service_line_id"),
      assigned_bdr_id: str(formData, "assigned_bdr_id"),
      pain_points: str(formData, "pain_points"),
      buying_signals: str(formData, "buying_signals"),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/prospects/${id}`);
}

export async function logActivity(prospectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prospect } = await supabase
    .from("prospects")
    .select("campaign_id")
    .eq("id", prospectId)
    .single();

  const { error } = await supabase.from("activities").insert({
    prospect_id: prospectId,
    bdr_id: user!.id,
    campaign_id: prospect?.campaign_id ?? null,
    channel: (str(formData, "channel") as ChannelKey) ?? null,
    activity_type: (str(formData, "activity_type") as ActivityType) ?? "note_added",
    direction: str(formData, "direction") ?? "outbound",
    content: str(formData, "content"),
    notes: str(formData, "notes"),
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/prospects/${prospectId}`);
}

/** Manual lifecycle change — always logged, never silent. */
export async function changeLifecycleStage(prospectId: string, newStageId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prospect } = await supabase
    .from("prospects")
    .select("lifecycle_stage_id")
    .eq("id", prospectId)
    .single();

  const { error: updateError } = await supabase
    .from("prospects")
    .update({ lifecycle_stage_id: newStageId })
    .eq("id", prospectId);
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
}

/** Marks a prospect Interested/Qualified and records the qualification details. */
export async function markQualified(prospectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const status = (str(formData, "qualification_status") as "interested" | "qualified") ?? "interested";

  const { error: statusError } = await supabase
    .from("prospects")
    .update({ qualification_status: status })
    .eq("id", prospectId);
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

  // Move lifecycle to match, using the matching stage key.
  const stageKey = status === "qualified" ? "qualified_lead" : "interested_lead";
  const { data: stage } = await supabase.from("lifecycle_stages").select("id").eq("key", stageKey).single();
  if (stage) {
    await changeLifecycleStage(prospectId, stage.id, `Marked ${status} by BDR`);
  }

  revalidatePath(`/prospects/${prospectId}`);
}
