import { expect, test, type Page } from "@playwright/test";
import {
  WEB_E2E_IDS,
  WEB_E2E_SAVE_DB,
  WEB_E2E_SETTINGS_KEY,
} from "../src/e2e/webE2eIds";

/**
 * Finish 3.0 Phase 22 — Playwright E2E smoke:
 * title → play → HUD toolbar → pause → goals.
 */

async function seedFreshSession(page: Page, decidedAnalytics = true): Promise<void> {
  await page.addInitScript(
    ({ settingsKey, saveDb, decidedAnalytics: decided }) => {
      try {
        localStorage.clear();
        localStorage.setItem(
          settingsKey,
          JSON.stringify({
            muted: true,
            musicVolume: 0,
            sfxVolume: 0,
            hapticsEnabled: false,
            quality: "low",
            joystickSide: "left",
            joystickScale: 1,
            tapToMove: false,
            cloudSyncEnabled: false,
            showBalanceStrip: false,
            reducedMotion: true,
            captionsEnabled: false,
            hudTextScale: 1,
            shapeCues: false,
            timingAssist: false,
            analyticsConsent: false,
            analyticsConsentDecided: decided,
            cloudAccountId: null,
            cloudRefreshToken: null,
            equippedCosmeticId: null,
            locale: "en",
            themePreference: "system",
            dailyGoalRemindersEnabled: false,
          }),
        );
      } catch {
        /* ignore */
      }
      try {
        indexedDB.deleteDatabase(saveDb);
      } catch {
        /* ignore */
      }
    },
    {
      settingsKey: WEB_E2E_SETTINGS_KEY,
      saveDb: WEB_E2E_SAVE_DB,
      decidedAnalytics,
    },
  );
}

test.describe("web E2E smoke", () => {
  test("title play reaches ready HUD and pause works", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/");
    await expect(page.getByTestId(WEB_E2E_IDS.TITLE_ROOT)).toBeVisible();
    await expect(page.getByTestId(WEB_E2E_IDS.TITLE_BRAND)).toHaveText(/Fish Shopping/i);
    await expect(page.getByTestId(WEB_E2E_IDS.TITLE_PLAY)).toBeVisible();

    await page.getByTestId(WEB_E2E_IDS.TITLE_PLAY).click();

    await expect(page.getByTestId(WEB_E2E_IDS.HUD_TOOLBAR)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId(WEB_E2E_IDS.NAV_PAUSE)).toBeVisible();
    await expect(page.getByTestId(WEB_E2E_IDS.NAV_GOALS)).toBeVisible();

    await page.getByTestId(WEB_E2E_IDS.NAV_PAUSE).click();
    await expect(page.getByTestId(WEB_E2E_IDS.PAUSE_ROOT)).toBeVisible();
    await expect(page.getByTestId(WEB_E2E_IDS.PAUSE_RESUME)).toBeVisible();
    await page.getByTestId(WEB_E2E_IDS.PAUSE_RESUME).click();
    await expect(page.getByTestId(WEB_E2E_IDS.PAUSE_ROOT)).toHaveCount(0);
    await expect(page.getByTestId(WEB_E2E_IDS.HUD_TOOLBAR)).toBeVisible();
  });

  test("analytics decline then play; goals nav opens panel", async ({ page }) => {
    await seedFreshSession(page, false);
    await page.goto("/");
    await expect(page.getByTestId(WEB_E2E_IDS.TITLE_ANALYTICS_DECLINE)).toBeVisible();
    await page.getByTestId(WEB_E2E_IDS.TITLE_ANALYTICS_DECLINE).click();
    await expect(page.getByTestId(WEB_E2E_IDS.TITLE_PLAY)).toBeVisible();
    await page.getByTestId(WEB_E2E_IDS.TITLE_PLAY).click();
    await expect(page.getByTestId(WEB_E2E_IDS.HUD_TOOLBAR)).toBeVisible({ timeout: 45_000 });
    await page.getByTestId(WEB_E2E_IDS.NAV_GOALS).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
  });
});
