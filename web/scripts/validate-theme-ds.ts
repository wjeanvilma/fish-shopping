/**
 * Finish 3.0 Phase 7 — dark theme + design-system readiness.
 *
 * Usage:
 *   npm run themeds:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  measureThemeDs,
  THEME_DS,
  THEME_DS_MARKER,
  THEME_DS_PHASE,
  THEME_DS_SCHEMA,
} from "../src/ship/themeDs";
import { resolveThemeMode } from "../src/game/settingsStore";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/theme-ds.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-theme-ds.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ThemeDs.kt"),
    "utf8",
  );
  const enUi = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));

  if (catalog.phase !== 7) errors.push(`phase expected 7, got ${catalog.phase}`);
  if (catalog.schema !== THEME_DS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (THEME_DS_PHASE !== 7) errors.push("phase mirror mismatch");
  if (catalog.themeDsMarker !== THEME_DS_MARKER) errors.push("marker mismatch");
  if (fixture.themeDsMarker !== THEME_DS_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");

  const measure = measureThemeDs(root);
  if (!measure.darkKeysPresent) errors.push("design-tokens colorDark missing required keys");
  if (measure.darkKeyCount < 11) errors.push(`colorDark key count ${measure.darkKeyCount} < 11`);
  if (!measure.themePrefsOk) errors.push("tokens.theme preferences/default mismatch");
  if (!measure.androidThemeWired) errors.push("Android Theme.kt missing dark scheme wiring");
  if (!measure.androidDsWired) errors.push("Android DesignSystem primitives incomplete");
  if (!measure.webDarkCss) errors.push("web styles missing [data-theme=dark] overrides");
  if (!measure.webDsWired) errors.push("web HudPrimitives DS exports incomplete");
  if (!measure.settingsAndroid) errors.push("Android SettingsStore missing themePreference");
  if (!measure.settingsWeb) errors.push("web settingsStore missing themePreference/applyTheme");
  if (!measure.gapClosed) errors.push("kickoff gaps.darkThemeMissing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (resolveThemeMode("light", true) !== "light") errors.push("resolveThemeMode light failed");
  if (resolveThemeMode("dark", false) !== "dark") errors.push("resolveThemeMode dark failed");
  if (resolveThemeMode("system", true) !== "dark") errors.push("resolveThemeMode system/dark failed");
  if (resolveThemeMode("system", false) !== "light") errors.push("resolveThemeMode system/light failed");

  for (const key of ["settings.theme", "settings.themeSystem", "settings.themeLight", "settings.themeDark"]) {
    if (!enUi.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
  }

  const phase7 = (kickoff.phases as any[])?.find((p) => p.phase === 7);
  if (!phase7) errors.push("kickoff missing phase 7");
  else if (phase7.validate !== "themeds:validate") {
    errors.push("kickoff phase 7 validate must be themeds:validate");
  }
  if (kickoff.gaps?.darkThemeMissing !== false) {
    errors.push("kickoff.gaps.darkThemeMissing must be false");
  }

  if (listing.themeDsPhase !== 7) errors.push("listing.themeDsPhase must be 7");
  if (listing.themeDsCatalog !== "shared/ship/theme-ds.json") {
    errors.push("listing.themeDsCatalog mismatch");
  }
  if (pin.themeDs !== "shared/ship/theme-ds.json") errors.push("RELEASE_PIN.themeDs path missing");
  if (!pin.fixtures?.includes("parity-theme-ds.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-theme-ds.json");
  }

  const block = dod.themeDs;
  if (!block) errors.push("DoD missing themeDs block");
  else {
    if (block.phase !== 7) errors.push("DoD themeDs.phase must be 7");
    if (block.plan !== "30_finish_3.0") errors.push("DoD themeDs.plan mismatch");
    if (block.status !== "complete") errors.push("DoD themeDs.status must be complete");
    if (block.themeDsMarker !== THEME_DS_MARKER) errors.push("DoD themeDs marker mismatch");
  }

  if (!pkg.scripts?.["themeds:validate"]) errors.push("package.json missing themeds:validate");
  if (!ci.includes("themeds:validate")) errors.push("ci.yml missing themeds:validate");
  if (!kotlin.includes("REQUIRED_COLOR_DARK_KEYS")) {
    errors.push("Kotlin ThemeDs missing REQUIRED_COLOR_DARK_KEYS");
  }

  if (fixture.expect?.colorDarkKeyMin !== 11) errors.push("parity colorDarkKeyMin must be 11");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("themeds:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK themeds:validate — dark theme tokens + DS primitives wired on Android + web");
