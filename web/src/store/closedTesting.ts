/**
 * Phase 17 (post-1.0) — Play closed/internal testing track catalog.
 */
import closedJson from "../../../shared/android/closed-testing.json";

export interface ClosedTestingCatalog {
  phase: number;
  schema: string;
  packageName: string;
  releasePin: string;
  aabCi: string;
  tracks: { primary: string; secondary: string };
  artifacts: {
    aab: string;
    mapping: string;
    ciArtifactName: string;
    ciJob: string;
  };
  crashTriage: {
    provider: string;
    sdk: string | null;
    blockerCriteria: string[];
    triageSteps: string[];
  };
  preflightGates: string[];
  signoff: {
    status: string;
    statusValues: string[];
    checklist: string[];
    productionPromotion: string;
  };
}

export const closedTesting = closedJson as unknown as ClosedTestingCatalog;
export const CLOSED_TESTING_PHASE = closedTesting.phase;
export const CLOSED_TESTING_SCHEMA = closedTesting.schema;
