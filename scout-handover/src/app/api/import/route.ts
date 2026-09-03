import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabaseServer";
import { regionOf } from "@/lib/regions";

const BRISBANE = { lat: -27.4698, lng: 153.0251 };

/**
 * POST /api/import - a listing the person added themselves.
 *
 * Stored with confidence 0.4, user_submitted true and location_confirmed false.
 * Nothing is filled in on their behalf: an absent date stays absent rather than
 * becoming a guess, because a wrong date is worse than no date.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!body?.user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const lat = typeof body.lat === "number" ? body.lat : BRISBANE.lat;
  const lng = typeof body.lng === "number" ? body.lng : BRISBANE.lng;

  const row = {
    title,
    description:
      "Added by the user. Date, price and location are unverified - check the source before going.",
    category: String(body.category ?? "festival"),
    venue_name: String(body.venue_name ?? "").trim() || null,
    address: String(body.venue_name ?? "").trim() || null,
    lat,
    lng,
    region: regionOf(lat, lng),
    location_confirmed: false,
    starts_at: /^\d{4}-\d{2}-\d{2}/.test(String(body.starts_at ?? ""))
      ? String(body.starts_at)
      : null,
    price_min: null,
    price_max: null,
    source_url: String(body.source_url ?? "").trim() || null,
    confidence: 0.4,
    user_submitted: true,
    submitted_by: body.user_id,
  };

  const db = serverClient();
  const inserted = await db.from("discoveries").insert(row).select("id").single();
  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  await db.from("saved_items").upsert(
    { user_id: body.user_id, discovery_id: inserted.data.id },
    { onConflict: "user_id,discovery_id" }
  );

  return NextResponse.json({ ok: true, id: inserted.data.id });
}
