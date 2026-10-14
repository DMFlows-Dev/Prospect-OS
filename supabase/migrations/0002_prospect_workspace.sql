-- Prospecting OS — Phase 2 schema: prospect workspace, AI playbook, Chrome extension.
-- Run in the Supabase SQL Editor AFTER 0001_init.sql. Safe to re-run.

-- ---------------------------------------------------------------------------
-- Prospect fields filled by the Chrome extension / pasted text / AI extraction
-- ---------------------------------------------------------------------------
alter table public.prospects
  add column if not exists linkedin_company_url text,
  add column if not exists profile_text text,          -- person's LinkedIn profile text
  add column if not exists company_text text,          -- company's LinkedIn / about text
  add column if not exists company_blurb text,         -- one-line company summary
  add column if not exists profile_captured_at timestamptz,
  add column if not exists company_captured_at timestamptz;

-- ---------------------------------------------------------------------------
-- App settings (admin-controlled): AI model etc.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists app_settings_select on public.app_settings;
drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_select on public.app_settings for select using (auth.uid() is not null);
create policy app_settings_admin_write on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (key, value)
values ('ai', '{"model": "claude-haiku-4-5"}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Channel playbooks: admin instructions + the ordered sequence steps per channel
-- ---------------------------------------------------------------------------
create table if not exists public.channel_playbooks (
  channel public.channel_key primary key,
  instructions text not null default '',
  steps jsonb not null default '[]'::jsonb,   -- [{key,label,hint,max_chars,instruction}]
  updated_at timestamptz not null default now()
);
alter table public.channel_playbooks enable row level security;
drop policy if exists channel_playbooks_select on public.channel_playbooks;
drop policy if exists channel_playbooks_admin_write on public.channel_playbooks;
create policy channel_playbooks_select on public.channel_playbooks for select using (auth.uid() is not null);
create policy channel_playbooks_admin_write on public.channel_playbooks for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.channel_playbooks (channel, instructions, steps) values
  ('linkedin_connection', '',
   $json$[
     {"key":"connect","label":"Connect (request note)","hint":"Sent with the connection request. Max 300 characters.","max_chars":300,"instruction":"One specific, genuine observation about their work, then a simple invitation to connect. No pitch."}
   ]$json$::jsonb),
  ('linkedin_message', '',
   $json$[
     {"key":"connect","label":"Connect (request note)","hint":"Sent before they accept.","max_chars":300,"instruction":"One specific, genuine observation about their work, then a simple invitation to connect. No pitch."},
     {"key":"appreciation","label":"Appreciation (after they accept)","hint":"First DM after connecting. A short thank-you, nothing else — zero pitch.","instruction":"Thank them for connecting and mention one specific thing you liked. No pitch, no question."},
     {"key":"authority","label":"Authority","hint":"A day or two later. One plain line on what you do — zero pressure.","instruction":"One plain sentence on what DM Flows does that connects to their world, ending with a no-pressure line."},
     {"key":"value","label":"Value (a resource)","hint":"A few days later. Something genuinely useful — no ask.","instruction":"Offer something genuinely useful (a checklist, a short audit, a template) relevant to their situation. No ask."}
   ]$json$::jsonb),
  ('linkedin_inmail', '',
   $json$[
     {"key":"inmail","label":"InMail","hint":"Subject on the first line prefixed with 'Subject:', then the body. Under 150 words.","max_chars":1900,"instruction":"Lead with something specific to them. One clear, low-pressure reason for reaching out."},
     {"key":"inmail_follow_up","label":"Follow-up","hint":"4–5 days later if no reply. Short and low-pressure.","instruction":"A short bump adding one new angle. No guilt."}
   ]$json$::jsonb),
  ('instagram_dm', '',
   $json$[
     {"key":"opener","label":"Opener","hint":"Casual and short. Reference something specific from their content or bio.","instruction":"Conversational tone, one or two sentences, no pitch."},
     {"key":"follow_up","label":"Follow-up","hint":"2–3 days later. One light line.","instruction":"One light line that keeps the conversation going."}
   ]$json$::jsonb),
  ('email', '',
   $json$[
     {"key":"first_email","label":"First email","hint":"Subject on the first line prefixed with 'Subject:', then the body. Under 120 words.","instruction":"Specific opening, one relevant idea, one small ask."},
     {"key":"follow_up_1","label":"Follow-up 1","hint":"3 days later. Short bump with one new angle.","instruction":"Short bump with one new angle or proof point."},
     {"key":"follow_up_2","label":"Last touch","hint":"5–7 days later. Polite close — leave the door open.","instruction":"A polite close that leaves the door open."}
   ]$json$::jsonb)
on conflict (channel) do nothing;

-- ---------------------------------------------------------------------------
-- A BDR's personal instructions per channel (layered on top of the admin's)
-- ---------------------------------------------------------------------------
create table if not exists public.bdr_instructions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  channel public.channel_key not null,
  instructions text not null default '',
  updated_at timestamptz not null default now(),
  primary key (profile_id, channel)
);
alter table public.bdr_instructions enable row level security;
drop policy if exists bdr_instructions_own on public.bdr_instructions;
create policy bdr_instructions_own on public.bdr_instructions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- AI output per prospect + channel: gaps & opportunities + drafted sequence
-- ---------------------------------------------------------------------------
create table if not exists public.prospect_sequences (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  channel public.channel_key not null,
  gaps jsonb not null default '[]'::jsonb,
  rationale text,
  steps jsonb not null default '[]'::jsonb,   -- [{key, body}]
  model text,
  generated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prospect_id, channel)
);
alter table public.prospect_sequences enable row level security;
drop policy if exists prospect_sequences_select on public.prospect_sequences;
drop policy if exists prospect_sequences_insert on public.prospect_sequences;
drop policy if exists prospect_sequences_update on public.prospect_sequences;
drop policy if exists prospect_sequences_delete on public.prospect_sequences;
create policy prospect_sequences_select on public.prospect_sequences for select using (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);
create policy prospect_sequences_insert on public.prospect_sequences for insert with check (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);
create policy prospect_sequences_update on public.prospect_sequences for update using (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);
create policy prospect_sequences_delete on public.prospect_sequences for delete using (
  exists (select 1 from public.prospects p where p.id = prospect_id
    and (public.is_manager_or_admin() or p.assigned_bdr_id = auth.uid()))
);

