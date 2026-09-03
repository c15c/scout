import * as cheerio from "cheerio";

/** Crawl a listing page, return the event detail URLs to extract from. */
export async function websiteAdapter(config: { listUrl: string; linkSelector: string }) {
  const res = await fetch(config.listUrl, { headers: { "user-agent": "ScoutBot/1.0 (+https://scout.app/bot)" } });
  const html = await res.text();
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $(config.linkSelector).each((_, el) => {
    const href = $(el).attr("href");
    if (href) urls.add(new URL(href, config.listUrl).toString());
  });
  return { html, pages: [...urls] };
}
