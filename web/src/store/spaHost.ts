/**
 * Finish 2.0 Phase 3 — SPA host on GitHub Pages catalog
 * (mirrors shared/ship/spa-host.json).
 */
import spaJson from "../../../shared/ship/spa-host.json";

export interface SpaLegalPath {
  path: string;
  url: string;
  mustInclude: string;
}

export interface SpaHostCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  host: string;
  canonicalHost: string;
  playPath: string;
  playUrl: string;
  viteBase: string;
  build: {
    npmScript: string;
    publishRoot: string;
    playOutDir: string;
    workflow: string;
    fallback404: boolean;
    stripLegalHtmlFromPlay: boolean;
  };
  legalPathsStable: SpaLegalPath[];
  spaChecks: {
    indexMustInclude: string[];
    requiredPublishedFiles: string[];
    requiredAssetSuffixes: string[];
    requiredAudioDirs: string[];
  };
  checklist: string[];
  preflightGates: string[];
}

export const SPA_HOST = spaJson as unknown as SpaHostCatalog;
export const SPA_HOST_PHASE = SPA_HOST.phase;
export const SPA_HOST_SCHEMA = SPA_HOST.schema;
export const SPA_PLAY_URL = SPA_HOST.playUrl;
