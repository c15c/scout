-- Scout schema. Run in the Supabase SQL editor BEFORE seed.sql.
-- Location-agnostic rule: all geography lives in data (markets, regions),
-- never in application code or constants.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- markets & regions (geography as data) ----------
create table if not exists markets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null,       -- IANA name; read from here, never from a constant
  currency text not null,
  locale text not null,
  default_lat double precision,
  default_lng double precision,
  created_at timestamptz default now()
);

create table if not exists regions (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references markets on delete cascade,
  slug text not null,
  label text not null,
  lat double precision,
  lng double precision,
  unique (market_id, slug)
);

-- ---------- people ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  email text,
  market_id uuid references markets,
  home_label text,
  home_lat double precision,
  home_lng double precision,
  onboarded_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists user_preferences (
  user_id uuid primary key references profiles on delete cascade,
  interests text[] default '{}',
  excluded_categories text[] default '{}',
  budget_per_person numeric default 120,
  booking_tolerance text default 'ok',      -- ok | avoid
  crowd_tolerance text default 'ok',
  setting_preference text default 'any',    -- indoor | outdoor | any
  novelty numeric default 0.6,
  preferred_weekdays int[] default '{}',
  notify boolean default true,
  quiet_hours int4range default '[21,7)',
  updated_at timestamptz default now()
  -- Deliberately no max_travel_minutes: distance nudges ranking, never filters.
);

create table if not exists learned_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  key text not null,                        -- cat:music, tag:free, budget:tight, travel:close
  label text,
  weight numeric not null,
  evidence_count int default 1,
  confidence numeric default 0.3,
  origin text default 'inferred',           -- explicit | inferred | temporary
  corrected_by_user boolean default false,
  updated_at timestamptz default now(),
  unique (user_id, key)
);

-- ---------- ingestion ----------
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,   -- null = global source
  market_id uuid references markets,
  name text not null,
  domain text,
  kind text not null,        -- rss | ics | website | open_data | newsletter | manual | instagram | tiktok
  tier text not null default 'verify'
    check (tier in ('aggregator','verify','social','manual')),
  -- aggregator: crawled on a schedule. verify: cadence 0, fetched only to
  -- confirm facts already discovered elsewhere. Never schedule point venues.
  config jsonb default '{}',
  reliability numeric default 0.7,
  cadence_minutes int default 360,
  status text default 'ok',  -- ok | error | not_connected | needs_reauth
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  unique (domain, market_id)
);

create table if not exists raw_source_content (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources on delete cascade,
  url text,
  fetched_at timestamptz default now(),
  content_hash text,
  payload text,
  unique (source_id, content_hash)
);

create table if not exists discoveries (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references markets,
  title text not null,
  description text,
  category text not null,
  kind text not null,             -- dated | weekly | season | venue
  starts_on date,
  ends_on date,
  weekdays int[],
  open_time time,
  close_time time,
  venue_name text,
  address text,
  lat double precision,
  lng double precision,
  location_confirmed boolean default false,
  price_min numeric,
  price_max numeric,
  price_note text,
  booking text,                   -- none | recommended | required
  indoor boolean,
  effort int default 1,
  tags text[] default '{}',
  -- provenance: the page the facts came from, never a homepage guess
  source_id uuid references sources,
  source_url text not null,
  source_verified_at timestamptz not null default now(),
  -- image is copied from the source page only (og:image / twitter:image / JSON-LD)
  image_url text,
  image_credit text,
  image_source_url text,
  confidence numeric default 0.5,
  status text default 'published', -- published | needs_review | suppressed
  suppressed_reason text,
  fingerprint text,                -- normalised title|venue|date for dedupe
  user_submitted boolean not null default false,
  submitted_by uuid references profiles on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists discoveries_when on discoveries (starts_on, status);
create index if not exists discoveries_market on discoveries (market_id, status);
create index if not exists discoveries_title_trgm on discoveries using gin (title gin_trgm_ops);
create unique index if not exists discoveries_fingerprint on discoveries (fingerprint) where fingerprint is not null;

-- one discovery can be corroborated by several sources; all references are kept
create table if not exists discovery_sources (
  discovery_id uuid references discoveries on delete cascade,
  source_id uuid references sources on delete cascade,
  url text not null,
  seen_at timestamptz default now(),
  primary key (discovery_id, url)
);

create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  discovery_id uuid references discoveries on delete cascade,
  type text not null,   -- save | up | down | going | love | ok | expensive | far | done | unavailable
  context jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists feedback_user on user_feedback (user_id, created_at desc);

-- Saved items. Deliberately not tied to a weekend: the person chooses days.
create table if not exists saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  discovery_id uuid not null references discoveries on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, discovery_id)
);
create index if not exists saved_items_user_idx on saved_items (user_id, created_at desc);

-- Reactions captured during the onboarding taste check. Kept separate from
-- ordinary feedback so their weight can be tuned independently, and so a
-- person can replay calibration without wiping real feedback history.
create table if not exists calibration_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  discovery_id uuid not null references discoveries on delete cascade,
  reaction text not null check (reaction in ('save', 'up', 'down', 'skip')),
  position int,
  created_at timestamptz not null default now()
);
create index if not exists calibration_user_idx on calibration_answers (user_id);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table learned_preferences enable row level security;
alter table user_feedback enable row level security;
alter table sources enable row level security;
alter table discoveries enable row level security;
alter table discovery_sources enable row level security;
alter table saved_items enable row level security;
alter table calibration_answers enable row level security;
alter table markets enable row level security;
alter table regions enable row level security;

create policy "read markets" on markets for select using (true);
create policy "read regions" on regions for select using (true);
create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own prefs" on user_preferences for all using (auth.uid() = user_id);
create policy "own learned" on learned_preferences for all using (auth.uid() = user_id);
create policy "own feedback" on user_feedback for all using (auth.uid() = user_id);
create policy "own or global sources" on sources for select using (owner_id is null or auth.uid() = owner_id);
create policy "manage own sources" on sources for all using (auth.uid() = owner_id);
create policy "read published" on discoveries for select using (status = 'published');
create policy "read discovery sources" on discovery_sources for select using (true);
create policy "own saved items" on saved_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own calibration" on calibration_answers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- writes to discoveries/raw_source_content happen with the service-role key from the ingestion worker
