import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabaseServer";
import { manualAdapter } from "@/ingest/adapters/manual";
import { extract } from "@/ingest/extract";
import { fingerprint } from "@/ingest/dedupe";
import { tiktokOEmbed } from "@/ingest/adapters/tiktok";

/**
 * "Paste a link" - a venue page, a ticketing page, an Instagram post or a
 * TikTok video. Social links resolve through oEmbed so the media stays on the
 * original platform with creator credit; the caption goes through the same
 * extraction and validation path as any web page.
 */
export async function POST(req: Request) {
  const { url } = await req.json();
  const db = await supabaseServer();
  const { data: user } = await db.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const host = new URL(url).hostname.replace("www.", "");
  let html: string, pageUrl = url;

  if (host.endsWith("tiktok.com")) {
    const embed = await tiktokOEmbed(url);
    if (!embed) return NextResponse.json({ error: "could not read that video" }, { status: 422 });
    html = `<html><body><h1>${embed.title ?? ""}</h1><p>by ${embed.author_name ?? ""}</p></body></html>`;
  } else {
    const fetched = await manualAdapter(url);
    html = fetched.html;
    pageUrl = fetched.pageUrl;
  }

  const result = await extract(html, pageUrl);
  if (!result.ok) return NextResponse.json({ error: "no usable date on that page", issues: result.issues }, { status: 422 });

  const admin = supabaseAdmin();
  const { data } = await admin.from("discoveries").upsert({
    title: result.data.title, description: result.data.description, category: result.data.category,
    kind: result.data.kind, starts_on: result.data.startsOn, ends_on: result.data.endsOn,
    weekdays: result.data.weekdays, venue_name: result.data.venueName, address: result.data.address,
    price_min: result.data.priceMin, price_max: result.data.priceMax, booking: result.data.booking,
    tags: result.data.tags, source_url: pageUrl, source_verified_at: new Date().toISOString(),
    image_url: result.data.imageUrl, image_credit: result.data.imageCredit,
    confidence: result.data.confidence, status: "published", fingerprint: fingerprint(result.data)
  }, { onConflict: "fingerprint" }).select("id").single();

  return NextResponse.json({ ok: true, discoveryId: data?.id });
}
