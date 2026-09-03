export type RegionId =
  | "brisbane"
  | "goldcoast"
  | "sunshine"
  | "ipswich"
  | "scenicrim";

export const REGIONS: Array<{ id: RegionId; label: string; lat: number; lng: number }> = [
  { id: "brisbane", label: "Brisbane", lat: -27.47, lng: 153.025 },
  { id: "goldcoast", label: "Gold Coast", lat: -28.0, lng: 153.4 },
  { id: "sunshine", label: "Sunshine Coast", lat: -26.65, lng: 153.07 },
  { id: "ipswich", label: "Ipswich", lat: -27.615, lng: 152.76 },
  { id: "scenicrim", label: "Scenic Rim", lat: -27.98, lng: 152.98 },
];

/** Nearest region centre. Purely a label - it never filters anything out. */
export function regionOf(lat: number, lng: number): RegionId {
  let best = REGIONS[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const r of REGIONS) {
    const d = (r.lat - lat) ** 2 + (r.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best.id;
}

export function regionLabel(id: string): string {
  return REGIONS.find((r) => r.id === id)?.label ?? "South East Queensland";
}
