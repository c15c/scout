import * as cheerio from "cheerio";
import { ExtractedDiscovery } from "@/lib/types";

/**
 * Extraction rules, enforced rather than suggested:
 *  - sourceUrl must be the page we fetched (deep link, not a homepage).
 *  - imageUrl must be an absolute URL that actually appears on that page.
 *  - anything the model returns that fails the schema is stored for review.
 */
const SYSTEM = `You extract event facts from a web page.
Rules:
- Copy facts only. If a field is not stated on the page, return null.
- Never guess a year. If the page shows no year, return null for dates.
- Never invent an image. Only return an image URL that appears in the page HTML.
- Prices: return the number the page states, and put any conditions in priceNote.
- Set confidence below 0.6 if dates or location are implied rather than stated.
Return JSON only, matching the provided schema.`;

const AI_ENDPOINT = "https://api.anthropic.com/v1/messages";

/** Pull candidate images straight out of the page - og:image first. */
export function sourceImages(html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  const abs = (u?: string | null) => {
    if (!u) return null;
    try { return new URL(u, pageUrl).toString(); } catch { return null; }
  };
  const candidates = [
    $('meta[property="og:image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
    ...$('script[type="application/ld+json"]')
      .toArray()
      .flatMap((el) => {
        try {
          const json = JSON.parse($(el).text());
          const img = Array.isArray(json) ? json[0]?.image : json.image;
          return [typeof img === "string" ? img : img?.url];
        } catch { return []; }
      }),
    $("article img, main img").first().attr("src")
  ];
  const urls = candidates.map(abs).filter((u): u is string => !!u);
  const credit =
    $('meta[property="og:image:alt"]').attr("content") ??
    $("figcaption").first().text().trim() ||
    null;
  return { imageUrl: urls[0] ?? null, imageCredit: credit };
}

export async function extract(html: string, pageUrl: string) {
  const $ = cheerio.load(html);
  $("script, style, nav, footer").remove();
  const text = $("body").text().replace(/\s+/g, " ").slice(0, 24000);
  const { imageUrl, imageCredit } = sourceImages(html, pageUrl);

  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.AI_API_KEY!,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "claude-sonnet-4-5",
      max_tokens: 1200,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Page URL: ${pageUrl}\nImage found on page: ${imageUrl ?? "none"}\n\n${text}`
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`extraction failed: ${res.status}`);
  const body = await res.json();
  const raw = JSON.parse(body.content[0].text);

  const parsed = ExtractedDiscovery.safeParse({
    ...raw,
    sourceUrl: pageUrl,          // never trust the model with provenance
    imageUrl,                    // never trust the model with imagery
    imageCredit
  });
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.issues, raw };
  }
  // Reject an image the page does not actually contain.
  if (parsed.data.imageUrl && !html.includes(new URL(parsed.data.imageUrl).pathname)) {
    parsed.data.imageUrl = null;
  }
  return { ok: true as const, data: parsed.data };
}
