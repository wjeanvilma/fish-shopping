/**
 * Finish 2.0 Phase 19 — harbor art pass catalog
 * (mirrors shared/ship/harbor-art-pass.json).
 */
import catalogJson from "../../../shared/ship/harbor-art-pass.json";

export interface HarborArtAuthoredEntry {
  harborId: string;
  theme: string;
  asset: string;
}

export interface HarborArtPassShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  authoredHarborMin: number;
  harborArtMarker: string;
  maxBytesPerHarbor: number;
  maxTotalAuthoredBytes: number;
  authoredHarbors: HarborArtAuthoredEntry[];
  allBlockoutAssets: string[];
  parityFixture: string;
  validateScript: string;
}

export const HARBOR_ART_PASS = catalogJson as unknown as HarborArtPassShipCatalog;
export const HARBOR_ART_PHASE = HARBOR_ART_PASS.phase;
export const HARBOR_ART_SCHEMA = HARBOR_ART_PASS.schema;
export const HARBOR_ART_MARKER = HARBOR_ART_PASS.harborArtMarker;
export const AUTHORED_HARBOR_FLOOR = HARBOR_ART_PASS.authoredHarborMin;
