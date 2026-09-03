import Parser from "rss-parser";

export async function rssAdapter(config: { feedUrl: string }) {
  const feed = await new Parser().parseURL(config.feedUrl);
  return {
    pages: (feed.items ?? []).map((i) => i.link!).filter(Boolean),
    items: feed.items
  };
}