drop trigger if exists prospect_sequences_set_updated_at on public.prospect_sequences;
create trigger prospect_sequences_set_updated_at before update on public.prospect_sequences
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Chrome extension tokens (only a SHA-256 hash is stored; the token is shown once)
-- ---------------------------------------------------------------------------
create table if not exists public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked boolean not null default false
);
alter table public.extension_tokens enable row level security;
drop policy if exists extension_tokens_own on public.extension_tokens;
create policy extension_tokens_own on public.extension_tokens for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Extension API: security-definer functions that authenticate by token.
-- The Next.js route /api/extension calls these with the public key; each one
-- checks the token and that the prospect belongs to that BDR (or the caller
-- is a manager/admin) before touching anything.
-- ---------------------------------------------------------------------------
create or replace function public._ext_profile(p_token text)
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  t public.extension_tokens;
  p public.profiles;
begin
  select * into t from public.extension_tokens
   where token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'utf8')), 'hex')
     and not revoked;
  if not found then
    raise exception 'invalid_token';
  end if;
  select * into p from public.profiles where id = t.profile_id and status <> 'disabled';
  if not found then
    raise exception 'invalid_token';
  end if;
  update public.extension_tokens set last_used_at = now() where id = t.id;
  return p;
end;
$$;
revoke all on function public._ext_profile(text) from public, anon, authenticated;

create or replace function public.ext_whoami(p_token text)
returns json
language plpgsql security definer set search_path = public
as $$
declare me public.profiles;
begin
  me := public._ext_profile(p_token);
  return json_build_object('id', me.id, 'name', me.name, 'role', me.role);
end;
$$;

create or replace function public.ext_list_prospects(p_token text, p_query text default null)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  me public.profiles;
  result json;
begin
  me := public._ext_profile(p_token);
  select coalesce(json_agg(r), '[]'::json) into result from (
    select id, name, title, company, linkedin_url, linkedin_company_url,
           profile_captured_at, company_captured_at
      from public.prospects
     where (me.role in ('admin', 'manager') or assigned_bdr_id = me.id)
       and (coalesce(p_query, '') = ''
            or name ilike '%' || p_query || '%'
            or company ilike '%' || p_query || '%')
     order by updated_at desc
     limit 30
  ) r;
  return result;
end;
$$;

create or replace function public.ext_get_prospect(p_token text, p_prospect_id uuid)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  me public.profiles;
  pr public.prospects;
