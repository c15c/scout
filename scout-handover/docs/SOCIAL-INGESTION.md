# Instagram and TikTok ingestion

Most of the good stuff in a city is announced on Instagram and TikTok, often
nowhere else. Scout treats them as first-class sources, but both platforms are
tightly restricted, and pretending otherwise gets an app banned. This is what is
actually possible, and what Scout does.

## Instagram

Available through the Instagram API with Facebook Login (professional accounts):

| Capability | Allowed? | Notes |
| --- | --- | --- |
| Read the connected account's own media | Yes | Requires the user to connect a professional account |
| Business Discovery on another public professional account | Yes | Public fields + recent media; 200 calls x app users per hour |
| Hashtag search | Yes, capped | `ig_hashtag_search` then `top_media` / `recent_media`. **30 unique hashtags per rolling 7 days per account** |
| Location search | No | Not offered by the API |
| Keyword search | No | Not offered |
| Full archive / historical search | No | Recent media only |
| Re-hosting images | No | Use oEmbed embeds and the permalink |

`media_url` is omitted for video containing licensed audio, so cards fall back to
the embed.

**How Scout uses it**

1. User connects their account once.
2. User picks the venues and creators they already follow (or Scout proposes
   them from a small, budgeted set of local hashtags).
3. Captions from recent posts go through the same extraction + Zod validation as
   a web page. A post becomes a listing only when a real date can be read.
4. Cards embed the post via oEmbed and link to the permalink. Media is never
   copied, so attribution stays with the creator.

## TikTok

| Route | Available to a consumer app? | Notes |
| --- | --- | --- |
| Research API | No | Non-profit / academic researchers only, non-commercial |
| Commercial Content API | Only for EEA ads data | Individual approval required |
| Display API (Login Kit) | Yes | User consents; read their own videos and saved list |
| oEmbed | Yes | Embed a single video with creator credit |
| Licensed data providers | Yes, paid | Third-party APIs, from roughly USD 50/month |

**How Scout uses it**

1. "Connect TikTok" reads the user's own saved/liked videos and turns the ones
   with a readable date and venue into plans.
2. "Paste a link" resolves a single video via oEmbed, parses the caption and
   embeds the original video.

## Why this is a feature, not a limitation

The caption is the hard part, not the crawl. A video that says "this Saturday,
7pm, Fortitude Valley" is useless to a calendar until something converts it into
a real date, a real address and a real price. That conversion, plus a link back
to the post, is the product.
