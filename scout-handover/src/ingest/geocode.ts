const MAPBOX = "https://api.mapbox.com/geocoding/v5/mapbox.places/";

export async function geocode(address: string) {
  const url =
    MAPBOX +
    encodeURIComponent(address) +
    ".json?limit=1&access_token=" +
    process.env.MAPBOX_TOKEN;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const c = j.features?.[0]?.center;
  return c ? { lng: c[0] as number, lat: c[1] as number } : null;
}
