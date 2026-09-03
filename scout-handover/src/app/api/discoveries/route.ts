import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { diversify, gate, learn, score } from "@/lib/scoring";

/** GET /api/discoveries?horizon=14&weekdays=0,6&categories=food,market&free=1 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const horizon = Number(url.searchParams.get("horizon") ?? 14);
  const weekdays = (url.searchParams.get("weekdays") ?? "").split(",").filter(Boolean).map(Number);
  const categories = (url.searchParams.get("categories") ?? "").split(",").filter(Boolean);
  const freeOnly = url.searchParams.get("free") === "1";

  const db = await supabaseServer();
  const { data: user } = await db.auth.getUser();
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + horizon * 864e5).toISOString().slice(0, 10);

  const { data: rows } = await db
    .from("discoveries")
    .select("*, sources(name, domain, reliability)")
    .eq("status", "published")
    .or(`kind.in.(weekly,venue),and(starts_on.lte.${until},or(ends_on.gte.${today},ends_on.is.null))`);

  const [{ data: prefs }, { data: feedback }] = await Promise.all([
    db.from("user_preferences").select("*").eq("user_id", user.user?.id ?? "").maybeSingle(),
    db.from("user_feedback").select("type, discoveries(category, tags)").eq("user_id", user.user?.id ?? "")
  ]);

  const learned = learn(
    (feedback ?? []).map((f: any) => ({ type: f.type, discovery: f.discoveries }))
  );

  const preferences = {
    interests: prefs?.interests ?? [],
    excludedCategories: prefs?.excluded_categories ?? [],
    budgetPerPerson: prefs?.budget_per_person ?? 120,
    bookingTolerance: prefs?.booking_tolerance ?? "ok",
    homeLat: prefs?.home_lat ?? -27.4606,
    homeLng: prefs?.home_lng ?? 152.9997,
    homeLabel: prefs?.home_label ?? "home"
  } as const;

  const held: { title: string; reason: string; sourceUrl: string }[] = [];
  const scored = (rows ?? []).flatMap((r: any) => {
    const d = mapRow(r);
    const blocked = gate(d);
    if (blocked) { held.push({ title: d.title, reason: blocked, sourceUrl: d.sourceUrl }); return []; }
    if (categories.length && !categories.includes(d.category)) return [];
    if (freeOnly && (d.priceMin ?? 0) > 0) return [];
    const next = nextOccurrence(d, horizon, weekdays);
    if (!next) return [];
    return [{ ...d, next, ...score(d, next, preferences, learned, r.sources?.reliability ?? 0.8), source: r.sources }];
  });

  scored.sort((a, b) => b.score - a.score);
  return NextResponse.json({ results: diversify(scored), held, learned });
}

function mapRow(r: any) {
  return {
    id: r.id, title: r.title, description: r.description, category: r.category, kind: r.kind,
    startsOn: r.starts_on, endsOn: r.ends_on, weekdays: r.weekdays ?? [],
    openTime: r.open_time, closeTime: r.close_time, venueName: r.venue_name, address: r.address,
    lat: r.lat, lng: r.lng, priceMin: r.price_min, priceMax: r.price_max, priceNote: r.price_note,
    booking: r.booking, indoor: r.indoor, tags: r.tags ?? [],
    sourceId: r.source_id, sourceUrl: r.source_url, sourceVerifiedAt: r.source_verified_at,
    imageUrl: r.image_url, imageCredit: r.image_credit,
    confidence: r.confidence, status: r.status, suppressedReason: r.suppressed_reason
  } as any;
}

function nextOccurrence(d: any, horizon: number, weekdays: number[]) {
  const start = new Date();
  for (let i = 0; i <= horizon; i++) {
    const day = new Date(start.getTime() + i * 864e5);
    const iso = day.toISOString().slice(0, 10);
    const dow = day.getDay();
    if (weekdays.length && !weekdays.includes(dow)) continue;
    if (d.kind === "dated" && d.startsOn === iso) return day;
    if (d.kind === "season" && d.startsOn <= iso && (d.endsOn ?? iso) >= iso) return day;
    if ((d.kind === "weekly" || d.kind === "venue") && d.weekdays.includes(dow)) return day;
  }
  return null;
}
