import { expect, test, type Page } from "@playwright/test";
import {
  WEB_E2E_IDS,
  WEB_E2E_SAVE_DB,
  WEB_E2E_SETTINGS_KEY,
} from "../src/e2e/webE2eIds";

/**
 * Finish 3.0 Phase 22 — Playwright E2E smoke:
 * title → play → HUD toolbar → pause → goals.
 * Finish 5.0 Phase 26 — ≥12 scenarios including Finish 5 deep-link aliases.
 * Finish 6.0 Phase 23 — ≥24 scenarios including nest deep-link aliases.
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

async function playToHud(page: Page): Promise<void> {
  await expect(page.getByTestId(WEB_E2E_IDS.TITLE_PLAY)).toBeVisible();
  await page.getByTestId(WEB_E2E_IDS.TITLE_PLAY).click();
  await expect(page.getByTestId(WEB_E2E_IDS.HUD_TOOLBAR)).toBeVisible({ timeout: 45_000 });
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

  test("staff and map nav open panels", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.NAV_STAFF)).toBeVisible();
    await page.getByTestId(WEB_E2E_IDS.NAV_STAFF).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId(WEB_E2E_IDS.NAV_MAP).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
  });

  test("jobs and dash nav open panels", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/");
    await playToHud(page);
    await page.getByTestId(WEB_E2E_IDS.NAV_JOBS).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId(WEB_E2E_IDS.NAV_DASH).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
  });

  test("deep link panel=staff opens after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=staff");
    await playToHud(page);
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
  });

  test("warehouse and upgrades nav open panels", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/");
    await playToHud(page);
    await page.getByTestId(WEB_E2E_IDS.NAV_WAREHOUSE).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId(WEB_E2E_IDS.NAV_UPGRADES).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
  });

  test("deep link panel=warehouse opens after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=warehouse");
    await playToHud(page);
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=weekly opens goals after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=weekly");
    await playToHud(page);
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId(WEB_E2E_IDS.GOALS_WEEKLY)).toBeVisible();
  });

  test("deep link panel=pierledger opens dashboard after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=pierledger");
    await playToHud(page);
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
  });

  test("deep link hash endgame opens goals after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/#endgame");
    await playToHud(page);
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId(WEB_E2E_IDS.GOALS_ENDGAME)).toBeVisible();
  });

  test("pause settings opens from pause panel", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/");
    await playToHud(page);
    await page.getByTestId(WEB_E2E_IDS.NAV_PAUSE).click();
    await expect(page.getByTestId(WEB_E2E_IDS.PAUSE_ROOT)).toBeVisible();
    await page.getByTestId(WEB_E2E_IDS.PAUSE_SETTINGS).click();
    await expect(page.getByRole("dialog").first()).toBeVisible();
  });

  test("photo and decor nav open overlays", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/");
    await playToHud(page);
    await page.getByTestId(WEB_E2E_IDS.NAV_PHOTO).click();
    await expect(page.getByTestId(WEB_E2E_IDS.PHOTO_SNAP)).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await page.getByTestId(WEB_E2E_IDS.NAV_DECOR).click();
    await expect(page.getByTestId(WEB_E2E_IDS.DECOR_PLACE).or(page.getByRole("dialog").first())).toBeVisible({
      timeout: 15_000,
    });
  });

  test("deep link panel=bag opens bag after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=bag");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.BAG_PANEL)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=jobs opens contracts after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=jobs");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.CONTRACTS_PANEL)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=dash opens dashboard after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=dash");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.DASH_ROOT)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=map opens map after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=map");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.MAP_PANEL)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=nesttreasury opens dashboard after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=nesttreasury");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.DASH_ROOT)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId(WEB_E2E_IDS.NEST_TREASURY)).toBeVisible();
  });

  test("deep link panel=nestloans opens goals bank after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=nestloans");
    await playToHud(page);
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId(WEB_E2E_IDS.NEST_LOANS)).toBeVisible();
  });

  test("deep link hash nestember opens goals after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/#nestember");
    await playToHud(page);
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 20_000 });
  });

  test("deep link go=nestconflict opens pause after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?go=nestconflict");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.PAUSE_ROOT)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=saffron opens map after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=saffron");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.MAP_PANEL)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link hash roastnest opens contracts after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/#roastnest");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.CONTRACTS_PANEL)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=nestjournal opens species book after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=nestjournal");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.SPECIES_BOOK)).toBeVisible({ timeout: 20_000 });
  });

  test("deep link panel=contracts opens contracts after play", async ({ page }) => {
    await seedFreshSession(page, true);
    await page.goto("/?panel=contracts");
    await playToHud(page);
    await expect(page.getByTestId(WEB_E2E_IDS.CONTRACTS_PANEL)).toBeVisible({ timeout: 20_000 });
  });
});
