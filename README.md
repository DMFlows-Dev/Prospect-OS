# Prospecting OS

DM Flows' BDR prospecting platform. This is the Phase 1 scaffold from the
[Prospecting OS Blueprint](../scratchpad) memo: real auth, roles, campaigns,
prospects, the 20-stage lifecycle with a full audit log, manual activity
logging across every channel, and a basic dashboard — all reading and
writing real data, nothing mocked.

**Not in this phase** (see the blueprint for the full roadmap): AI research
and message drafting (Phase 2), the conversation inbox view (Phase 3),
HubSpot sync (Phase 4), and the full analytics/leaderboard suite (Phase 5).
The database already has the tables Phase 4 needs (`hubspot_sync_logs`) so
that phase is additive, not a migration.

## Stack 

Next.js 14 (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth,
Row Level Security) as the backend. No separate API server in this phase —
Server Actions talk to Supabase directly, with RLS as the real permission
boundary (not just UI hiding).

## One important note on how this was built

This was scaffolded by Claude inside a sandboxed environment **with no
Node.js, npm, or database runtime available** — every file here was written
by hand against well-established Next.js + Supabase patterns, but none of
it has actually been run or compiled yet. Treat first setup as also the
first real test: run through the steps below, and if something doesn't
compile or a query doesn't match the schema, that's expected to need a
small fix, not a sign something is fundamentally wrong. Report exactly
what broke and it gets fixed fast.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough to start).
2. **Run the schema.** Open the SQL Editor in your Supabase project, paste in the contents of
   `supabase/migrations/0001_init.sql`, and run it. This creates every table, the RLS policies, and
   seeds the 20 lifecycle stages + the industry/service-line lists from the blueprint.
2b. **Run the second migration.** Paste `supabase/migrations/0002_prospect_workspace.sql` into the SQL Editor and run it. It adds the prospect workspace fields, the AI playbook tables, the extension token functions and the extended lifecycle auto-advance. Safe to re-run.
3. **Copy environment variables.**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable key works) from your Supabase
   project's Settings → API page. Also set `ANTHROPIC_API_KEY` (Extract & draft / Suggest) and `SUPABASE_SERVICE_ROLE_KEY` (Team → Add team member).
4. **Install dependencies** (needs Node.js 18.18+ — install from [nodejs.org](https://nodejs.org) first if
   `node -v` doesn't work):
   ```bash
   npm install
   ```
5. **Run it:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
6. **Sign in** with your email on `/login` — you'll get a magic link (check Supabase's default email
   settings if it doesn't arrive; you may need to configure a sender for production use).
7. **Make yourself Admin.** The very first sign-in creates a `profiles` row with role `bdr` and status
   `invited` (nobody is auto-admin — that's a deliberate security default). In the Supabase Table
   Editor, open `profiles`, find your row, and set `role` to `admin` and `status` to `active` by hand,
   once. After that, the Team page lets you manage everyone else's role from the UI.

## Prospect workspace, AI playbook, Chrome extension

- **Prospects** open as a 3-pane workspace: prospect list, profile + AI gaps + message sequence, and an
  activity panel (mark lead, suggest next message, log a message, timeline). Add prospects one by one
  or with **Import CSV**.
- **AI Playbook** (admin): choose the Claude model and write the instructions and sequence steps for
  each channel. **Preferences** (everyone): personal instructions per channel, layered on the admin's,
  plus Chrome extension tokens.
- **Chrome extension** lives in `extension/` — see `extension/README.md`. It only reads a LinkedIn
  page when you click Capture.

## Project layout

```
src/app/(app)/        Authenticated pages — dashboard, prospects, campaigns, settings, team
src/app/login/         Magic-link sign-in
src/app/auth/callback/ Supabase auth callback route
src/lib/supabase/      Browser / server / middleware Supabase clients
src/lib/data.ts         Read queries used by Server Components
src/lib/actions/        Server Actions (mutations) — campaigns, prospects, settings, team
src/components/         Shared UI (Sidebar, StagePill, CampaignForm)
supabase/migrations/    SQL schema, RLS policies, seed data
```

## Deploying

Push this to a GitHub repo and import it into Vercel — set the same env vars from `.env.example`
(Supabase URL and key, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) in the Vercel project
settings. Point the Chrome extension's App URL at the deployed domain.
