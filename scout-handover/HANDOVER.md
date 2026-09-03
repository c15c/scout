# Scout — project handover

Last updated: 2 September 2026. Written for whoever picks this up next in Cursor.

There are two artefacts in this project, and it matters which one you are looking at:

| Artefact | What it is | Status |
| --- | --- | --- |
| `prototype/scout.html` | Single-file, zero-dependency prototype. Real data, real scoring engine, real UI, `localStorage` persistence. | **Complete and working.** Open it in a browser. |
| This repository | Next.js + Supabase production skeleton. Same product, real backend. | **Scaffolded, not yet run.** No `npm install` has ever been executed against it. |

The prototype is the specification. When the two disagree, the prototype is right — it is the version that was reviewed and signed off. Your job is to bring the Next.js app up to parity with it, not to redesign it.

---

## 1. What Scout is

A proactive discovery agent for South East Queensland. It watches the pages where events get announced, extracts real dates, prices and locations, ranks what is on against your taste, and shows a small number of things worth doing — each one explained, each one linking back to the page the facts came from.

It is **not** an events directory, a booking marketplace, a social network, or a chatbot. The test it has to pass:

> "The app knows what I like, keeps an eye on what is happening nearby, and finds things worth doing for me."

Core loop: `preferences → source monitoring → ingestion → extraction → personalisation → recommendations → feedback → learning`.

---

## 2. Non-negotiable product rules

These came out of review and each one exists because an earlier build got it wrong. Please do not quietly reverse them. They are also written into `AGENTS.md` so AI assistants in Cursor pick them up.

1. **No fabricated data. Ever.** Every listing must trace to a page that was actually read. An earlier build invented a Paniyiri Greek Festival date and a plausible-looking wrong URL, and it destroyed trust instantly. If a fact is unknown, show that it is unknown — "Price on source", "Address not confirmed". A wrong date is worse than no date.
2. **No travel-distance cap.** Distance softens a score, it never removes a listing. There is no `max_travel_minutes` anywhere, and the schema comment says so deliberately. Do not add a radius filter, however reasonable it looks.
3. **Aggregator-first crawling.** Poll pages that list many things at once — council event feeds, open data, regional tourism sites, ticketing platforms, city guides. Individual venue pages are fetched **on demand only**, to confirm or re-check a specific listing. Never crawl a single venue daily. This is the `sources.tier` column.
4. **Images come from the source or are clearly generated.** Hot-link a source image only when the page published one. Otherwise render the generated SVG cover and label it as generated. Never generate a photo-like image, never substitute a stock photo.
5. **Links point where the facts came from** — the specific listing page, not a homepage.
6. **Upcoming only.** Anything finished is suppressed, and the suppression is inspectable in Settings → Held back.
7. **No Friday scheduling, no weekend planner.** The person picks the days. This was explicitly scrapped; an earlier build and a competing prototype both had it.
8. **App, not a website.** No marketing landing page. Profile lives top-right like any SaaS product. Onboarding runs once, up front.
9. **The preference model is visible and correctable.** Settings shows every inference, its confidence, the number of reactions behind it, and a Forget button.

---

## 3. Repository map

```
supabase/schema.sql        Postgres schema + RLS. Source of truth for the data model.
supabase/seed.sql          12 aggregators, 9 verify-tier sources, social/manual, 12 discoveries.

src/lib/types.ts           Shared domain types.
src/lib/scoring.ts         Ranking. Mirrors the prototype engine. gate() has no distance gate.
src/lib/regions.ts         Five SEQ regions. Nearest-centre labelling only, never a filter.
src/lib/ics.ts             Calendar export. Writes .ics; never touches a calendar account.
src/lib/supabaseClient.ts  Browser client (anon key).
src/lib/supabaseServer.ts  Server client (service role). Server-only.

src/ingest/run.ts          Orchestrator. Filters to tier in (aggregator, social, manual).
                           Exports verifyListing() for on-demand official-page checks.
src/ingest/extract.ts      AI extraction. Validates output; drops below CONFIDENCE_FLOOR (0.5).
src/ingest/dedupe.ts       Normalised title/venue/date/URL matching; merges source refs.
src/ingest/geocode.ts      Mapbox forward geocoding.
src/ingest/adapters/*      website, rss, openData, instagram, tiktok, manual.

src/app/api/discoveries    List + detail, ranked.
src/app/api/feedback       Record a reaction.
src/app/api/profile        Preferences + learned model + forget one inference.
src/app/api/saved          The list: GET / POST / DELETE.
src/app/api/import         User-submitted listing. confidence 0.4, user_submitted true.
src/app/api/sources        Source health for the Sources screen.
src/app/api/links          Paste-a-link: reads that one page, nothing else on the domain.
src/app/api/ingest         Cron entry point. Guarded by INGEST_SECRET.

src/components/*           AppShell, Onboarding, Calibration, Feed, DiscoveryCard,
                           SavedList, ImportModal, SettingsDrawer, ProfileMenu.

docs/SOCIAL-INGESTION.md   What Instagram and TikTok APIs actually permit. Read before promising anything.
docs/MASS-ADOPTION.md      Product reasoning behind the calibration round, the list, sharing.
```

