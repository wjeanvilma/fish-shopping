/**
 * Phase 29 — store listing + legal URLs mirrored from `shared/store/listing.json`.
 * Hosts surface Privacy / Support; Play Console + landing pages consume the same copy.
 */
import listingJson from "../../../shared/store/listing.json";

export interface ScreenshotShot {
  id: string;
  title: string;
  orientation: "portrait" | "landscape" | string;
  aspect: string;
  capture: string;
  storyboard?: string;
}

export interface StoreListing {
  phase: number;
  schema: string;
  appName: string;
  packageName: string;
  shortDescription: string;
  fullDescription: string;
  keywords: string[];
  category: string;
  contentRating: string;
  supportUrl: string;
  privacyPolicyUrl: string;
  landingUrl?: string;
  canonicalHost: string;
  supportRunbookPhase?: number;
  supportRunbookCatalog?: string;
  legalPagesPhase?: number;
  legalPagesCatalog?: string;
  dataSafetyPhase?: number;
  dataSafetyCatalog?: string;
  screenshotCapturePhase?: number;
  screenshotCaptureCatalog?: string;
  screenshotCapturesDir?: string;
  iconPackPhase?: number;
  iconPackCatalog?: string;
  listingCopyPhase?: number;
  listingCopyCatalog?: string;
  listingCopyFrozen?: boolean;
  licensesUiPhase?: number;
  closedTestingPhase?: number;
  closedTestingCatalog?: string;
  publicShipPhase?: number;
  publicShipCatalog?: string;
  publicShipReleaseTag?: string;
  hotfixLanePhase?: number;
  hotfixLaneCatalog?: string;
  dodCloseoutPhase?: number;
  dodCloseoutCatalog?: string;
  completeTag?: string;
  defaultLocale?: string;
  locales?: string[];
  whatsNew?: string;
  whatsNewVersion?: string;
  playListing: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    category: string;
    contentRating: string;
    featureGraphic: string;
    iconNotes: string;
  };
  webLanding: {
    title: string;
    tagline: string;
    description: string;
    ctaPlay: string;
    ctaPrivacy: string;
    ctaSupport: string;
  };
  screenshotShots: ScreenshotShot[];
  assets: Record<string, string>;
  licensesPath: string;
}

export const storeListing = listingJson as unknown as StoreListing;

export const SUPPORT_URL = storeListing.supportUrl;
export const PRIVACY_POLICY_URL = storeListing.privacyPolicyUrl;
export const LANDING_URL = storeListing.landingUrl ?? `${storeListing.canonicalHost}/`;
export const STORE_APP_NAME = storeListing.appName;
export const STORE_SHORT_DESCRIPTION = storeListing.shortDescription;
export const WEB_LANDING = storeListing.webLanding;
export const LEGAL_PAGES_PHASE = storeListing.legalPagesPhase ?? 7;

/** Relative legal pages shipped in `web/public/` (GitHub Pages–safe). */
export const PRIVACY_PAGE_PATH = "privacy.html";
export const SUPPORT_PAGE_PATH = "support.html";
export const LANDING_PAGE_PATH = "landing.html";

export function isHttpsAbsoluteUrl(url: string): boolean {
  return /^https:\/\/[^\s]+$/i.test(url.trim());
}
