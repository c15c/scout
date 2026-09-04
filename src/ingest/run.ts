import { supabaseAdmin } from "@/lib/supabaseServer";
import { extract } from "./extract";
import { fingerprint } from "./dedupe";
import { geocode } from "./geocode";
import { websiteAdapter } from "./adapters/website";
import { rssAdapter } from "./adapters/rss";
import { openDataAdapter } from "./adapters/openData";
import { manualAdapter } from "./adapters/manual";
import { CONFIDENCE_FLOOR } from "@/lib/constants";

/**
 * One ingestion pass. Every step is logged so Settings > Agent activity can
 * show the user exactly what happened, including what was held back and why.
 *
 * Only aggregator-tier sources are crawled on a schedule. Verify-tier sources
 * (single venues) carry cadence_minutes = 0 and are fetched on demand to
 * confirm facts, never polled daily.
 */
export async function runIngestion() {
  const db = supabaseAdmin();
  const { data: sources } = await db
    .from("sources")
    .select("*")
    .eq("status", "ok")
    .gt("cadence_minutes", 0);
  const report = { sourcesChecked: 0, pagesFetched: 0, published: 0, suppressed: 0, needsReview: 0, failed: 0 };

  for (const source of sources ?? []) {
    report.sourcesChecked++;
    try {
      const pages = await pagesFor(source);
      for (const pageUrl of pages.slice(0, source.config?.maxPages ?? 40)) {
        const html = await fetchPage(pageUrl);
        report.pagesFetched++;

        // keep the raw payload so extraction can be replayed without refetching
        const hash = await sha256(html);
        await db.from("raw_source_content")
          .upsert({ source_id: source.id, url: pageUrl, content_hash: hash, payload: html },
                  { onConflict: "source_id,content_hash" });

        const result = await extract(html, pageUrl);
        if (!result.ok) { report.needsReview++; continue; }
        const d = result.data;

        if (d.confidence < CONFIDENCE_FLOOR) {
          await suppress(db, d, source.id, "Below confidence floor");
          report.suppressed++;
          continue;
        }
        const finished = isFinished(d);
        if (finished) {
          await suppress(db, d, source.id, `Finished - last ran ${finished}`);
          report.suppressed++;
          continue;
        }

        const coords = d.address ? await geocode(d.address) : null;
        const fp = fingerprint(d);

        const { data: row } = await db.from("discoveries").upsert({
          market_id: source.market_id,
          title: d.title,
          description: d.description,
          category: d.category,
          kind: d.kind,
          starts_on: d.startsOn,
          ends_on: d.endsOn,
          weekdays: d.weekdays,
          open_time: d.openTime,
          close_time: d.closeTime,
          venue_name: d.venueName,
          address: d.address,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          location_confirmed: !!coords,
          price_min: d.priceMin,
          price_max: d.priceMax,
          price_note: d.priceNote,
          booking: d.booking,
          indoor: d.indoor,
          tags: d.tags,
          source_id: source.id,
          source_url: d.sourceUrl,
          source_verified_at: new Date().toISOString(),
          image_url: d.imageUrl,
          image_credit: d.imageCredit,
          image_source_url: d.sourceUrl,
          confidence: d.confidence,
          status: "published",
          fingerprint: fp,
          updated_at: new Date().toISOString()
        }, { onConflict: "fingerprint" }).select("id").single();

        // duplicates keep every source reference rather than overwriting
        if (row) {
          await db.from("discovery_sources")
            .upsert({ discovery_id: row.id, source_id: source.id, url: d.sourceUrl });
        }
        report.published++;
      }
      await db.from("sources").update({ last_run_at: new Date().toISOString(), last_error: null }).eq("id", source.id);
    } catch (err: any) {
      report.failed++;
      // a single failing source must never break the run
      await db.from("sources")
        .update({ status: "error", last_error: String(err?.message ?? err), last_run_at: new Date().toISOString() })
        .eq("id", source.id);
    }
  }

  // anything whose last date has passed leaves the feed automatically
  await db.from("discoveries")
    .update({ status: "suppressed", suppressed_reason: "Finished" })
    .lt("ends_on", new Date().toISOString().slice(0, 10))
    .in("kind", ["dated", "season"]);

  return report;
}

async function pagesFor(source: any): Promise<string[]> {
  switch (source.kind) {
    case "website":  return (await websiteAdapter(source.config)).pages;
    case "rss":      return (await rssAdapter(source.config)).pages;
    case "open_data":return (await openDataAdapter(source.config)).rows.map((r: any) => r.url).filter(Boolean);
    case "manual":   return source.config.urls ?? [];
    default:         return [];
  }
}

async function fetchPage(url: string) {
  const { html } = await manualAdapter(url);
  return html;
}

function isFinished(d: { kind: string; startsOn: string | null; endsOn: string | null }) {
  if (d.kind === "weekly" || d.kind === "venue") return null;
  const last = d.endsOn ?? d.startsOn;
  const today = new Date().toISOString().slice(0, 10);
  return last && last < today ? last : null;
}

async function suppress(db: any, d: any, sourceId: string, reason: string) {
  await db.from("discoveries").upsert({
    title: d.title, description: d.description, category: d.category, kind: d.kind,
    starts_on: d.startsOn, ends_on: d.endsOn, source_id: sourceId, source_url: d.sourceUrl,
    confidence: d.confidence, status: "suppressed", suppressed_reason: reason,
    fingerprint: fingerprint(d)
  }, { onConflict: "fingerprint" });
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

if (process.argv[1]?.includes("run.ts")) {
  runIngestion().then((r) => { console.log(r); process.exit(0); });
}
