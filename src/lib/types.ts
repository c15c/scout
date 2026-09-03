import { z } from "zod";

export const Category = z.enum([
  "music", "arts", "food", "market", "theatre", "nature", "festival", "daytrip", "family"
]);
export type CategoryType = z.infer<typeof Category>;

/** The only shape allowed out of extraction. Anything else is stored for review. */
export const ExtractedDiscovery = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: Category,
  kind: z.enum(["dated", "weekly", "season", "venue"]),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  venueName: z.string().nullable(),
  address: z.string().nullable(),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  priceNote: z.string().nullable(),
  booking: z.enum(["none", "recommended", "required"]),
  indoor: z.boolean().nullable(),
  tags: z.array(z.string()).max(8).default([]),
  sourceUrl: z.string().url(),
  imageUrl: z.string().url().nullable(),
  imageCredit: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});
export type ExtractedDiscovery = z.infer<typeof ExtractedDiscovery>;

export type Discovery = ExtractedDiscovery & {
  id: string;
  lat: number | null;
  lng: number | null;
  sourceId: string;
  sourceVerifiedAt: string;
  status: "published" | "needs_review" | "suppressed";
  suppressedReason: string | null;
  marketId: string;
  regionId: string | null;
  userSubmitted: boolean;
  submittedBy: string | null;
};

export type Preferences = {
  interests: string[];
  excludedCategories: string[];
  budgetPerPerson: number;
  bookingTolerance: "ok" | "avoid";
  travelPreference: "close" | "any";
  homeLat: number;
  homeLng: number;
  homeLabel: string;
};

export type LearnedPreference = {
  id: string;
  key: string;
  label: string;
  weight: number;
  confidence: number;
  evidenceCount: number;
};

export type Profile = {
  id: string;
  displayName: string | null;
  email: string | null;
  marketId: string;
  homeLabel: string | null;
  homeLat: number | null;
  homeLng: number | null;
  onboardedAt: string | null;
  createdAt: string;
};

export type Market = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  locale: string;
  defaultLat: number;
  defaultLng: number;
  createdAt: string;
};

export type Region = {
  id: string;
  marketId: string;
  slug: string;
  label: string;
  lat: number;
  lng: number;
};
