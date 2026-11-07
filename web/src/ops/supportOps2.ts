/**
 * Finish 2.0 Phase 28 — Support/ops 2.0 catalog
 * (mirrors shared/ops/support-ops-2.0.json).
 */
import ops2Json from "../../../shared/ops/support-ops-2.0.json";

export interface SupportOps2FeatureFaq {
  id: string;
  title: string;
  body: string;
}

export interface SupportOps2RefundRow {
  id: string;
  sku: string;
  platform: string;
  playerPath: string;
  opsPath: string;
  afterRefund: string;
}

export interface SupportOps2KnownIssue {
  id: string;
  title: string;
  symptom: string;
  workaround: string;
  severity: string;
}

export interface SupportOps2Catalog {
  phase: number;
  plan: string;
  schema: string;
  supportOps2Marker: string;
  featureFaqMin: number;
  refundMatrixRowMin: number;
  knownIssue2Min: number;
  supportHtmlSectionMin: number;
  featureFaq: SupportOps2FeatureFaq[];
  refundMatrix: SupportOps2RefundRow[];
  knownIssues2: SupportOps2KnownIssue[];
  supportHtmlSections: string[];
}

export const SUPPORT_OPS_2 = ops2Json as unknown as SupportOps2Catalog;
export const SUPPORT_OPS_2_PHASE = SUPPORT_OPS_2.phase;
export const SUPPORT_OPS_2_MARKER = SUPPORT_OPS_2.supportOps2Marker;
export const FEATURE_FAQ_IDS = SUPPORT_OPS_2.featureFaq.map((f) => f.id);
export const REFUND_MATRIX_IDS = SUPPORT_OPS_2.refundMatrix.map((r) => r.id);
export const KNOWN_ISSUE_2_IDS = SUPPORT_OPS_2.knownIssues2.map((k) => k.id);
export const SUPPORT_HTML_SECTIONS_2 = SUPPORT_OPS_2.supportHtmlSections;

export function featureFaq2ById(id: string): SupportOps2FeatureFaq | undefined {
  return SUPPORT_OPS_2.featureFaq.find((f) => f.id === id);
}

export function refundMatrixById(id: string): SupportOps2RefundRow | undefined {
  return SUPPORT_OPS_2.refundMatrix.find((r) => r.id === id);
}
