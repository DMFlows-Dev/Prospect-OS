-- Prospecting OS — Phase 1 schema (Core CRM)
-- Run against a fresh Supabase project: paste into SQL Editor, or `supabase db push`
-- once the Supabase CLI is linked to the project.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'manager', 'bdr');
create type public.user_status as enum ('active', 'invited', 'disabled');
create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
create type public.channel_key as enum ('email', 'linkedin_connection', 'linkedin_message', 'linkedin_inmail', 'instagram_dm');
create type public.qualification_status as enum ('unqualified', 'interested', 'qualified', 'disqualified');
create type public.activity_direction as enum ('inbound', 'outbound');
create type public.activity_type as enum (
  'prospect_imported', 'prospect_researched',
  'connection_sent', 'connection_accepted',
  'message_sent', 'message_received',
  'inmail_sent', 'inmail_received',
  'email_sent', 'email_opened', 'email_clicked', 'email_replied',
  'instagram_dm_sent', 'instagram_dm_received',
  'follow_up_sent', 'call_completed',
  'meeting_scheduled', 'meeting_completed',
  'note_added', 'lifecycle_changed', 'qualified_marked',
  'hubspot_sync_requested', 'hubspot_sync_completed', 'hubspot_sync_failed'
);

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row, holds role/status
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role public.user_role not null default 'bdr',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
-- New signups default to 'bdr' / 'invited' — an admin promotes them afterwards
-- (see the Team screen). The very first user created should be promoted to
-- 'admin' by hand, once, directly in the table.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, 'invited');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Security-definer helpers so RLS policies can check role without recursively
-- re-triggering RLS on `profiles` itself (the classic Supabase footgun).
create function public.current_role() returns public.user_role
language sql security definer set search_path = public stable
as $$ select role from public.profiles where id = auth.uid() $$;

create function public.is_admin() returns boolean
language sql security definer set search_path = public stable
as $$ select public.current_role() = 'admin' $$;

create function public.is_manager_or_admin() returns boolean
language sql security definer set search_path = public stable
as $$ select public.current_role() in ('admin', 'manager') $$;

-- ---------------------------------------------------------------------------
-- Admin-managed lookup tables
-- ---------------------------------------------------------------------------
create table public.industries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.service_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lifecycle_stages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,           -- stable machine key, e.g. 'qualified_lead'
  label text not null,                -- display label, e.g. 'Qualified Lead'
  sort_order int not null,
  is_closed boolean not null default false, -- true for Closed Won / Closed Lost
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id),
  assigned_bdr_id uuid references public.profiles(id),
  industry_id uuid references public.industries(id),
  service_line_id uuid references public.service_lines(id),
  channel public.channel_key,
  icp_description text,
  target_company_size text,
  target_location text,
  target_job_titles text,
  objective text,
  status public.campaign_status not null default 'draft',
  start_date date,
  end_date date,
  notes text,
  ai_instructions text,
  follow_up_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  channel public.channel_key not null,
  steps jsonb not null default '[]'::jsonb, -- [{order, delay_days, message_type, template}]
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Prospects
-- ---------------------------------------------------------------------------
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  assigned_bdr_id uuid references public.profiles(id),
  name text not null,
  title text,
  company text,
  company_website text,
  linkedin_url text,
  instagram_url text,
  email text,
  phone text,
  industry_id uuid references public.industries(id),
  service_line_id uuid references public.service_lines(id),
  employee_count int,
  tech_stack jsonb,
  pain_points text,
  buying_signals text,
  trigger_events text,
  data_source text,
  last_researched_at timestamptz,
  lifecycle_stage_id uuid references public.lifecycle_stages(id),
  qualification_status public.qualification_status not null default 'unqualified',
  hubspot_contact_id text,
  hubspot_company_id text,
  hubspot_deal_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospects_assigned_bdr_idx on public.prospects(assigned_bdr_id);
create index prospects_campaign_idx on public.prospects(campaign_id);
create index prospects_lifecycle_idx on public.prospects(lifecycle_stage_id);

-- ---------------------------------------------------------------------------
-- Activities — every logged touch, on every channel
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  bdr_id uuid references public.profiles(id),
  campaign_id uuid references public.campaigns(id),
  channel public.channel_key,
  activity_type public.activity_type not null,
  content text,
  direction public.activity_direction,
  provider text,
  status text,
  external_message_id text,
  external_thread_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index activities_prospect_idx on public.activities(prospect_id);
create index activities_bdr_created_idx on public.activities(bdr_id, created_at);
create index activities_created_idx on public.activities(created_at);

