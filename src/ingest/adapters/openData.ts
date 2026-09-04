/**
 * Council and government open-data portals are the highest-signal, lowest-risk
 * feeds available. The dataset URL is configuration on the source row, so a new
 * market brings its own portal without a code change.
 */
export async function openDataAdapter(config: { datasetUrl: string }) {
  const res = await fetch(config.datasetUrl);
  if (!res.ok) throw new Error(`open data ${res.status}`);
  const rows = (await res.json()).results ?? [];
  return { rows };
}
