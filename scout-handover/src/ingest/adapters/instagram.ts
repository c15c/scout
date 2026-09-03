/**
 * Instagram ingestion, within the platform rules.
 *
 * What is actually permitted (Instagram API with Facebook Login):
 *  - A user connects their own professional (business/creator) account.
 *  - We may read that account's media, and mentions/tags of it.
 *  - Hashtag search is available but capped at 30 unique hashtags per rolling
 *    7 days per account, so hashtags are used for discovery of *venues*, not
 *    for bulk post harvesting.
 *  - There is no location search and no keyword search. media_url is omitted
 *    for video with licensed audio.
 *
 * What we therefore do:
 *  1. The user connects their account (OAuth) and picks venues/creators they
 *     already follow. We store handles, not scraped feeds.
 *  2. For each handle we resolve the business account via Business Discovery
 *     and read recent media captions.
 *  3. Captions go through the same extraction + validation pipeline as web
 *     pages. A post only becomes a listing when a real date can be read.
 *  4. We never re-host media. The card embeds the post via oEmbed and links to
 *     the permalink, so attribution stays with the creator.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

export async function instagramRecentMedia(opts: {
  igUserId: string;      // the connected professional account
  handle: string;        // the venue/creator to inspect
  token: string;
}) {
  const fields =
    `business_discovery.username(${opts.handle}){followers_count,media.limit(12){caption,permalink,timestamp,media_type}}`;
  const res = await fetch(`${GRAPH}/${opts.igUserId}?fields=${encodeURIComponent(fields)}&access_token=${opts.token}`);
  if (!res.ok) throw new Error(`instagram ${res.status}`);
  const j = await res.json();
  const media = j.business_discovery?.media?.data ?? [];
  return media.map((m: any) => ({
    text: m.caption ?? "",
    permalink: m.permalink as string,
    postedAt: m.timestamp as string,
    kind: m.media_type as string
  }));
}

/** Embeds keep the image on Instagram's servers, credited to the creator. */
export async function instagramOEmbed(permalink: string, appToken: string) {
  const res = await fetch(
    `${GRAPH}/instagram_oembed?url=${encodeURIComponent(permalink)}&omitscript=true&access_token=${appToken}`
  );
  return res.ok ? res.json() : null;
}

/** Hashtag search: 30 unique tags / 7 days. Use it to find venues, not posts. */
export async function instagramHashtagRecent(igUserId: string, hashtag: string, token: string) {
  const idRes = await fetch(
    `${GRAPH}/ig_hashtag_search?user_id=${igUserId}&q=${encodeURIComponent(hashtag)}&access_token=${token}`
  );
  const id = (await idRes.json()).data?.[0]?.id;
  if (!id) return [];
  const res = await fetch(
    `${GRAPH}/${id}/recent_media?user_id=${igUserId}&fields=caption,permalink,timestamp&access_token=${token}`
  );
  return (await res.json()).data ?? [];
}
