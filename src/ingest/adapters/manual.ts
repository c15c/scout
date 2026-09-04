const USER_AGENT = "ScoutBot/1.0 (+https://scout.app/bot)";

/** "Paste a link" - the highest-intent input in the product. */
export async function manualAdapter(url: string) {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return { html: await res.text(), pageUrl: res.url };
}
