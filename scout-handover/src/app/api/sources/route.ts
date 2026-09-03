import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const db = await supabaseServer();
  const { data } = await db.from("sources")
    .select("id, name, domain, kind, status, reliability, cadence_minutes, last_run_at, last_error")
    .order("name");
  return NextResponse.json({ sources: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = await supabaseServer();
  const { data: user } = await db.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { error } = await db.from("sources").insert({
    owner_id: user.user.id, name: body.name, domain: body.domain,
    kind: body.kind, config: body.config ?? {}
  });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
