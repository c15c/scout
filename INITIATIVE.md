# Scout — Product Initiative

**Status:** Ready for build · **Owner:** Cisco · **Last updated:** 5 Sep 2026

**How to use this:** keep this initiative in context at all times, then work one epic at a
time, in order. Each epic is independently shippable and has acceptance criteria — don't start
the next one until the current one's criteria pass. This document sits above `HANDOVER.md`
(state of the code) and `AGENTS.md` (rules for AI assistants).

---

# Initiative: Scout — a proactive local discovery agent

## Problem

Finding good things to do is fragmented across Instagram, TikTok, local publications, event
sites, venue pages, newsletters and word of mouth — and the information disappears fast. People
near any major city end up defaulting to the same three things, not because nothing is on, but
because nobody has time to do the research.

## Vision

Scout watches the places where events are announced, extracts real dates, prices and locations,
learns what a person likes from how they react, and shows a small number of things genuinely
worth doing — each one explained, each one linking back to the page the facts came from.

The feeling that defines success: *"Scout knows what I like, keeps an eye on what's happening
nearby, and finds things worth doing for me."*

Scout is **not** an events directory, a booking marketplace, a social network, a calendar app,
or a chatbot.

## Target user

Adults and couples living near a major city, with disposable income and limited research time,
who prefer interesting, local and unusual over tourist-generic. First market: South East
Queensland. The product must not know or care that this is the first market.

## Strategic requirement: location-agnostic by design

Everything geographic is data, not code:

- A **market** is a database entity: name, timezone, currency, locale, default centre, and a set
  of **regions** (e.g. SEQ = Brisbane, Gold Coast, Sunshine Coast, Ipswich, Scenic Rim).
- **Sources belong to markets.** Launching a new city means inserting rows: one market, its
  regions, and 8–15 aggregator sources. Zero code changes.
- No hardcoded city names, coordinates, timezones or currencies anywhere in application code.
  `Australia/Brisbane`, `AUD` and SEQ coordinates may only appear in seed data.
- Users belong to a market and set a home location within it; all distances, times and prices
  render in the market's locale.

## Success metrics

- **Trust:** zero fabricated facts surfaced to users; every listing links to its source page;
  % of listings with confirmed date + location > 95%.
- **Relevance:** ≥ 40% of feed impressions get a reaction within 4 weeks of signup; "Not for me"
  rate declining week over week per user.
- **Action:** ≥ 20% of weekly active users save an item or export to calendar each week.
- **Scale-readiness:** a second market can be launched by one person in one day using only the
  admin/seed path.

## Product guardrails (non-negotiable, apply to every epic)

1. **Never invent data.** Every listing traces to a fetched page. Unknown renders as unknown:
   "Price on source", "Address not confirmed". A wrong date is worse than no date.
2. **No travel-distance cap.** Distance softens ranking; it never hides a listing.
3. **Aggregator-first crawling.** Scheduled fetching only for pages that list many events
   (council feeds, open data, tourism sites, ticketing platforms, city guides). Individual venue
   pages are fetched on demand only, to verify a specific listing.
4. **Images from the source or clearly generated.** Hot-link only what the source published;
   otherwise show a generated cover labelled as generated. Never stock photos, never AI-generated
   photo-lookalikes.
5. **Upcoming only, suppression inspectable.** Expired, duplicate, low-confidence and rejected
   items are held back — and the user can see what was held back and why.
6. **The user picks the days.** No scheduled "Friday mode", no auto-generated weekend itineraries.
7. **Deterministic, inspectable ranking.** AI is used for extraction, one-line explanations and
   parsing pasted links — never inside the ranking path.
8. **Transparent preference model.** Every learned preference is visible, shows its evidence, and
   can be individually forgotten.
9. **App, not marketing site.** No landing page. Onboarding once, up front, skippable. Profile and
   settings top-right, standard SaaS.

## Non-goals

Social profiles/network · reviews · messaging · payments or booking flows · native mobile apps
(responsive web first) · subscriptions · a large public directory · gamification ·
general-purpose AI chat.

