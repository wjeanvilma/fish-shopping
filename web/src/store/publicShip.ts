/**
 * Phase 18 (post-1.0) — public Play production + web 1.0 release catalog.
 */
import publicShipJson from "../../../shared/ship/public-ship.json";

export interface PublicShipCatalog {
  phase: number;
  schema: string;
  releaseTag: string;
  packageName: string;
  contentVersion: string;
  schemaVersion: number;
  prerequisite: {
    closedTestingCatalog: string;
    closedTestingPhase: number;
  };
  android: {
    track: string;
    promoteFrom: string;
    artifacts: {
      aab: string;
      mapping: string;
      ciArtifactName: string;
      ciJob: string;
    };
    stagedRollout: {
      initialPercent: number;
      hotfixLanePhase?: number;
      hotfixLaneCatalog?: string;
    };
  };
  web: {
    host: string;
    canonicalHost: string;
    distDir: string;
    ciJob: string;
    ciArtifactName: string;
  };
  storeBuildHashes: {
    algorithm: string;
    inputFiles: string[];
    artifactSlots: Record<string, string>;
  };
  preflightGates: string[];
  signoff: {
    status: string;
    statusValues: string[];
    checklist: string[];
  };
}

export const publicShip = publicShipJson as unknown as PublicShipCatalog;
export const PUBLIC_SHIP_PHASE = publicShip.phase;
export const PUBLIC_SHIP_SCHEMA = publicShip.schema;
export const PUBLIC_SHIP_RELEASE_TAG = publicShip.releaseTag;
