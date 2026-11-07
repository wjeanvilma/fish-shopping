/**
 * Phase 11 (post-1.0) — frozen listing copy from `shared/store/listing-copy.json`.
 */
import listingCopyJson from "../../../shared/store/listing-copy.json";

export interface ListingCopyCatalog {
  phase: number;
  schema: string;
  frozen: boolean;
  defaultLocale: string;
  locales: string[];
  playLimits: {
    titleMax: number;
    shortDescriptionMax: number;
    fullDescriptionMax: number;
    whatsNewMax: number;
  };
  copy: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    whatsNew: string;
    whatsNewVersion: string;
  };
  webLanding: {
    title: string;
    tagline: string;
    description: string;
    ctaPlay: string;
    ctaPrivacy: string;
    ctaSupport: string;
  };
  keywords: string[];
  category: string;
  contentRating: string;
  androidStrings: string;
}

export const listingCopy = listingCopyJson as unknown as ListingCopyCatalog;
export const LISTING_COPY_PHASE = listingCopy.phase;
export const LISTING_COPY_SCHEMA = listingCopy.schema;

export function withinPlayLimits(
  title = listingCopy.copy.title,
  short = listingCopy.copy.shortDescription,
  full = listingCopy.copy.fullDescription,
  whatsNew = listingCopy.copy.whatsNew,
): boolean {
  const lim = listingCopy.playLimits;
  return (
    title.length > 0 &&
    title.length <= lim.titleMax &&
    short.length > 0 &&
    short.length <= lim.shortDescriptionMax &&
    full.length > 0 &&
    full.length <= lim.fullDescriptionMax &&
    whatsNew.length > 0 &&
    whatsNew.length <= lim.whatsNewMax
  );
}
