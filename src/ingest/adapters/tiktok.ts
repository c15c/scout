/**
 * TikTok ingestion, within the platform rules.
 *
 * Reality check:
 *  - The Research API is restricted to non-profit / academic use, so it is not
 *    available to a consumer product.
 *  - The commercial route is Login Kit + Display API: the user authorises their
 *    own account and we may read their own videos and their saved/liked list.
 *  - Everything else must be embed-based (oEmbed) or licensed from a data
 *    partner.
 *
 * So the product uses TikTok in the two places it is allowed to:
 *  1. "Connect TikTok" -> read the user's saved/liked videos, extract the venue
 *     and date from the caption, and turn the ones with real dates into plans.
 *  2. "Paste a link" -> a single video URL is resolved via oEmbed, the caption
 *     is parsed, and the card embeds the original video with creator credit.
 */
const VIDEO_LIST = "https://open.tiktokapis.com/v2/video/list/";
const OEMBED = "https://www.tiktok.com/oembed";

export async function tiktokLikedVideos(accessToken: string) {
  const fields = "?fields=id,title,video_description,share_url,create_time";
  const res = await fetch(VIDEO_LIST + fields, {
    method: "POST",
    headers: {
      authorization: "Bearer " + accessToken,
      "content-type": "application/json"
    },
    body: JSON.stringify({ max_count: 20 })
  });
  if (!res.ok) throw new Error("tiktok " + res.status);
  const j = await res.json();
  return (j.data?.videos ?? []).map((v: any) => ({
    text: [v.title ?? "", v.video_description ?? ""].join(" ").trim(),
    permalink: v.share_url as string,
    postedAt: new Date((v.create_time ?? 0) * 1000).toISOString()
  }));
}

/** Embeds keep the video on TikTok's servers, credited to the creator. */
export async function tiktokOEmbed(url: string) {
  const res = await fetch(OEMBED + "?url=" + encodeURIComponent(url));
  return res.ok ? res.json() : null;
}