-- ---------------------------------------------------------------------------
-- Lifecycle history — append-only audit trail of every stage change
-- ---------------------------------------------------------------------------
create table public.lifecycle_history (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  previous_stage_id uuid references public.lifecycle_stages(id),
  new_stage_id uuid references public.lifecycle_stages(id),
  changed_by_user_id uuid references public.profiles(id),
  changed_by_ai boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index lifecycle_history_prospect_idx on public.lifecycle_history(prospect_id);

-- ---------------------------------------------------------------------------
-- Qualifications — captured when a prospect is marked Interested/Qualified
-- ---------------------------------------------------------------------------
create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  qualified_by_user_id uuid references public.profiles(id),
  notes text,
  pain_point text,
  service_of_interest text,
  budget text,
  timeline text,
  decision_maker_status text,
  next_action text,
  created_at timestamptz not null default now()
);

create index qualifications_prospect_idx on public.qualifications(prospect_id);

-- ---------------------------------------------------------------------------
-- HubSpot sync logs (Phase 4 wires this up; table exists from day one so
-- the prospect detail page can render a "not yet synced" empty state)
-- ---------------------------------------------------------------------------
create table public.hubspot_sync_logs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  sync_type text not null,
  status text not null,
  hubspot_contact_id text,
  hubspot_company_id text,
  hubspot_deal_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index hubspot_sync_logs_prospect_idx on public.hubspot_sync_logs(prospect_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.industries enable row level security;
alter table public.service_lines enable row level security;
alter table public.lifecycle_stages enable row level security;
alter table public.campaigns enable row level security;
alter table public.sequences enable row level security;
alter table public.prospects enable row level security;
alter table public.activities enable row level security;
alter table public.lifecycle_history enable row level security;
alter table public.qualifications enable row level security;
alter table public.hubspot_sync_logs enable row level security;

-- profiles: everyone SIGNED IN can read the directory (needed for "assigned
-- BDR" dropdowns) — not `using (true)`, which would also let a fully
-- anonymous request holding only the public anon key read every name and
-- email. Only admins write; a user may update their own name.
create policy profiles_select_all on public.profiles for select using (auth.uid() is not null);
create policy profiles_update_self on public.profiles for update using (id = auth.uid());
create policy profiles_admin_write on public.profiles for insert with check (public.is_admin());
create policy profiles_admin_update on public.profiles for update using (public.is_admin());
create policy profiles_admin_delete on public.profiles for delete using (public.is_admin());

-- lookup tables: everyone reads active+inactive (admin UI needs to see
-- deactivated rows too); only admins write.
create policy industries_select on public.industries for select using (true);
create policy industries_admin_write on public.industries for insert with check (public.is_admin());
create policy industries_admin_update on public.industries for update using (public.is_admin());
create policy industries_admin_delete on public.industries for delete using (public.is_admin());

create policy service_lines_select on public.service_lines for select using (true);
create policy service_lines_admin_write on public.service_lines for insert with check (public.is_admin());
create policy service_lines_admin_update on public.service_lines for update using (public.is_admin());
create policy service_lines_admin_delete on public.service_lines for delete using (public.is_admin());

create policy lifecycle_stages_select on public.lifecycle_stages for select using (true);
create policy lifecycle_stages_admin_write on public.lifecycle_stages for insert with check (public.is_admin());
create policy lifecycle_stages_admin_update on public.lifecycle_stages for update using (public.is_admin());
create policy lifecycle_stages_admin_delete on public.lifecycle_stages for delete using (public.is_admin());

-- campaigns: admin/manager see and manage all; a BDR sees campaigns they
-- own or are assigned to, and may edit their own.
create policy campaigns_select on public.campaigns for select using (
  public.is_manager_or_admin() or owner_id = auth.uid() or assigned_bdr_id = auth.uid()
);
create policy campaigns_insert on public.campaigns for insert with check (
  public.is_manager_or_admin() or owner_id = auth.uid()
);
create policy campaigns_update on public.campaigns for update using (
  public.is_manager_or_admin() or owner_id = auth.uid()
);
create policy campaigns_delete on public.campaigns for delete using (public.is_admin());

create policy sequences_select on public.sequences for select using (
  exists (select 1 from public.campaigns c where c.id = campaign_id
    and (public.is_manager_or_admin() or c.owner_id = auth.uid() or c.assigned_bdr_id = auth.uid()))
);
create policy sequences_write on public.sequences for all using (
  exists (select 1 from public.campaigns c where c.id = campaign_id
    and (public.is_manager_or_admin() or c.owner_id = auth.uid()))
);

-- prospects: admin/manager see all; a BDR sees and manages only their own.
create policy prospects_select on public.prospects for select using (
  public.is_manager_or_admin() or assigned_bdr_id = auth.uid()
);
create policy prospects_insert on public.prospects for insert with check (
  public.is_manager_or_admin() or assigned_bdr_id = auth.uid()
);
create policy prospects_update on public.prospects for update using (
  public.is_manager_or_admin() or assigned_bdr_id = auth.uid()
);
create policy prospects_delete on public.prospects for delete using (public.is_admin());

-- activities / lifecycle_history / qualifications / hubspot_sync_logs all
-- inherit visibility from their parent prospect.
create policy activities_select on public.activities for select using (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);
create policy activities_insert on public.activities for insert with check (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);

create policy lifecycle_history_select on public.lifecycle_history for select using (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);
create policy lifecycle_history_insert on public.lifecycle_history for insert with check (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);

create policy qualifications_select on public.qualifications for select using (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);
create policy qualifications_insert on public.qualifications for insert with check (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);

create policy hubspot_sync_logs_select on public.hubspot_sync_logs for select using (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);

-- ---------------------------------------------------------------------------
-- keep updated_at current on campaigns / prospects
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger campaigns_set_updated_at before update on public.campaigns
  for each row execute procedure public.set_updated_at();
create trigger prospects_set_updated_at before update on public.prospects
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Whenever an activity is logged, auto-advance lifecycle for the handful of
-- activity types that unambiguously imply a stage (mirrors the same rule
-- Prospect Wire already uses). Anything more judgement-based (a positive
-- reply meaning "Interested") stays a manual BDR decision — see §06 of the
-- blueprint: the system suggests, it does not decide.
-- ---------------------------------------------------------------------------
create function public.apply_activity_lifecycle() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_key text;
  target_stage uuid;
  prev_stage uuid;
begin
  target_key := case new.activity_type
    when 'connection_sent' then 'connection_sent'
    when 'connection_accepted' then 'connection_accepted'
    when 'meeting_scheduled' then 'appointment_scheduled'
    else null
  end;

  if target_key is null then
    return new;
  end if;

  select id into target_stage from public.lifecycle_stages where key = target_key;
  if target_stage is null then
    return new;
  end if;

  select lifecycle_stage_id into prev_stage from public.prospects where id = new.prospect_id;

  update public.prospects set lifecycle_stage_id = target_stage where id = new.prospect_id;

  insert into public.lifecycle_history (prospect_id, previous_stage_id, new_stage_id, changed_by_user_id, changed_by_ai, reason)
  values (new.prospect_id, prev_stage, target_stage, new.bdr_id, false, 'Auto-applied from logged activity: ' || new.activity_type);

  return new;
end;
$$;

create trigger activities_apply_lifecycle after insert on public.activities
  for each row execute procedure public.apply_activity_lifecycle();

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
insert into public.lifecycle_stages (key, label, sort_order, is_closed) values
  ('new_prospect', 'New Prospect', 10, false),
  ('researched', 'Researched', 20, false),
  ('assigned', 'Assigned', 30, false),
  ('outreach_ready', 'Outreach Ready', 40, false),
  ('contacted', 'Contacted', 50, false),
  ('connection_sent', 'Connection Sent', 60, false),
  ('connection_accepted', 'Connection Accepted', 70, false),
  ('in_conversation', 'In Conversation', 80, false),
  ('interested_lead', 'Interested Lead', 90, false),
  ('qualified_lead', 'Qualified Lead', 100, false),
  ('appointment_scheduled', 'Appointment Scheduled', 110, false),
  ('proposal_consideration', 'Proposal / Business Consideration', 120, false),
  ('out_for_signature', 'Out for Signature', 130, false),
  ('closed_won', 'Closed Won', 140, true),
  ('closed_lost', 'Closed Lost', 150, true),
  ('unresponsive', 'Unresponsive', 160, false),
  ('not_interested', 'Not Interested', 170, false),
  ('disqualified', 'Disqualified', 180, false),
  ('nurture', 'Nurture', 190, false),
  ('do_not_contact', 'Do Not Contact', 200, false);

insert into public.industries (name) values
  ('PPC Agency'), ('Marketing Agency'), ('DTC Ecommerce'), ('Shopify Brand'),
  ('Beauty & Skincare'), ('Supplements'), ('Fashion'), ('Baby Care'),
  ('B2B SaaS'), ('IT Services'), ('MSP'), ('Consulting'),
  ('Professional Services'), ('Construction'), ('Manufacturing'), ('Other');

insert into public.service_lines (name) values
  ('HubSpot Implementation'), ('HubSpot CRM Setup'), ('HubSpot Administration'),
  ('RevOps'), ('Marketing Operations'), ('Sales Operations'),
  ('Marketing Automation'), ('Lead Scoring'), ('Email Marketing'),
  ('Klaviyo Retention Services'), ('DTC Email & SMS Marketing'),
  ('Outbound Lead Generation'), ('AI GTM Services'), ('White-Label Klaviyo Services'),
  ('Other');
