-- Scout schema. Run in the Supabase SQL editor.
-- Geographic facts live here, not in application code.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- markets (location-agnostic core) ----------
create table if not exists markets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null,
  currency text not null,
  locale text not null,
  default_lat double precision not null,
  default_lng double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references markets on delete cascade,
  slug text not null,
  label text not null,
  lat double precision not null,
  lng double precision not null,
  unique (market_id, slug)
);

-- ---------- people ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  email text,
  market_id uuid not null references markets,
  home_label text,
  home_lat double precision,
  home_lng double precision,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists user_preferences (
  user_id uuid primary key references profiles on delete cascade,
  interests text[] not null default '{}',
  excluded_categories text[] not null default '{}',
  budget_per_person numeric not null default 120,
  booking_tolerance text not null default 'ok',
  crowd_tolerance text not null default 'ok',
  setting_preference text not null default 'any',
  novelty numeric not null default 0.6,
  preferred_weekdays int[] not null default '{}',
  travel_preference text not null default 'any', -- close | any  (preference, never a cap)
  notify boolean not null default false,
  quiet_hours int4range default '[21,7)',
  updated_at timestamptz not null default now()
  -- Deliberately no max_travel_minutes: distance nudges ranking, never filters.
);

create table if not exists learned_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  key text not null,
  label text,
  weight numeric not null,
  evidence_count int not null default 1,
  confidence numeric not null default 0.3,
  origin text not null default 'inferred',
  corrected_by_user boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ---------- ingestion ----------
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  market_id uuid not null references markets,
  region_id uuid references regions on delete set null,
  name text not null,
  domain text,
  kind text not null,
  tier text not null check (tier in ('aggregator', 'verify', 'social', 'manual')),
  config jsonb not null default '{}',
  reliability numeric not null default 0.7,
  cadence_minutes int not null default 360,
  status text not null default 'ok',
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists raw_source_content (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources on delete cascade,
  url text,
  fetched_at timestamptz not null default now(),
  content_hash text,
  payload text,
  unique (source_id, content_hash)
);

create table if not exists discoveries (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references markets,
  region_id uuid references regions on delete set null,
  title text not null,
  description text,
  category text not null,
  kind text not null,
  starts_on date,
  ends_on date,
  weekdays int[],
  open_time time,
  close_time time,
  venue_name text,
  address text,
  lat double precision,
  lng double precision,
  location_confirmed boolean not null default false,
  price_min numeric,
  price_max numeric,
  price_note text,
  booking text,
  indoor boolean,
  effort int not null default 1,
  tags text[] not null default '{}',
  source_id uuid references sources,
  source_url text,
  source_verified_at timestamptz not null default now(),
  image_url text,
  image_credit text,
  image_source_url text,
  confidence numeric not null default 0.5,
  status text not null default 'published',
  suppressed_reason text,
  fingerprint text,
  user_submitted boolean not null default false,
  submitted_by uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discoveries_when on discoveries (market_id, starts_on, status);
create index if not exists discoveries_title_trgm on discoveries using gin (title gin_trgm_ops);
create unique index if not exists discoveries_fingerprint on discoveries (fingerprint) where fingerprint is not null;

create table if not exists discovery_sources (
  discovery_id uuid not null references discoveries on delete cascade,
  source_id uuid not null references sources on delete cascade,
  url text not null,
  seen_at timestamptz not null default now(),
  primary key (discovery_id, url)
);

create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  discovery_id uuid not null references discoveries on delete cascade,
  type text not null,
  context jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists feedback_user on user_feedback (user_id, created_at desc);

create table if not exists saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  discovery_id uuid not null references discoveries on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, discovery_id)
);
create index if not exists saved_items_user_idx on saved_items (user_id, created_at desc);

create table if not exists calibration_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  discovery_id uuid not null references discoveries on delete cascade,
  reaction text not null check (reaction in ('save', 'up', 'down', 'skip')),
  position int,
  created_at timestamptz not null default now()
);
create index if not exists calibration_user_idx on calibration_answers (user_id);

-- ---------- signup: attach every new auth user to the first market ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_market uuid;
begin
  select id into default_market from public.markets order by created_at asc limit 1;
  if default_market is null then
    raise exception 'no market seeded; insert a market before sign-up';
  end if;
  insert into public.profiles (id, email, market_id)
  values (new.id, new.email, default_market);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table markets enable row level security;
alter table regions enable row level security;
alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table learned_preferences enable row level security;
alter table sources enable row level security;
alter table raw_source_content enable row level security;
alter table discoveries enable row level security;
alter table discovery_sources enable row level security;
alter table user_feedback enable row level security;
alter table saved_items enable row level security;
alter table calibration_answers enable row level security;

create policy "read markets" on markets for select to authenticated using (true);
create policy "read regions" on regions for select to authenticated using (true);

create policy "own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "own prefs" on user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own learned" on learned_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own feedback" on user_feedback for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own or global sources" on sources for select using (owner_id is null or auth.uid() = owner_id);
create policy "manage own sources" on sources for insert with check (auth.uid() = owner_id);
create policy "update own sources" on sources for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "delete own sources" on sources for delete using (auth.uid() = owner_id);

create policy "read published in market" on discoveries for select using (
  (status = 'published' and user_submitted = false)
  or submitted_by = auth.uid()
);
create policy "read discovery sources" on discovery_sources for select using (true);

create policy saved_items_own on saved_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy calibration_own on calibration_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- raw_source_content: no policies. Anon/authenticated cannot read; service role bypasses RLS.
-- Discovery writes go through the service-role ingestion worker.
