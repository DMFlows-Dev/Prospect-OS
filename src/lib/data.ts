import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AI_MODEL, isKnownModel } from "@/lib/ai/models";
import type {
  Activity,
  BdrInstruction,
  Campaign,
  ChannelKey,
  ChannelPlaybook,
  ExtensionToken,
  ProspectSequence,
  HubspotSyncLog,
  Industry,
  LifecycleHistoryEntry,
  LifecycleStage,
  Profile,
  Prospect,
  Qualification,
  ServiceLine,
} from "@/types/database";

/** The signed-in user's profile row (role, status) — null if somehow missing. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("name");
  return (data as Profile[]) ?? [];
}

export async function getIndustries(includeInactive = false): Promise<Industry[]> {
  const supabase = await createClient();
  let query = supabase.from("industries").select("*").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data as Industry[]) ?? [];
}

export async function getServiceLines(includeInactive = false): Promise<ServiceLine[]> {
  const supabase = await createClient();
  let query = supabase.from("service_lines").select("*").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data as ServiceLine[]) ?? [];
}

export async function getLifecycleStages(includeInactive = false): Promise<LifecycleStage[]> {
  const supabase = await createClient();
  let query = supabase.from("lifecycle_stages").select("*").order("sort_order");
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data as LifecycleStage[]) ?? [];
}

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
  return (data as Campaign[]) ?? [];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("campaigns").select("*").eq("id", id).single();
  return (data as Campaign) ?? null;
}

export async function getProspects(): Promise<Prospect[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select("*").order("updated_at", { ascending: false });
  return (data as Prospect[]) ?? [];
}

export async function getProspect(id: string): Promise<Prospect | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select("*").eq("id", id).single();
  return (data as Prospect) ?? null;
}

export async function getActivities(prospectId: string): Promise<Activity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: true });
  return (data as Activity[]) ?? [];
}

export async function getLifecycleHistory(prospectId: string): Promise<LifecycleHistoryEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lifecycle_history")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: true });
  return (data as LifecycleHistoryEntry[]) ?? [];
}

export async function getQualification(prospectId: string): Promise<Qualification | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("qualifications")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Qualification) ?? null;
}

export async function getHubspotSyncLogs(prospectId: string): Promise<HubspotSyncLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hubspot_sync_logs")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });
  return (data as HubspotSyncLog[]) ?? [];
}

/** Activity counts for the given BDR (or everyone, if bdrId is omitted) since `since`. */
export async function getActivityCounts(since: string, bdrId?: string) {
  const supabase = await createClient();
  let query = supabase.from("activities").select("activity_type").gte("created_at", since);
  if (bdrId) query = query.eq("bdr_id", bdrId);
  const { data } = await query;
  const rows = (data as { activity_type: string }[]) ?? [];
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.activity_type] = (counts[row.activity_type] ?? 0) + 1;
  return counts;
}

export async function getChannelPlaybooks(): Promise<ChannelPlaybook[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("channel_playbooks").select("*");
  return (data as ChannelPlaybook[]) ?? [];
}

export async function getChannelPlaybook(channel: ChannelKey): Promise<ChannelPlaybook | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("channel_playbooks").select("*").eq("channel", channel).maybeSingle();
  return (data as ChannelPlaybook) ?? null;
}

export async function getBdrInstructions(profileId: string): Promise<BdrInstruction[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("bdr_instructions").select("*").eq("profile_id", profileId);
  return (data as BdrInstruction[]) ?? [];
}

export async function getProspectSequence(prospectId: string, channel: ChannelKey): Promise<ProspectSequence | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prospect_sequences")
    .select("*")
    .eq("prospect_id", prospectId)
    .eq("channel", channel)
    .maybeSingle();
  return (data as ProspectSequence) ?? null;
}

/** The model the admin picked in the Playbook; falls back to the default. */
export async function getAiModel(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "ai").maybeSingle();
  const model = (data?.value as { model?: string } | undefined)?.model;
  return model && isKnownModel(model) ? model : DEFAULT_AI_MODEL;
}

export async function getExtensionTokens(profileId: string): Promise<ExtensionToken[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("extension_tokens")
    .select("id,label,created_at,last_used_at,revoked")
    .eq("profile_id", profileId)
    .eq("revoked", false)
    .order("created_at", { ascending: false });
  return (data as ExtensionToken[]) ?? [];
}