About 2,150 lines of TypeScript and SQL. `vercel.json` runs `/api/ingest` every three hours; `.github/workflows/ingest.yml` is the equivalent for GitHub Actions.

---

## 4. The prototype, so you can read the engine quickly

`prototype/scout.html` is three concatenated scripts. If you want to see how ranking behaves, this is far faster to read than the API layer.

- **`EV.ITEMS`** — 38 verified listings. Every record carries `src.url` (the exact page the facts were read from), `verified` (the date it was read), `confidence`, and a `facts` array quoting the source. `img` is `null` unless the page published an image that can legitimately be hot-linked.
- **`EV.SOURCES`** — 24 sources across four tiers: 12 aggregators on a schedule, 9 official pages fetched on demand, Instagram and TikTok (not connected), and the manual inbox.
- **`EV.E`** — the engine. Key function is `score(item, occurrence, profile, learnedMap)`:
  - `personal = interest*0.55 + learned*0.30 + tagAffinity*0.15`
  - `practical = travel*0.5 + budget*0.35 + booking*0.15`
  - `quality = sourceReliability*0.55 + extractionConfidence*0.45`
  - `raw = personal*0.42 + practical*0.26 + quality*0.17 + soon*0.15`, clamped 38–99
  - `travel` uses a soft baseline of 110 minutes (55 if the person has shown they prefer close), and is a **score term only**
  - `learn(feedback)` derives keys like `cat:market` and `budget:tight` with `confidence = min(0.95, 0.32 + n*0.13)`
- **`diversify()`** caps the feed at two consecutive items of the same category, so it never turns into a wall of markets.

Deterministic and inspectable by design. AI is used for three things only: extraction from raw pages, writing the one-line explanation, and parsing a pasted link. It is never in the ranking path.

---

## 5. Data model (short version)

`users`, `user_preferences`, `learned_preferences`, `sources`, `raw_source_content`, `discoveries`, `discovery_sources`, `user_feedback`, `saved_items`, `calibration_answers`.

Columns worth knowing about:

- `sources.tier` — `aggregator | verify | social | manual`. The whole crawl policy hangs off this. `verify` rows have `cadence_minutes = 0`, meaning never scheduled.
- `sources.region`, `discoveries.region` — one of the five SEQ regions, or `multi`.
- `discoveries.location_confirmed` — `false` renders an "Address not confirmed" warning in the UI.
- `discoveries.user_submitted` / `submitted_by` — things the person added themselves. Confidence 0.4, never presented as ingested.
- `discoveries.confidence` — below 0.5 it is not published.
- `learned_preferences` — `key, value, confidence, evidence_count, origin, updated_at`. Exposed to the user and individually deletable.

RLS is on for the per-user tables with `auth.uid() = user_id` policies. `discoveries` and `sources` are shared read.

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

Environment variables, all documented in `.env.example`:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, `AI_MODEL`, `MAPBOX_TOKEN`, `WEATHER_API_KEY`, `INGEST_SECRET`, and the Instagram/TikTok app credentials.

All AI and service-role keys are server-side only. The browser gets the anon key and nothing else.

Trigger ingestion manually:

```bash
curl -X POST localhost:3000/api/ingest -H "authorization: Bearer $INGEST_SECRET"
```

---

## 7. State of play — be sceptical of this repo

**Done and verified**

- The prototype: built, screenshot-QA'd at 1440px and 390px across eight screens, zero console errors, reviewed and accepted.
- The 38-record dataset: every listing read from its source page on 2 September 2026.
- Schema, seed data, scoring, ingestion orchestration, all nine API routes, nine components, both docs.

