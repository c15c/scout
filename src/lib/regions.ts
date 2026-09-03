import type { Region } from "./types";

/** SEQ regions. Nearest-centre labelling only, never a filter. */
export const SEQ_REGIONS: Region[] = [
  {
    id: "region-brisbane",
    marketId: "market-seq",
    slug: "brisbane",
    label: "Brisbane",
    lat: -27.4704,
    lng: 153.0235
  },
  {
    id: "region-gold-coast",
    marketId: "market-seq",
    slug: "gold-coast",
    label: "Gold Coast",
    lat: -28.0045,
    lng: 153.4315
  },
  {
    id: "region-sunshine-coast",
    marketId: "market-seq",
    slug: "sunshine-coast",
    label: "Sunshine Coast",
    lat: -26.7985,
    lng: 153.1154
  },
  {
    id: "region-ipswich",
    marketId: "market-seq",
    slug: "ipswich",
    label: "Ipswich",
    lat: -27.6261,
    lng: 152.7676
  },
  {
    id: "region-scenic-rim",
    marketId: "market-seq",
    slug: "scenic-rim",
    label: "Scenic Rim",
    lat: -27.8000,
    lng: 152.8500
  }
];

/** Nearest region by straight-line distance. */
export function nearestRegion(lat: number, lng: number): Region {
  let nearest = SEQ_REGIONS[0];
  let minDist = Math.hypot(lat - nearest.lat, lng - nearest.lng);
  for (const r of SEQ_REGIONS) {
    const dist = Math.hypot(lat - r.lat, lng - r.lng);
    if (dist < minDist) {
      nearest = r;
      minDist = dist;
    }
  }
  return nearest;
}
