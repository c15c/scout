import type { Discovery, LearnedPreference, Preferences } from "./types";

/** Deterministic, inspectable scoring. No model calls in here. */

export function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, p = Math.PI / 180;
  const dLat = (bLat - aLat) * p, dLng = (bLng - aLng) * p;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 1.25; // road factor
}

export const driveMinutes = (d: number): number =>
  Math.max(5, Math.round(d <= 8 ? d * 2.6 : 21 + (d - 8) * 1.05));

/** Hard gates. Note: distance is NOT a gate. */
export function gate(d: Discovery, today = new Date()): string | null {
  const last = d.endsOn ?? d.startsOn;
  if (d.kind !== "weekly" && d.kind !== "venue" && last && new Date(last) < startOfDay(today))
    return `Finished - last ran ${last}`;
  if (!d.startsOn && d.kind === "dated") return "No date published";
  if (d.confidence < 0.5) return "Below confidence floor";
  if (!d.sourceUrl) return "No source page";
  return null;
}

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export type Scored = {
  score: number;
  why: string[];
  distanceKm: number;
  driveMin: number;
};

export function score(
  d: Discovery,
  when: Date,
  prefs: Preferences,
  learned: LearnedPreference[],
  sourceReliability = 0.8
): Scored {
  const map = new Map(learned.map((l) => [l.key, l]));
  const cat = map.get(`cat:${d.category}`);
  const interest = prefs.interests.length
    ? prefs.interests.includes(d.category) ? 1 : 0.32
    : 0.62;
  const catSignal = cat ? clamp(cat.weight, -1, 1) * cat.confidence : 0;
  const tagSignals = d.tags
    .map((t) => map.get(`tag:${t}`))
    .filter(Boolean)
    .map((l) => clamp(l!.weight, -1, 1) * l!.confidence);
  const tagAvg = tagSignals.length ? avg(tagSignals) : 0;
  const personal = clamp(interest * 0.55 + norm(catSignal) * 0.3 + norm(tagAvg) * 0.15, 0, 1);

  const dist = d.lat != null && d.lng != null ? km(prefs.homeLat, prefs.homeLng, d.lat, d.lng) : 0;
  const mins = driveMinutes(dist);
  const baseline = prefs.travelPreference === "close" ? 55 : 110;
  const travel = 1 - Math.min(1, mins / baseline) * 0.7;

  const cap = map.has("budget:tight") ? prefs.budgetPerPerson * 0.7 : prefs.budgetPerPerson;
  const price = d.priceMin ?? 0;
  const budget = price <= cap ? 1 - Math.min(0.6, (price / Math.max(1, cap)) * 0.6) : 0.25;
  const booking = d.booking === "required" ? (prefs.bookingTolerance === "avoid" ? 0.45 : 0.85) : 1;
  const practical = travel * 0.5 + budget * 0.35 + booking * 0.15;

  const daysAway = Math.max(0, Math.round((+when - +startOfDay(new Date())) / 86400000));
  const soon = 1 - Math.min(1, daysAway / 45) * 0.45;
  const quality = sourceReliability * 0.55 + d.confidence * 0.45;

  const raw = personal * 0.42 + practical * 0.26 + quality * 0.17 + soon * 0.15;

  const why: string[] = [];
  if (prefs.interests.includes(d.category)) why.push(`you picked ${d.category}`);
  if (cat && cat.weight > 0.4) why.push(`you keep saving ${cat.label}`);
  if (!price) why.push("free");
  else if (price <= cap * 0.4) why.push("well under your budget");
  if (mins <= 20) why.push(`${mins} min from ${prefs.homeLabel}`);
  else if (dist > 60) why.push(`a day trip - ${Math.round(dist)} km`);
  if (daysAway <= 2) why.push(daysAway === 0 ? "on today" : "coming up");

  return {
    score: Math.max(38, Math.min(99, Math.round(raw * 100))),
    why: why.slice(0, 3),
    distanceKm: Math.round(dist),
    driveMin: mins
  };
}

/** Keep one category from owning the top of the feed. */
export function diversify<T extends { category: string }>(rows: T[], maxRun = 2): T[] {
  const pool = [...rows], out: T[] = [];
  let last: string | null = null, run = 0;
  while (pool.length) {
    let i = 0;
    if (run >= maxRun) i = Math.max(0, pool.findIndex((r) => r.category !== last));
    const [row] = pool.splice(i, 1);
    run = row.category === last ? run + 1 : 1;
    last = row.category;
    out.push(row);
  }
  return out;
}

const clamp = (n: number, a: number, b: number): number => Math.max(a, Math.min(b, n));
const norm = (n: number): number => (n + 1) / 2;
const avg = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;

/** Feedback -> learned preferences. Pure so it can be unit tested. */
const POS: Record<string, number> = { love: 1.5, going: 1.2, save: 1, up: 1 };
const NEG: Record<string, number> = { down: -1, expensive: -0.9, far: -0.9, done: -0.4 };

export function learn(
  feedback: { type: string; discovery: Pick<Discovery, "category" | "tags"> }[]
): LearnedPreference[] {
  const acc = new Map<string, { label: string; sum: number; n: number }>();
  const bump = (key: string, label: string, w: number): void => {
    const cur = acc.get(key) ?? { label, sum: 0, n: 0 };
    acc.set(key, { label, sum: cur.sum + w, n: cur.n + 1 });
  };
  for (const f of feedback) {
    const w = POS[f.type] ?? NEG[f.type] ?? 0;
    if (!w) continue;
    bump(`cat:${f.discovery.category}`, f.discovery.category, w);
    f.discovery.tags.forEach((t) => bump(`tag:${t}`, t, w * 0.6));
    if (f.type === "expensive") bump("budget:tight", "lower prices", 1);
    if (f.type === "far") bump("travel:close", "closer to home", 1);
  }
  return [...acc.entries()]
    .map(([key, v]) => ({
      id: key,
      key,
      label: v.label,
      weight: v.sum / Math.max(1, v.n),
      evidenceCount: v.n,
      confidence: Math.min(0.95, 0.32 + v.n * 0.13)
    }))
    .sort((a, b) => Math.abs(b.weight * b.confidence) - Math.abs(a.weight * a.confidence));
}
