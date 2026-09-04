# Scout — project handover

Last updated: 4 September 2026.

There are two artefacts in this project, and it matters which one you are looking at:

| Artefact | What it is | Status |
| --- | --- | --- |
| `scout-handover/prototype/scout.html` | Single-file, zero-dependency prototype. Real data, real scoring engine, real UI, `localStorage` persistence. | **Complete and working.** Open it in a browser. |
| This repository | Next.js + Supabase production app. Same product, real backend. | **Scaffolded, never run.** No `npm install` has been executed against it. |

The prototype is the specification. When the two disagree, the prototype is right — it is the
version that was reviewed and signed off. The job is to bring the Next.js app up to parity
with it, not to redesign it.

`scout-handover/` is a frozen reference snapshot and nothing in it is compiled or deployed.

---

## 1. What Scout is

A proactive discovery agent. It watches the pages where events get announced, extracts real
dates, prices and locations, ranks what is on against your taste, and shows a small number of
things worth doing — each one explained, each one linking back to the page the facts came from.

It is **not** an events directory, a booking marketplace, a social network, or a chatbot. The
test it has to pass:

> "The app knows what I like, keeps an eye on what is happening nearby, and finds things worth doing for me."

Core loop: `preferences → source monitoring → ingestion → extraction → personalisation → recommendations → feedback → learning`.

The first market is South East Queensland, but the product is designed to be market-agnostic:
a market is a row in the database, not a branch in the code. See `AGENTS.md`.

---

## 2. Non-negotiable product rules

Each exists because an earlier build got it wrong. They are also in `AGENTS.md` so AI
assistants pick them up automatically.

1. **No fabricated data. Ever.** Every listing must trace to a page that was actually read. An
   earlier build invented a Paniyiri Greek Festival date and a plausible-looking wrong URL, and
   it destroyed trust instantly. If a fact is unknown, show that it is unknown — "Price on
   source", "Address not confirmed". A wrong date is worse than no date.
2. **No travel-distance cap.** Distance softens a score, it never removes a listing. There is no
   `max_travel_minutes` anywhere, and the schema says so in a comment deliberately.
3. **Aggregator-first crawling.** Poll pages that list many things at once — council event feeds,
   open data, regional tourism sites, ticketing platforms, city guides. Individual venue pages
   are fetched **on demand only**. Never crawl a single venue daily. This is `sources.tier`.
4. **Images come from the source or are clearly generated.** Hot-link a source image only when
   the page published one. Otherwise render the generated cover and label it as generated.
5. **Links point where the facts came from** — the specific listing page, not a homepage.
6. **Upcoming only.** Anything finished is suppressed, and the suppression is inspectable in
   Settings → Held back.
7. **No Friday scheduling, no weekend planner.** The person picks the days.
8. **App, not a website.** No marketing landing page. Profile top-right like any SaaS product.
   Onboarding runs once, up front, and is skippable.
9. **The preference model is visible and correctable.** Settings shows every inference, its
   confidence, the number of reactions behind it, and a Forget button.

---

## 3. Repository map

```
supabase/schema.sql        Postgres schema + RLS. Source of truth for the data model.
                           markets and regions are tables; no geography is hard-coded.
supabase/seed.sql          Aggregators, verify-tier sources, social/manual, seed discoveries.

src/lib/types.ts           Shared domain types.
src/lib/scoring.ts         Ranking. Mirrors the prototype engine. gate() has no distance gate.
src/lib/regions.ts         Region labelling only, never a filter.
src/lib/constants.ts       Tunables. No geographic literals.
src/lib/ics.ts             Calendar export. Writes .ics; never touches a calendar account.
src/lib/supabaseClient.ts  Browser client (anon key).
src/lib/supabaseServer.ts  Server client. Server-only.

src/ingest/run.ts          Orchestrator. Only schedules sources with cadence_minutes > 0.
src/ingest/extract.ts      AI extraction. Validates output; drops below CONFIDENCE_FLOOR (0.5).
src/ingest/dedupe.ts       Normalised title/venue/date matching; merges source refs.
src/ingest/geocode.ts      Mapbox forward geocoding.
src/ingest/adapters/*      website, rss, openData, instagram, tiktok, manual.

src/app/api/discoveries    List + detail, ranked, upcoming only.
src/app/api/feedback       Record a reaction.
src/app/api/profile        Preferences + learned model + forget one inference.
src/app/api/saved          The list: GET / POST / DELETE.
src/app/api/import         User-submitted listing. confidence 0.4, user_submitted true.
src/app/api/sources        Source health for the Sources screen.
src/app/api/links          Paste-a-link: reads that one page, nothing else on the domain.
src/app/api/ingest         Cron entry point. Guarded by INGEST_SECRET.

src/components/*           AppShell, Onboarding, Calibration, Feed, DiscoveryCard,
                           SavedList, ImportModal, SettingsDrawer, ProfileMenu.

docs/SOCIAL-INGESTION.md   What Instagram and TikTok APIs actually permit.
docs/MASS-ADOPTION.md      Product reasoning behind calibration, the list, sharing.
```

