import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { discoveryId, type } = await req.json();
  const db = await supabaseServer();
  const { data: user } = await db.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { error } = await db.from("user_feedback")
    .insert({ user_id: user.user.id, discovery_id: discoveryId, type });
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ ok: true });
}
