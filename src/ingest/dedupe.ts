import type { ExtractedDiscovery } from "@/lib/types";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Same thing announced on three sites collapses to one row with three references. */
export function fingerprint(d: ExtractedDiscovery) {
  const when = d.kind === "weekly" ? `weekly-${d.weekdays.join("")}` : d.startsOn ?? "undated";
  return [norm(d.title), norm(d.venueName ?? ""), when].join("|");
}

export function titleSimilarity(a: string, b: string) {
  const A = new Set(norm(a).split(" ")), B = new Set(norm(b).split(" "));
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / Math.max(A.size, B.size);
}
