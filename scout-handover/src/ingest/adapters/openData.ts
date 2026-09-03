/**
 * Council and government open-data portals are the highest-signal, lowest-risk
 * feeds available. Example: Brisbane City Council publishes venue programs as
 * CSV/JSON on data.brisbane.qld.gov.au.
 */
export async function openDataAdapter(config: { datasetUrl: string }) {
  const res = await fetch(config.datasetUrl);
  if (!res.ok) throw new Error(`open data ${res.status}`);
  const rows = (await res.json()).results ?? [];
  return { rows };
}
