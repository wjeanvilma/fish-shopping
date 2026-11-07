/**
 * Finish 2.0 Phase 2 — landing Play-in-browser CTA catalog
 * (mirrors shared/ship/landing-play-cta.json).
 */
import ctaJson from "../../../shared/ship/landing-play-cta.json";

export interface LandingPlayCtaCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  canonicalHost: string;
  landingUrl: string;
  playPath: string;
  playUrl: string;
  viteBase: string;
  cta: { play: string; privacy: string; support: string };
  landingSource: string;
  build: {
    npmScript: string;
    publishRoot: string;
    playOutDir: string;
    workflow: string;
  };
  checklist: string[];
  preflightGates: string[];
}

export const LANDING_PLAY_CTA = ctaJson as unknown as LandingPlayCtaCatalog;
export const LANDING_PLAY_CTA_PHASE = LANDING_PLAY_CTA.phase;
export const LANDING_PLAY_CTA_SCHEMA = LANDING_PLAY_CTA.schema;
export const PLAY_IN_BROWSER_LABEL = LANDING_PLAY_CTA.cta.play;
export const PLAY_URL = LANDING_PLAY_CTA.playUrl;