begin
  me := public._ext_profile(p_token);
  select * into pr from public.prospects where id = p_prospect_id;
  if not found or not (me.role in ('admin', 'manager') or pr.assigned_bdr_id = me.id) then
    raise exception 'forbidden';
  end if;
  return json_build_object(
    'id', pr.id, 'name', pr.name, 'title', pr.title, 'company', pr.company,
    'linkedin_url', pr.linkedin_url, 'linkedin_company_url', pr.linkedin_company_url,
    'profile_text', pr.profile_text, 'company_text', pr.company_text,
    'profile_captured_at', pr.profile_captured_at, 'company_captured_at', pr.company_captured_at
  );
end;
$$;

create or replace function public.ext_capture(
  p_token text, p_prospect_id uuid, p_kind text, p_text text, p_url text, p_name text default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  me public.profiles;
  pr public.prospects;
  clipped text;
begin
  me := public._ext_profile(p_token);
  select * into pr from public.prospects where id = p_prospect_id;
  if not found or not (me.role in ('admin', 'manager') or pr.assigned_bdr_id = me.id) then
    raise exception 'forbidden';
  end if;
  if p_kind not in ('person', 'company') then
    raise exception 'bad_kind';
  end if;
  if coalesce(length(trim(p_text)), 0) < 20 then
    raise exception 'empty_capture';
  end if;
  clipped := left(p_text, 20000);

  if p_kind = 'person' then
    update public.prospects
       set profile_text = clipped,
           profile_captured_at = now(),
           linkedin_url = coalesce(nullif(linkedin_url, ''), p_url),
           name = case
                    when (name is null or name = '' or name = 'Untitled prospect')
                         and coalesce(p_name, '') <> '' then p_name
                    else name
                  end
     where id = p_prospect_id;
  else
    update public.prospects
       set company_text = clipped,
           company_captured_at = now(),
           linkedin_company_url = coalesce(nullif(linkedin_company_url, ''), p_url)
     where id = p_prospect_id;
  end if;

  insert into public.activities (prospect_id, bdr_id, activity_type, notes)
  values (
    p_prospect_id, me.id, 'prospect_researched',
    case when p_kind = 'person' then 'LinkedIn profile captured via extension.'
         else 'LinkedIn company page captured via extension.' end
  );

  return json_build_object('ok', true, 'chars', length(clipped));
end;
$$;

grant execute on function public.ext_whoami(text) to anon, authenticated;
grant execute on function public.ext_list_prospects(text, text) to anon, authenticated;
grant execute on function public.ext_get_prospect(text, uuid) to anon, authenticated;
grant execute on function public.ext_capture(text, uuid, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lifecycle auto-advance, extended. Moves a prospect FORWARD only (a reply
-- from someone parked as Unresponsive/Nurture re-opens them). Anything that
-- needs judgement — Interested, Qualified — stays a manual BDR decision.
-- ---------------------------------------------------------------------------
create or replace function public.apply_activity_lifecycle() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target_key text;
  target_stage uuid;
  target_order int;
  prev_stage uuid;
  prev_order int;
  prev_key text;
begin
  target_key := case new.activity_type
    when 'connection_sent' then 'connection_sent'
    when 'connection_accepted' then 'connection_accepted'
    when 'meeting_scheduled' then 'appointment_scheduled'
    when 'message_sent' then 'contacted'
    when 'inmail_sent' then 'contacted'
    when 'email_sent' then 'contacted'
    when 'instagram_dm_sent' then 'contacted'
    when 'follow_up_sent' then 'contacted'
    when 'message_received' then 'in_conversation'
    when 'inmail_received' then 'in_conversation'
    when 'email_replied' then 'in_conversation'
    when 'instagram_dm_received' then 'in_conversation'
    else null
  end;

  if target_key is null then
    return new;
  end if;

  select id, sort_order into target_stage, target_order
    from public.lifecycle_stages where key = target_key;
  if target_stage is null then
    return new;
  end if;

  select p.lifecycle_stage_id, coalesce(s.sort_order, 0), s.key
    into prev_stage, prev_order, prev_key
    from public.prospects p
    left join public.lifecycle_stages s on s.id = p.lifecycle_stage_id
   where p.id = new.prospect_id;

  if prev_stage = target_stage then
    return new;
  end if;
  if prev_order >= target_order and coalesce(prev_key, '') not in ('unresponsive', 'nurture') then
    return new;
  end if;

  update public.prospects set lifecycle_stage_id = target_stage where id = new.prospect_id;

  insert into public.lifecycle_history (prospect_id, previous_stage_id, new_stage_id, changed_by_user_id, changed_by_ai, reason)
  values (new.prospect_id, prev_stage, target_stage, new.bdr_id, false,
          'Auto-applied from logged activity: ' || new.activity_type);

  return new;
end;
$$;