---

# Epics

Build in this order. Each epic lists its goal, key stories, and acceptance criteria.

## E1 — Foundation: auth, accounts, market model

**Goal:** a running Next.js + Supabase app with real authentication and the location-agnostic
data model at its core.

**Stories**

- As a new user, I sign up and sign in with Supabase Auth (email + OAuth).
- As a user, I belong to a market and have a home location within it.
- As an operator, I can create a market with its regions, timezone, currency and locale purely
  through data.

**Acceptance criteria**

- `markets` and `regions` tables exist; every user, source and discovery references a market.
- RLS enforced via `auth.uid()` on all per-user tables; no route accepts a `user_id` parameter.
- No city name, coordinate, timezone or currency literal in application code (CI grep check).
  SEQ exists only in `seed.sql`.
- Timestamps stored in UTC; rendered in the market's timezone.

## E2 — Onboarding & taste calibration

**Goal:** a first-run experience that produces a warm feed, not a cold one.

**Stories**

- As a new user, I set home location, pick interests, budget and booking tolerance in under 2
  minutes — every step skippable with sensible defaults.
- As a new user, I react to ~8 real listings (one per category, drawn from my market) before
  seeing the feed: Love it / Interested / Not for me / Skip.

**Acceptance criteria**

- Calibration reactions are stored separately (`calibration_answers`) and feed the preference
  model immediately.
- The first feed a user sees is already personalised by their calibration answers.
- Distance is asked as a *preference* ("close to home" vs "distance doesn't bother me"), never as
  a cap.

## E3 — Ingestion platform: source registry & pipeline

**Goal:** the scheduled pipeline that turns aggregator pages into candidate listings, per market.

**Stories**

- As an operator, I register sources with a tier (`aggregator` / `verify` / `social` / `manual`),
  market, region, cadence and adapter type (website / RSS / open data / manual).
- As the system, I fetch scheduled sources on cadence, store raw content, extract structured
  candidates, geocode, normalise dates and recurrence, dedupe, and publish or suppress.

**Acceptance criteria**

- Only `aggregator`/`social`/`manual` tiers are ever scheduled; `verify` sources are fetched
  solely by an on-demand `verifyListing()` call.
- Recurrence handled as first-class: one-off dates, weekly patterns, and date-range seasons, with
  an `occurrences()` function used everywhere (expiry, sorting, export).
- Dedupe merges listings across sources while preserving *every* source reference.
- Extraction output is schema-validated; candidates below the confidence floor (0.5) are
  suppressed with a reason, not published.
- Pipeline failures on one source never block other sources; retries with backoff; per-source
  health status recorded.
- Adding a new market's sources requires only database rows.

## E4 — Discovery feed & detail

**Goal:** the core browsing experience — a ranked, explained, filterable feed of what's on.

**Stories**

- As a user, I see a ranked feed of upcoming things with image/cover, category, region, date,
  venue, price, match %, and a one-line reason.
- As a user, I filter by region, day of week, interest, and free-only; I sort by match, soonest,
  closest or cheapest; I can extend the horizon (e.g. 2 → 6 weeks).
- As a user, I open a detail view: full description, next occurrences, facts quoted from the
  source, why it matched, travel estimate, booking expectation, similar items, and a link to the
  exact source page.

**Acceptance criteria**

- Ranking = weighted blend of personal fit, practicality, source quality and soonness;
  deterministic; diversity rule prevents >2 consecutive same-category items.
- Distance affects score only — verified by test: a high-match item 3 hours away still appears.
- Every card and detail view links to the specific page the facts came from (not a homepage).
- Null price renders "Price on source"; unconfirmed address renders a warning; generated covers
  are labelled.
- Feed shows only future occurrences, computed against the market's timezone.

## E5 — Feedback & learned preferences

**Goal:** the learning loop that makes week 4 better than week 1, with full transparency.

**Stories**

- As a user, I react from card or detail: Save / Interested / Not for me / Too expensive / Too far
  / Already done — and after attending: Went, Loved it, OK, Didn't like it.
