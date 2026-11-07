/**
 * Finish 2.0 Phase 4 — v1.0-complete tag cut catalog
 * (mirrors shared/ship/complete-tag.json).
 */
import completeJson from "../../../shared/ship/complete-tag.json";

export interface CompleteTagCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  completeTag: string;
  completeTagMessage: string;
  closeoutStatusAfter: string;
  artifactSlots: Record<string, string>;
  hashAlgorithm: string;
  checklist: string[];
  preflightGates: string[];
}

export const COMPLETE_TAG = completeJson as unknown as CompleteTagCatalog;
export const COMPLETE_TAG_PHASE = COMPLETE_TAG.phase;
export const COMPLETE_TAG_SCHEMA = COMPLETE_TAG.schema;
export const V1_0_COMPLETE_TAG = COMPLETE_TAG.completeTag;