`vercel.json` runs `/api/ingest` every three hours.

---

## 4. The prototype, so you can read the engine quickly

`scout-handover/prototype/scout.html` is three concatenated scripts. To see how ranking
behaves, this is far faster to read than the API layer.

- **`EV.ITEMS`** — 38 verified listings. Every record carries `src.url` (the exact page the facts
  were read from), `verified` (the date it was read), `confidence`, and a `facts` array quoting
  the source. `img` is `null` unless the page published an image that can be hot-linked.
- **`EV.SOURCES`** — 24 sources across four tiers: 12 aggregators on a schedule, 9 official pages
  fetched on demand, Instagram and TikTok (not connected), and the manual inbox.
- **`EV.E`** — the engine. Key function is `score(item, occurrence, profile, learnedMap)`:
  - `personal = interest*0.55 + learned*0.30 + tagAffinity*0.15`
  - `practical = travel*0.5 + budget*0.35 + booking*0.15`
  - `quality = sourceReliability*0.55 + extractionConfidence*0.45`
  - `raw = personal*0.42 + practical*0.26 + quality*0.17 + soon*0.15`, clamped 38–99
  - `travel` uses a soft baseline of 110 minutes (55 if the person prefers close), and is a
    **score term only**
  - `learn(feedback)` derives keys like `cat:market` and `budget:tight` with
    `confidence = min(0.95, 0.32 + n*0.13)`
- **`diversify()`** caps the feed at two consecutive items of the same category.

Deterministic and inspectable by design. AI is used for three things only: extraction from raw
pages, writing the one-line explanation, and parsing a pasted link. Never in the ranking path.

---

## 5. Data model (short version)

`markets`, `regions`, `profiles`, `user_preferences`, `learned_preferences`, `sources`,
`raw_source_content`, `discoveries`, `discovery_sources`, `user_feedback`, `saved_items`,
`calibration_answers`.

Columns worth knowing about:

- `markets` — timezone, currency, locale and default coordinates per market. Everything
  geographic hangs off this row rather than off a constant in the code.
- `sources.tier` — `aggregator | verify | social | manual`. The whole crawl policy hangs off
  this. `verify` rows have `cadence_minutes = 0`, meaning never scheduled.
- `discoveries.location_confirmed` — `false` renders an "Address not confirmed" warning.
- `discoveries.user_submitted` / `submitted_by` — things the person added themselves.
  Confidence 0.4, never presented as ingested.
- `discoveries.confidence` — below 0.5 it is not published.
- `learned_preferences` — `key, value, confidence, evidence_count, origin, updated_at`. Exposed
  to the user and individually deletable.

RLS is on for every table. Per-user tables are keyed on `auth.uid()`; `markets` and `regions`
are public read; `discoveries` is readable only where `status = 'published'`.

---

## 6. Getting it running

```bash
npm install
cp .env.example .env.local     # then fill it in
# create a Supabase project, then in the SQL editor:
#   run supabase/schema.sql
#   run supabase/seed.sql
npm run dev
```

Environment variables are documented in `.env.example`. All AI and service-role keys are
server-side only; the browser gets the anon key and nothing else.

Trigger ingestion manually:

```bash
curl -X POST localhost:3000/api/ingest -H "authorization: Bearer $INGEST_SECRET"
```

---

## 7. State of play — be sceptical of this repo

