/**
 * Finish 2.0 Phase 1 — Pages legal live catalog
 * (mirrors shared/ship/pages-legal-live.json).
 */
import pagesLiveJson from "../../../shared/ship/pages-legal-live.json";

export interface PagesLegalLiveCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  canonicalHost: string;
  urls: { landing: string; support: string; privacy: string };
  pages: {
    host: string;
    buildType: string;
    workflow: string;
    workflowName: string;
    npmScript: string;
    publishRoot: string;
    requirePublicRepo: boolean;
  };
  liveCheck: {
    method: string;
    expectStatus: number;
    validateScript: string;
  };
  checklist: string[];
  preflightGates: string[];
}

export const PAGES_LEGAL_LIVE = pagesLiveJson as unknown as PagesLegalLiveCatalog;
export const PAGES_LEGAL_LIVE_PHASE = PAGES_LEGAL_LIVE.phase;
export const PAGES_LEGAL_LIVE_SCHEMA = PAGES_LEGAL_LIVE.schema;

export function pagesLegalLiveUrls(): string[] {
  const u = PAGES_LEGAL_LIVE.urls;
  return [u.landing, u.support, u.privacy];
}
