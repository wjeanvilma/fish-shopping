/**
 * Phase 14 (post-1.0) — browser QA matrix from `shared/lifecycle/browser-matrix.json`.
 */
import matrixJson from "../../../shared/lifecycle/browser-matrix.json";
import { audioUnlockEvents } from "./lifecyclePolicy";

export interface BrowserTarget {
  id: string;
  label: string;
  engines: string[];
  webgl2: string;
  audioUnlock: string[];
}

export interface BrowserScenario {
  id: string;
  title: string;
  trigger: string;
  expects: string[];
  hostHooks: string[];
  phase28Keys: string[];
}

export interface BrowserMatrixCatalog {
  phase: number;
  schema: string;
  phase28Catalog: string;
  browsers: BrowserTarget[];
  scenarios: BrowserScenario[];
  audioUnlockEvents: string[];
  webgl2Required: boolean;
  storageQuota: {
    fallback: string;
    detectNames: string[];
    probeEstimate: boolean;
  };
  manualChecklist: string[];
  failCriteria: string[];
}

export const browserMatrix = matrixJson as unknown as BrowserMatrixCatalog;
export const BROWSER_MATRIX_PHASE = browserMatrix.phase;
export const BROWSER_MATRIX_SCHEMA = browserMatrix.schema;

export function browserIds(): string[] {
  return browserMatrix.browsers.map((b) => b.id);
}

export function scenarioIds(): string[] {
  return browserMatrix.scenarios.map((s) => s.id);
}

export function audioUnlockMatchesPolicy(): boolean {
  const policy = [...audioUnlockEvents()];
  const catalog = browserMatrix.audioUnlockEvents;
  if (policy.length !== catalog.length) return false;
  return policy.every((e, i) => e === catalog[i]);
}
