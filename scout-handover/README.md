# Scout

A personal discovery agent for your city. Scout watches the pages that list many
things at once - council event feeds and open data, regional tourism sites,
ticketing platforms, city guides, and Instagram and TikTok once connected -
extracts real dates, prices and locations,
then ranks what is on against your taste. Every listing links back to the page
it came from and every image comes from that page.

Built with Next.js (App Router) + TypeScript + Tailwind + Supabase.

## Principles

1. **Never invent a fact.** Titles, dates, prices, addresses and images are only
   ever copied from a source page. If a field is missing, it stays empty and the
   listing is marked as needing review.
2. **Always cite.** Each discovery stores the deep URL of the page it was read
   from, plus the timestamp it was verified.
3. **No stock photos.** Images come from the source page (`og:image`,
   `twitter:image` or JSON-LD `image`), stored with credit. If a source has no
   image, the UI renders a typographic tile.
4. **Suppress aggressively.** Finished, sold out, undated, duplicated,
   low-confidence and sponsored items are held back and logged with a reason the
   user can inspect.
5. **No hard travel cap.** Distance nudges ranking, it never filters.

## Quick start

```bash
git clone https://github.com/<you>/scout && cd scout
cp .env.example .env.local        # fill in Supabase + AI keys
npm install
npm run db:push                   # applies supabase/schema.sql
npm run ingest                    # one ingestion pass
npm run dev                       # http://localhost:3000
```

### Supabase setup

1. Create a project at supabase.com.
2. Run `supabase/schema.sql` in the SQL editor (tables, indexes, RLS policies).
3. Optionally run `supabase/seed.sql` for the verified Brisbane starter set.
4. Copy the project URL, anon key and service-role key into `.env.local`.

### Deploy

- Push to GitHub, import the repo into Vercel, paste the same env vars.
- `vercel.json` registers a cron that hits `/api/ingest` every 3 hours.
- `.github/workflows/ingest.yml` is an alternative scheduler if you self-host.

## Architecture

```
sources -> adapters -> raw_source_content -> extract (LLM + schema validation)
        -> geocode -> dedupe -> quality gate -> discoveries
        -> scoring (deterministic) -> feed -> feedback -> learned_preferences
```

- `src/ingest/adapters/*` one file per source type. Adding a source type means
  adding one adapter; nothing else changes.
- `src/ingest/extract.ts` LLM extraction constrained by a Zod schema. Anything
  that fails validation is stored for review, never published.
- `src/lib/scoring.ts` pure functions, unit-testable, no model calls.
- `src/app/api/*` REST endpoints used by the app and by external clients.

## Docs

- `docs/SOCIAL-INGESTION.md` - how Instagram and TikTok ingestion works and what
  the platform rules actually allow.
- `docs/MASS-ADOPTION.md` - the product bet and the growth loops.

## Licence

MIT.
