export const CONFIDENCE_FLOOR = 0.5;

// No geography in code. Timezone, currency and locale live on the market row
// in the database (markets.timezone etc.) - read them from there, never from
// a constant. This is a hard rule from the initiative (E1 acceptance check).

// Lazy accessor: a missing env var must fail the ingest request, not crash
// every route at import time.
export function ingestSecret(): string {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    throw new Error("INGEST_SECRET not set");
  }
  return secret;
}