**Not done — and this is the honest list**

1. **Nothing in this repo has been executed.** No install, no build, no typecheck, no request served. The environment it was authored in had no network and no Node modules. Expect real errors on first `npm run dev` — most likely missing imports and small type mismatches between `src/lib/types.ts` and the SQL column names. Budget an afternoon.
2. **No authentication.** Every route takes `user_id` as a parameter and trusts it. Wire up Supabase Auth and read the user from the session instead. Until then the RLS policies are inert, because the service-role client bypasses them.
3. **`src/app/page.tsx` is a stub.** Onboarding, Calibration, Feed, SavedList and the modals all exist as components but are not composed into working routes with data fetching. This is the biggest single gap between the repo and the prototype.
4. **Ingestion has never run against a live source.** The adapters are written against real API shapes and real aggregator URLs, but every selector and every extraction prompt is untested. The first real run will be messy.
5. **Instagram and TikTok are not connected.** The OAuth flows are stubbed. `docs/SOCIAL-INGESTION.md` sets out what the platforms actually allow, and it is much less than people assume: Instagram gives hashtag search capped at 30 unique hashtags per rolling 7 days and no following feed at all; TikTok has no general keyword search for third-party apps, and its Research API is licensed for non-commercial use only. The honest fallback already built in the prototype is paste-a-link plus the add-it-yourself form. Do not promise users a magic Instagram feed.
6. **`git init` has not been run.** There is no commit history — this is a snapshot, not a repo with a past.
7. Weather, notifications and couple profiles are in the schema and the brief but are not implemented.

---

## 8. Suggested order of work

1. Install, typecheck, fix whatever breaks. Get `npm run dev` serving a page.
2. Supabase Auth, then strip `user_id` out of the request bodies.
3. Compose the real screens: onboarding → calibration → discover / my list / sources, matching the prototype. Port the prototype's markup and Tailwind tokens rather than reinventing the design.
4. Run ingestion against two aggregators only — Brisbane City Council open data and Humanitix are the most structured and the least likely to fight you. Get those clean before adding the other ten.
5. Compare `src/lib/scoring.ts` output against the prototype engine on the same 38 records. They should agree closely; where they do not, the prototype wins.
6. Then social, weather, notifications.

---

## 9. Things that will bite you

- **Recurrence.** Markets are weekly, exhibitions are date ranges, one-offs are single dates. The prototype models this as `type: dated | weekly | season` with an `occurrences(item, from, horizon, limit)` function. Get this right early; it infects everything — expiry, sorting, calendar export, the "next dates" list.
- **Deduplication.** The same festival appears on four aggregators with four different titles. `dedupe.ts` normalises title, venue, date and URL, then merges while preserving every source reference. Losing source references breaks the "where did this come from" promise.
- **Timezones.** Everything is `Australia/Brisbane`, which has no daylight saving. Store UTC, render Brisbane. The prototype's date handling is deliberately naive-local; do not copy that part into the server.
- **The prototype's clock.** `E.TODAY` is pinned to `new Date(2026, 8, 2)` for reproducible screenshots. Real code should use the actual clock.
- **Avoid template literals containing raw URLs** when generating files programmatically — a URL inside `${...}` interpolation got mangled twice during this build. Use plain string constants and concatenation in the ingestion adapters.

---

## 10. Verified source list

The twelve scheduled aggregators, all confirmed live:

Brisbane City Council event search and open data portal · Visit Brisbane · The Urban List (Brisbane and Gold Coast) · Queensland.com events · What's On Gold Coast · Experience Gold Coast · Visit Sunshine Coast · Sunshine Coast Council events · Visit Ipswich What's On · What's On Scenic Rim · Humanitix (Brisbane and Gold Coast)

The nine on-demand verify sources are official pages: Brisbane Festival, Brisbane Powerhouse, QAGOMA, Jan Powers Farmers Markets, Goodwill/West End, Eumundi Markets, Eat Street Northshore, Tamborine Glow Worms, Paniyiri.

One known-good hot-linkable image URL was captured during research, on the Prison Island record. Every other listing renders a generated cover, labelled as such. That ratio is a genuine finding, not laziness: most of these pages do not publish images that can be legitimately reused.