- As a user, I can open Settings → "What Scout learned" and see every inference with its
  confidence and evidence count, and forget any of them.
- As a user, I can see what was held back from my feed and why.

**Acceptance criteria**

- Learned preferences derive from feedback with confidence growing on evidence; negative signals
  downweight without hard-blocking (except repeated explicit rejection of the same item).
- Forgetting an inference immediately changes the feed.
- Ranking remains explainable: each score can be decomposed into its terms in a debug view.

## E6 — My List & calendar export

**Goal:** the "I'm actually going" surface — the user's own shortlist, on their own days.

**Stories**

- As a user, I save items to My List, grouped by soonness (next 48h / this week / further out /
  on regularly).
- As a user, I export one item or the whole list as `.ics` and it imports cleanly into
  Google/Apple/Outlook calendars.
- As a user, I add something I saw elsewhere (title, venue, date, link) and it lives in my list,
  clearly marked as added-by-me and unverified.

**Acceptance criteria**

- `.ics` output validates and round-trips into major calendar clients; event description includes
  the source URL.
- User-submitted items get confidence 0.4, `user_submitted = true`, never masquerade as ingested
  listings, and never enter other users' feeds.
- No weekend-plan or itinerary objects anywhere in the schema.

## E7 — Sources transparency & social ingestion

**Goal:** show users exactly where information comes from, and ingest from social within what
platform APIs genuinely allow.

**Stories**

- As a user, I can see every source Scout watches in my market — tier, cadence, last checked,
  health — plus counts from the last run (checked / fetched / candidates / published / held back).
- As a user, I paste any link and Scout reads that one page, matches it to an existing listing or
  queues it for review.
- As a user, I connect Instagram/TikTok through an honest flow that states what the APIs can and
  cannot read before asking for OAuth.

**Acceptance criteria**

- Instagram: hashtag-based ingestion within documented limits (30 unique hashtags per rolling 7
  days); no promise of a "following feed".
- TikTok: oEmbed/paste-a-link path working; API paths clearly scoped to what's licensed.
- Social-derived candidates carry source attribution and go through the same extraction/confidence
  pipeline; captions are treated as untrusted input.
- Paste-a-link never triggers a crawl beyond the pasted page.

## E8 — Notifications (restrained)

**Goal:** timely nudges that respect attention — utility, not engagement mechanics.

**Stories**

- As a user, I opt into: high-match new discovery alerts, and "something you saved starts soon"
  reminders.
- As a user, I set quiet hours and frequency caps; defaults are conservative.

**Acceptance criteria**

- Notifications only fire for high-confidence, high-match, still-available items; all deep-link to
  detail.
- Hard frequency cap enforced server-side; zero notifications without explicit opt-in.

## E9 — Operations, observability & second-market readiness

**Goal:** prove the scale story: run it reliably, then launch market #2 with data only.

**Stories**

- As an operator, I see per-source metrics (fetch success, extraction yield, dedupe rate,
  suppression reasons) and per-market funnel metrics (candidates → published → impressions →
  reactions → saves).
- As an operator, I launch a new market end to end — market row, regions, sources, calibration set
  — without a deploy.

**Acceptance criteria**

- Structured logs and a metrics dashboard for the pipeline; alerting on source failure and
  extraction-yield collapse.
- Rate limiting on public APIs; all AI and service keys server-side only.
- A documented "new market playbook" executed once as a dry run (any non-SEQ city), proving zero
  code changes were needed.

---

## Out of scope for this initiative (future candidates)

Couple/household profiles (schema allows it) · weather-aware ranking · booking integrations ·
native apps · newsletter ingestion at scale · multi-language markets.

## Sequencing note

E1–E4 constitute the MVP and must land in order. E5 and E6 can proceed in parallel after E4.
E7–E9 follow. Within any epic, prefer vertical slices (one working story end-to-end) over
horizontal layers. The frozen prototype (`scout-handover/prototype/scout.html`) is the accepted
UX reference for E2, E4, E5 and E6 — port its behaviour and design language rather than
redesigning it.
