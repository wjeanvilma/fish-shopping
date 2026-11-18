/**
 * Finish 3.0 Phase 22 — stable web E2E test ids (mirrors Android ComposeUiTags).
 * Finish 4.0 Phase 26 expands nav/chrome ids (soft-floor ≥24).
 * Wired as data-testid; presentation-only.
 */
export const WEB_E2E_IDS = {
  TITLE_ROOT: "title.root",
  TITLE_BRAND: "title.brand",
  TITLE_CONTINUE: "title.continue",
  TITLE_NEW_GAME: "title.newGame",
  TITLE_PLAY: "title.play",
  TITLE_ANALYTICS_ALLOW: "title.analytics.allow",
  TITLE_ANALYTICS_DECLINE: "title.analytics.decline",
  OFFLINE_ROOT: "offline.root",
  OFFLINE_CONTINUE: "offline.continue",
  PAUSE_ROOT: "pause.root",
  PAUSE_RESUME: "pause.resume",
  PAUSE_SETTINGS: "pause.settings",
  PAUSE_TITLE: "pause.titleScreen",
  NAV_PAUSE: "nav.pause",
  NAV_MAP: "nav.map",
  NAV_WAREHOUSE: "nav.warehouse",
  NAV_GOALS: "nav.goals",
  NAV_JOBS: "nav.jobs",
  NAV_STAFF: "nav.staff",
  NAV_DASH: "nav.dash",
  NAV_UPGRADES: "nav.upgrades",
  NAV_BAG: "nav.bag",
  HUD_TOOLBAR: "hud.toolbar",
  DEEPLINK_READY: "deeplink.ready",
} as const;

export type WebE2eId = (typeof WEB_E2E_IDS)[keyof typeof WEB_E2E_IDS];

export const WEB_E2E_ID_LIST: WebE2eId[] = Object.values(WEB_E2E_IDS);

export const WEB_E2E_SETTINGS_KEY = "fish-shopping-settings";
export const WEB_E2E_SAVE_DB = "fish-shopping";
