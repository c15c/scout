import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabaseServer";

/** GET /api/saved - the person's list, soonest first. */
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const db = serverClient();
  const { data, error } = await db
    .from("saved_items")
    .select("discovery_id, created_at, discoveries(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

/** POST /api/saved - save one discovery. */
export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.user_id || !body?.discovery_id) {
    return NextResponse.json({ error: "user_id and discovery_id required" }, { status: 400 });
  }
  const db = serverClient();
  const { error } = await db
    .from("saved_items")
    .upsert(
      { user_id: body.user_id, discovery_id: body.discovery_id },
      { onConflict: "user_id,discovery_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/saved?user_id=..&discovery_id=.. */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  const discoveryId = url.searchParams.get("discovery_id");
  if (!userId || !discoveryId) {
    return NextResponse.json({ error: "user_id and discovery_id required" }, { status: 400 });
  }
  const db = serverClient();
  const { error } = await db
    .from("saved_items")
    .delete()
    .eq("user_id", userId)
    .eq("discovery_id", discoveryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