**Done and verified**

- The prototype: built, screenshot-QA'd at 1440px and 390px across eight screens, zero console
  errors, reviewed and accepted.
- The 38-record dataset: every listing read from its source page on 2 September 2026.
- Schema with markets/regions and full RLS, seed data, scoring, ingestion orchestration, eight
  API routes, nine components, both docs.

**Not done — the honest list**

1. **Nothing in this repo has been executed.** No install, no build, no typecheck, no request
   served. Expect real errors on first `npm run dev` — most likely missing imports and small
   type mismatches between `src/lib/types.ts` and the SQL column names.
2. **Authentication is not wired up.** The route handlers import the browser Supabase client and
   call `auth.getUser()` server-side, so they never see the caller's session. They must be moved
   onto the cookie-aware server client. Until then the RLS policies are effectively untested.
3. **`src/app/page.tsx` is a stub.** Onboarding, Calibration, Feed, SavedList and the modals all
   exist as components but are not composed into working routes with data fetching. This is the
   biggest single gap between the repo and the prototype.
4. **Ingestion has never run against a live source.** The adapters are written against real API
   shapes and real aggregator URLs, but every selector and every extraction prompt is untested.
5. **Instagram and TikTok are not connected.** The OAuth flows are stubbed.
   `docs/SOCIAL-INGESTION.md` sets out what the platforms actually allow, and it is much less
   than people assume. Do not promise users a magic Instagram feed.
6. Weather, notifications and couple profiles are in the schema and the brief but are not
   implemented.

---

## 8. Suggested order of work

1. Move all route handlers onto the server Supabase client and wire up Supabase Auth.
2. Install, typecheck, fix whatever breaks. Get `npm run dev` serving a page.
3. Compose the real screens: onboarding → calibration → discover / my list / sources, matching
   the prototype. Port the prototype's markup and Tailwind tokens rather than reinventing them.
4. Run ingestion against two aggregators only — council open data and Humanitix are the most
   structured. Get those clean before adding the other ten.
5. Compare `src/lib/scoring.ts` output against the prototype engine on the same 38 records.
   Where they disagree, the prototype wins.
6. Then social, weather, notifications, and the second-market dry run.

---

## 9. Things that will bite you

- **Recurrence.** Markets are weekly, exhibitions are date ranges, one-offs are single dates. The
  prototype models this as `type: dated | weekly | season` with an
  `occurrences(item, from, horizon, limit)` function. Get this right early; it infects
  everything — expiry, sorting, calendar export, the "next dates" list.
- **Deduplication.** The same festival appears on four aggregators with four different titles.
  `dedupe.ts` normalises title, venue and date, then merges while preserving every source
  reference. Losing source references breaks the "where did this come from" promise.
- **Timezones.** Store UTC, render in the market's timezone read from the `markets` row. Never
  hard-code one. The prototype's date handling is deliberately naive-local; do not copy that
  part into the server.
- **The prototype's clock.** `E.TODAY` is pinned to `new Date(2026, 8, 2)` for reproducible
  screenshots. Real code should use the actual clock.
- **Avoid template literals containing raw URLs** when generating files programmatically — a URL
  inside `${...}` interpolation got mangled twice during this build. Use plain string constants
  and concatenation in the ingestion adapters.

---

## 10. Verified source list

The twelve scheduled aggregators, all confirmed live:

Brisbane City Council event search and open data portal · Visit Brisbane · The Urban List
(Brisbane and Gold Coast) · Queensland.com events · What's On Gold Coast · Experience Gold Coast
· Visit Sunshine Coast · Sunshine Coast Council events · Visit Ipswich What's On · What's On
Scenic Rim · Humanitix (Brisbane and Gold Coast)

The nine on-demand verify sources are official pages: Brisbane Festival, Brisbane Powerhouse,
QAGOMA, Jan Powers Farmers Markets, Goodwill/West End, Eumundi Markets, Eat Street Northshore,
Tamborine Glow Worms, Paniyiri.

One known-good hot-linkable image URL was captured during research, on the Prison Island record.
Every other listing renders a generated cover, labelled as such. That ratio is a genuine
finding, not laziness: most of these pages do not publish images that can be legitimately reused.
