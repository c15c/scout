import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabaseServer";

/**
 * GET /api/profile?user_id=..
 *
 * Returns explicit preferences plus everything Scout has inferred, with the
 * evidence count behind each inference. The inferred list is returned to the
 * client on purpose: a person can only correct a preference model they are
 * allowed to see.
 *
 * Note there is no max travel time here, by design. Distance softens a score;
 * it never removes a listing from the feed.
 */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const db = serverClient();
  const [prefs, learned, counts] = await Promise.all([
    db.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    db
      .from("learned_preferences")
      .select("key, value, confidence, evidence_count, updated_at, origin")
      .eq("user_id", userId)
      .order("confidence", { ascending: false }),
    db
      .from("user_feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (prefs.error) {
    return NextResponse.json({ error: prefs.error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferences: prefs.data ?? null,
    learned: learned.data ?? [],
    reactionCount: counts.count ?? 0,
  });
}

/** PATCH /api/profile - update explicit preferences. */
export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body?.user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const allowed = [
    "home_label",
    "home_lat",
    "home_lng",
    "interests",
    "budget_per_outing",
    "booking_tolerance",
    "travel_preference",
    "preferred_days",
    "indoor_outdoor",
    "novelty_preference",
    "accessibility_notes",
  ];

  const patch: Record<string, unknown> = { user_id: body.user_id };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const db = serverClient();
  const { error } = await db
    .from("user_preferences")
    .upsert(patch, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/profile?user_id=..&key=..
 *
 * Forgets one inferred preference. Called by the "Forget" control in settings.
 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  const key = url.searchParams.get("key");
  if (!userId || !key) {
    return NextResponse.json({ error: "user_id and key required" }, { status: 400 });
  }

  const db = serverClient();
  const { error } = await db
    .from("learned_preferences")
    .delete()
    .eq("user_id", userId)
    .eq("key", key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
