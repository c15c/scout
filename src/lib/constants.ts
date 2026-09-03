export const CONFIDENCE_FLOOR = 0.5;
export const BRISBANE_TIMEZONE = "Australia/Brisbane";
export const INGEST_SECRET = process.env.INGEST_SECRET;

if (!INGEST_SECRET) {
  throw new Error("INGEST_SECRET not set");
}
