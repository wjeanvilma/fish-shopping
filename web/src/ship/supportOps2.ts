/**
 * Finish 2.0 Phase 28 — Support/ops 2.0 ship catalog
 * (mirrors shared/ship/support-ops-2.0.json).
 */
import catalogJson from "../../../shared/ship/support-ops-2.0.json";

export interface SupportOps2ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  supportOps2Marker: string;
  opsCatalog: string;
  extendsRunbook: string;
  featureFaqMin: number;
  refundMatrixRowMin: number;
  knownIssue2Min: number;
  supportHtmlSectionMin: number;
  parityFixture: string;
  validateScript: string;
}

export const SUPPORT_OPS_2_SHIP = catalogJson as unknown as SupportOps2ShipCatalog;
export const SUPPORT_OPS_2_SHIP_PHASE = SUPPORT_OPS_2_SHIP.phase;
export const SUPPORT_OPS_2_SHIP_SCHEMA = SUPPORT_OPS_2_SHIP.schema;
export const SUPPORT_OPS_2_SHIP_MARKER = SUPPORT_OPS_2_SHIP.supportOps2Marker;
export const FEATURE_FAQ_FLOOR = SUPPORT_OPS_2_SHIP.featureFaqMin;
export const REFUND_MATRIX_FLOOR = SUPPORT_OPS_2_SHIP.refundMatrixRowMin;
export const KNOWN_ISSUE_2_FLOOR = SUPPORT_OPS_2_SHIP.knownIssue2Min;
export const SUPPORT_HTML_SECTION_FLOOR = SUPPORT_OPS_2_SHIP.supportHtmlSectionMin;
