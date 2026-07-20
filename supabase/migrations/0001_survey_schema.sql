-- Guivos VAL-002 survey schema.
-- Stores survey responses and the admin-editable question/content configuration
-- that today live only in the visitor's browser (localStorage). Applies to both
-- Supabase Cloud and a self-hosted Supabase instance (same migration file).

create extension if not exists pgcrypto;

-- One row per completed survey submission.
create table if not exists public.survey_responses (
  id text primary key,
  submitted_at timestamptz not null default now(),
  duration_sec integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  extras jsonb not null default '{}'::jsonb,
  contact_name text,
  contact_value text,
  created_at timestamptz not null default now()
);

create index if not exists survey_responses_submitted_at_idx
  on public.survey_responses (submitted_at desc);

-- Admin-editable config, stored as JSON documents keyed by name
-- ("questions" | "content"), mirroring the shape already used client-side
-- in src/lib/survey-store.ts (DEFAULT_QUESTIONS / DEFAULT_CONTENT).
create table if not exists public.survey_config (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security is enabled with NO policies attached on purpose.
-- This denies all access to both the anon and authenticated roles (including
-- the publishable/anon API key used by the browser client). All reads and
-- writes happen exclusively through server-side TanStack Start functions
-- using the service-role client (src/integrations/supabase/client.server.ts),
-- which bypasses RLS. This keeps respondent PII (name/contact answers) and
-- admin content completely unreachable via the public API key.
alter table public.survey_responses enable row level security;
alter table public.survey_config enable row level security;
