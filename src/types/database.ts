// Hand-written to match supabase/migrations/0001_init.sql exactly.
// Once the project is linked to a real Supabase instance, regenerate with
// `supabase gen types typescript --linked > src/types/database.ts` and this
// file becomes redundant — keep them in sync until then.

export type UserRole = "admin" | "manager" | "bdr";
export type UserStatus = "active" | "invited" | "disabled";
export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type ChannelKey =
  | "email"
  | "linkedin_connection"
  | "linkedin_message"
  | "linkedin_inmail"
  | "instagram_dm";
export type QualificationStatus = "unqualified" | "interested" | "qualified" | "disqualified";
export type ActivityDirection = "inbound" | "outbound";
export type ActivityType =
  | "prospect_imported"
  | "prospect_researched"
  | "connection_sent"
  | "connection_accepted"
  | "message_sent"
  | "message_received"
  | "inmail_sent"
  | "inmail_received"
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "email_replied"
  | "instagram_dm_sent"
  | "instagram_dm_received"
  | "follow_up_sent"
  | "call_completed"
  | "meeting_scheduled"
  | "meeting_completed"
  | "note_added"
  | "lifecycle_changed"
  | "qualified_marked"
  | "hubspot_sync_requested"
  | "hubspot_sync_completed"
  | "hubspot_sync_failed";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Industry {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface ServiceLine {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface LifecycleStage {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_closed: boolean;
  active: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  owner_id: string;
  assigned_bdr_id: string | null;
  industry_id: string | null;
  service_line_id: string | null;
  channel: ChannelKey | null;
  icp_description: string | null;
  target_company_size: string | null;
  target_location: string | null;
  target_job_titles: string | null;
  objective: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  ai_instructions: string | null;
  follow_up_rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: string;
  campaign_id: string | null;
  assigned_bdr_id: string | null;
  name: string;
  title: string | null;
  company: string | null;
  company_website: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  email: string | null;
  phone: string | null;
  industry_id: string | null;
  service_line_id: string | null;
  employee_count: number | null;
  tech_stack: Record<string, unknown> | null;
  pain_points: string | null;
  buying_signals: string | null;
  trigger_events: string | null;
  data_source: string | null;
  last_researched_at: string | null;
  lifecycle_stage_id: string | null;
  qualification_status: QualificationStatus;
  hubspot_contact_id: string | null;
  hubspot_company_id: string | null;
  hubspot_deal_id: string | null;
  linkedin_company_url: string | null;
  profile_text: string | null;
  company_text: string | null;
  company_blurb: string | null;
  profile_captured_at: string | null;
  company_captured_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookStep {
  key: string;
  label: string;
  hint?: string;
  max_chars?: number;
  instruction?: string;
}

export interface ChannelPlaybook {
  channel: ChannelKey;
  instructions: string;
  steps: PlaybookStep[];
  updated_at: string;
}

export interface BdrInstruction {
  profile_id: string;
  channel: ChannelKey;
  instructions: string;
}

export interface SequenceStep {
  key: string;
  body: string;
}

export interface ProspectSequence {
  id: string;
  prospect_id: string;
  channel: ChannelKey;
  gaps: string[];
  rationale: string | null;
  steps: SequenceStep[];
  model: string | null;
  updated_at: string;
}

export interface ExtensionToken {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

export interface Activity {
  id: string;
  prospect_id: string;
  bdr_id: string | null;
  campaign_id: string | null;
  channel: ChannelKey | null;
  activity_type: ActivityType;
  content: string | null;
  direction: ActivityDirection | null;
  provider: string | null;
  status: string | null;
  external_message_id: string | null;
  external_thread_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface LifecycleHistoryEntry {
  id: string;
  prospect_id: string;
  previous_stage_id: string | null;
  new_stage_id: string | null;
  changed_by_user_id: string | null;
  changed_by_ai: boolean;
  reason: string | null;
  created_at: string;
}

export interface Qualification {
  id: string;
  prospect_id: string;
  qualified_by_user_id: string | null;
  notes: string | null;
  pain_point: string | null;
  service_of_interest: string | null;
  budget: string | null;
  timeline: string | null;
  decision_maker_status: string | null;
  next_action: string | null;
  created_at: string;
}

export interface HubspotSyncLog {
  id: string;
  prospect_id: string;
  sync_type: string;
  status: string;
  hubspot_contact_id: string | null;
  hubspot_company_id: string | null;
  hubspot_deal_id: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Minimal shape satisfying @supabase/ssr's generic constraint. Table row
 * types above are used directly in query results via `.returns<T>()` /
 * explicit typing at the call site rather than threading everything through
 * this generic — swap in the CLI-generated Database type once available.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
