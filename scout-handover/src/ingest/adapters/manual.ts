/** "Paste a link" - the highest-intent input in the product. */
export async function manualAdapter(url: string) {
  const res = await fetch(url, { headers: { "user-agent": "ScoutBot/1.0 (+https://scout.app/bot)" } });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return { html: await res.text(), pageUrl: res.url };
}
