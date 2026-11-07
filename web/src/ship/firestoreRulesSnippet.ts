/**
 * Finish 2.0 Phase 26 — Firestore rules snippet ship catalog
 * (mirrors shared/ship/firestore-rules-snippet.json).
 */
import catalogJson from "../../../shared/ship/firestore-rules-snippet.json";

export interface FirestoreRulesSnippetShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  firestoreSnippetMarker: string;
  productionPathCatalog: string;
  snippetPath: string;
  snippetMode: string;
  forbiddenDeployablePaths: string[];
  documentPath: string;
  documentFields: string[];
  conflictUi: string;
  offlineQueuePolicy: string;
  qaScenarioMin: number;
  parityFixture: string;
  validateScript: string;
}

export const FIRESTORE_RULES_SNIPPET = catalogJson as unknown as FirestoreRulesSnippetShipCatalog;
export const FIRESTORE_RULES_SNIPPET_PHASE = FIRESTORE_RULES_SNIPPET.phase;
export const FIRESTORE_RULES_SNIPPET_SCHEMA = FIRESTORE_RULES_SNIPPET.schema;
export const FIRESTORE_RULES_SNIPPET_MARKER = FIRESTORE_RULES_SNIPPET.firestoreSnippetMarker;
export const FIRESTORE_QA_SCENARIO_FLOOR = FIRESTORE_RULES_SNIPPET.qaScenarioMin;
export const FIRESTORE_SNIPPET_PATH = FIRESTORE_RULES_SNIPPET.snippetPath;
export const FIRESTORE_SNIPPET_MODE = FIRESTORE_RULES_SNIPPET.snippetMode;
