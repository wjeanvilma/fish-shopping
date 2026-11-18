/**
 * Finish 4.0 Phase 24 — a11y depth 3 + i18n key growth readiness.
 *
 * Usage:
 *   npm run a11yi18n4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  A11Y_DEPTH_3,
  A11Y_DEPTH_3_MARKER,
  A11Y_DEPTH_3_PHASE,
  A11Y_DEPTH_3_SCHEMA,
  CONTRAST_PAIR_FLOOR_3,
  LIVE_REGION_FLOOR_3,
  SCREEN_SURFACE_FLOOR_3,
  UI_A11Y_STRING_FLOOR_3,
} from "../src/ship/a11yDepth3";
import {
  A11Y_STRING_KEY_FLOOR_4,
  I18N_GROWTH_4,
  I18N_GROWTH_4_MARKER,
  I18N_GROWTH_4_PHASE,
  I18N_GROWTH_4_SCHEMA,
  LOCALE_FLOOR_4,
  UI_STRING_KEY_FLOOR_4,
} from "../src/ship/i18nGrowth4";
import {
  A11Y_DEPTH_3_LIVE_REGIONS,
  A11Y_DEPTH_3_SCREEN_IDS,
  accessibilityDepth3,
  depth3ContrastFailures,
} from "../src/presenters/accessibilityDepth3";
import { depth2ContrastFailures } from "../src/presenters/accessibilityDepth2";
import { depthContrastFailures } from "../src/presenters/accessibilityDepth";
import { UI_STRING_KEYS } from "../src/i18n/strings";
import { measureAndroidI18n } from "../src/ship/androidI18n";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const a11yShip = readJson(resolve(root, "shared/ship/a11y-depth-3.json"));
  const i18nShip = readJson(resolve(root, "shared/ship/i18n-growth-4.json"));
  const depth = readJson(resolve(root, "shared/a11y/accessibility-depth-3.json"));
  const a11yFx = readJson(resolve(root, "shared/fixtures/parity-a11y-depth-3.json"));
  const i18nFx = readJson(resolve(root, "shared/fixtures/parity-i18n-growth-4.json"));
  const depth2 = readJson(resolve(root, "shared/a11y/accessibility-depth-2.json"));
  const index = readJson(resolve(root, "shared/i18n/ui-strings.json"));
  const en = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));
  const es = readJson(resolve(root, "shared/i18n/ui-strings.es.json"));
  const pt = readJson(resolve(root, "shared/i18n/ui-strings.pt.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const uiKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/UiStrings.kt"),
    "utf8",
  );
  const offlineWeb = readFileSync(resolve(root, "web/src/ui/OfflineSummaryPanel.tsx"), "utf8");
  const upgradeWeb = readFileSync(resolve(root, "web/src/ui/UpgradePanel.tsx"), "utf8");
  const settingsWeb = readFileSync(resolve(root, "web/src/ui/PauseSettingsPanels.tsx"), "utf8");
  const titleWeb = readFileSync(resolve(root, "web/src/ui/TitlePanels.tsx"), "utf8");
  const staffWeb = readFileSync(resolve(root, "web/src/ui/StaffPanel.tsx"), "utf8");
  const offlineKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/OfflineSummaryPanel.kt"),
    "utf8",
  );
  const upgradeKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/UpgradePanel.kt"),
    "utf8",
  );
  const settingsKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/PauseSettingsPanels.kt"),
    "utf8",
  );
  const titleKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt"),
    "utf8",
  );
  const staffKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/StaffPanel.kt"),
    "utf8",
  );

  if (a11yShip.phase !== 24 || i18nShip.phase !== 24) errors.push("phase expected 24");
  if (a11yShip.schema !== A11Y_DEPTH_3_SCHEMA) errors.push("a11y schema mismatch");
  if (i18nShip.schema !== I18N_GROWTH_4_SCHEMA) errors.push("i18n schema mismatch");
  if (a11yShip.plan !== "30_finish_4.0" || i18nShip.plan !== "30_finish_4.0") {
    errors.push("plan must be 30_finish_4.0");
  }
  if (A11Y_DEPTH_3_PHASE !== 24 || I18N_GROWTH_4_PHASE !== 24) errors.push("phase mirror mismatch");
  if (a11yShip.a11yDepth3Marker !== A11Y_DEPTH_3_MARKER) errors.push("a11y marker mismatch");
  if (i18nShip.i18nGrowth4Marker !== I18N_GROWTH_4_MARKER) errors.push("i18n marker mismatch");
  if (a11yFx.a11yDepth3Marker !== A11Y_DEPTH_3_MARKER) errors.push("a11y fixture marker mismatch");
  if (i18nFx.i18nGrowth4Marker !== I18N_GROWTH_4_MARKER) errors.push("i18n fixture marker mismatch");
  if (a11yShip.contentVersion !== "3.0.0" || i18nShip.contentVersion !== "3.0.0") {
    errors.push("contentVersion must stay 3.0.0");
  }
  if (a11yShip.schemaVersion !== 25 || i18nShip.schemaVersion !== 25) {
    errors.push("schemaVersion must stay 25");
  }
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (a11yShip.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");

  if (a11yShip.screenSurfaceMin !== 5 || SCREEN_SURFACE_FLOOR_3 !== 5) {
    errors.push("screenSurfaceMin must be 5");
  }
  if (a11yShip.contrastPairMin !== 2 || CONTRAST_PAIR_FLOOR_3 !== 2) {
    errors.push("contrastPairMin must be 2");
  }
  if (a11yShip.uiA11yStringKeyMin !== 20 || UI_A11Y_STRING_FLOOR_3 !== 20) {
    errors.push("uiA11yStringKeyMin must be 20");
  }
  if (a11yShip.liveRegionMin !== 2 || LIVE_REGION_FLOOR_3 !== 2) {
    errors.push("liveRegionMin must be 2");
  }
  if (depth.screenSurfaces.length < 5 || A11Y_DEPTH_3_SCREEN_IDS.length < 5) {
    errors.push("depth-3 screens short");
  }
  for (const id of a11yFx.expect.screenSurfaces as string[]) {
    if (!A11Y_DEPTH_3_SCREEN_IDS.includes(id)) errors.push(`missing screen ${id}`);
  }
  const depth2Ids = new Set((depth2.screenSurfaces as any[]).map((s) => s.id));
  for (const id of A11Y_DEPTH_3_SCREEN_IDS) {
    if (depth2Ids.has(id)) errors.push(`depth-3 screen ${id} overlaps depth-2`);
  }
  if (depth3ContrastFailures().length) {
    errors.push(`depth-3 contrast failures: ${depth3ContrastFailures().map((p) => p.id).join(",")}`);
  }
  // Soft floors: prior depth catalogs stay green.
  if (depth2ContrastFailures().length) errors.push("depth-2 contrast regressions");
  if (depthContrastFailures().length) errors.push("depth-1 contrast regressions");
  if (A11Y_DEPTH_3_LIVE_REGIONS.length < 2) errors.push("live regions short");
  for (const id of a11yFx.expect.liveRegions as string[]) {
    if (!A11Y_DEPTH_3_LIVE_REGIONS.includes(id)) errors.push(`missing live region ${id}`);
  }

  if (i18nShip.uiStringKeyMin !== 280 || UI_STRING_KEY_FLOOR_4 !== 280) {
    errors.push("uiStringKeyMin must be 280");
  }
  if (i18nShip.localeMin !== 3 || LOCALE_FLOOR_4 !== 3) errors.push("localeMin must be 3");
  if (i18nShip.a11yStringKeyMin !== 20 || A11Y_STRING_KEY_FLOOR_4 !== 20) {
    errors.push("a11yStringKeyMin must be 20");
  }
  if ((index.keyMin ?? 0) < 280) errors.push("ui-strings.json keyMin must be ≥280");
  const enKeys = Object.keys(en.strings ?? {});
  const esKeys = Object.keys(es.strings ?? {});
  const ptKeys = Object.keys(pt.strings ?? {});
  if (enKeys.length < 280) errors.push(`en keys ${enKeys.length} < 280`);
  if (esKeys.length < 280) errors.push(`es keys ${esKeys.length} < 280`);
  if (ptKeys.length < 280) errors.push(`pt keys ${ptKeys.length} < 280`);
  if (UI_STRING_KEYS.length < 280) errors.push(`runtime UI_STRING_KEYS ${UI_STRING_KEYS.length} < 280`);
  const enSet = new Set(enKeys);
  const esSet = new Set(esKeys);
  const ptSet = new Set(ptKeys);
  if (![...enSet].every((k) => esSet.has(k) && ptSet.has(k)) || enKeys.length !== esKeys.length || enKeys.length !== ptKeys.length) {
    errors.push("en/es/pt key parity broken");
  }
  const a11yKeys = enKeys.filter((k) => k.startsWith("a11y."));
  if (a11yKeys.length < 20) errors.push(`a11y.* keys ${a11yKeys.length} < 20`);

  const measure = measureAndroidI18n(root);
  if (measure.textLiterals > I18N_GROWTH_4.androidTextLiteralsMax) {
    errors.push(`ui/hud Text(" literals ${measure.textLiterals} > 0`);
  }
  for (const sample of ["a11y.offlineSection", "dashboard.operatingCosts", "cloud.chooseSave"]) {
    if (!uiKt.includes(`"${sample}"`)) errors.push(`UiStrings.kt missing ${sample}`);
  }

  // Soft floors: Finish 2.0/3.0 catalogs keep historical mins.
  if ((I18N_GROWTH_4.softFloors?.i18nScaffoldKeyMin ?? 0) < 48) {
    errors.push("soft floor i18n scaffold min must stay ≥48");
  }
  if ((I18N_GROWTH_4.softFloors?.androidI18nKeyMin ?? 0) < 120) {
    errors.push("soft floor android i18n min must stay ≥120");
  }

  // Wiring checks
  if (!offlineWeb.includes('aria-live="polite"') || !offlineWeb.includes("a11y.offlineSection")) {
    errors.push("OfflineSummaryPanel missing offline a11y wiring");
  }
  if (!upgradeWeb.includes("a11y.upgradesSection")) errors.push("UpgradePanel missing upgrades a11y");
  if (!settingsWeb.includes("a11y.licensesSection") || !settingsWeb.includes("panels.licenses")) {
    errors.push("Licenses panel missing a11y wiring");
  }
  if (!titleWeb.includes('aria-live="assertive"') || !titleWeb.includes("a11y.cloudConflictLive")) {
    errors.push("CloudConflictPanel missing live region");
  }
  if (!staffWeb.includes("a11y.staffTrainSection")) errors.push("StaffPanel missing train a11y");
  if (!offlineKt.includes("a11yPane(\"offline.title\")") && !offlineKt.includes("a11yPane(\"offline.title\")")) {
    if (!offlineKt.includes("offline.title") || !offlineKt.includes("liveRegion")) {
      errors.push("Android OfflineSummaryPanel missing a11y pane/live region");
    }
  }
  if (!upgradeKt.includes("a11yPane(\"panels.upgrades\")")) {
    errors.push("Android UpgradePanel missing a11yPane");
  }
  if (!settingsKt.includes("a11yPane(\"panels.licenses\")")) {
    errors.push("Android LicensesPanel missing a11yPane");
  }
  if (!titleKt.includes("cloud.chooseSave") || !titleKt.includes("LiveRegionMode.Assertive")) {
    errors.push("Android CloudConflictPanel missing a11y wiring");
  }
  if (!staffKt.includes("a11y.staffTrainSection")) {
    errors.push("Android StaffPanel missing train a11y");
  }

  const phase24 = (kickoff.phases as any[])?.find((p) => p.phase === 24);
  if (!phase24 || phase24.validate !== "a11yi18n4:validate") {
    errors.push("kickoff phase 24 validate must be a11yi18n4:validate");
  }
  if (phase24?.id !== "a11y-i18n-4") errors.push("kickoff phase 24 id must be a11y-i18n-4");
  if (!finish4Kt.includes("a11yi18n4:validate")) {
    errors.push("Finish4Kickoff.kt missing a11yi18n4:validate");
  }
  if ((kickoff.baseline?.i18nUiKeys ?? 0) < 280) {
    errors.push("kickoff.baseline.i18nUiKeys must be ≥280");
  }

  if (listing.a11yDepth3Phase !== 24) errors.push("listing.a11yDepth3Phase must be 24");
  if (listing.i18nGrowth4Phase !== 24) errors.push("listing.i18nGrowth4Phase must be 24");
  if (listing.a11yDepth3Catalog !== "shared/ship/a11y-depth-3.json") {
    errors.push("listing.a11yDepth3Catalog mismatch");
  }
  if (listing.i18nGrowth4Catalog !== "shared/ship/i18n-growth-4.json") {
    errors.push("listing.i18nGrowth4Catalog mismatch");
  }
  if (pin.a11yDepth3 !== "shared/ship/a11y-depth-3.json") errors.push("RELEASE_PIN.a11yDepth3 missing");
  if (pin.i18nGrowth4 !== "shared/ship/i18n-growth-4.json") errors.push("RELEASE_PIN.i18nGrowth4 missing");
  if (!pin.fixtures?.includes("parity-a11y-depth-3.json")) {
    errors.push("RELEASE_PIN missing parity-a11y-depth-3.json");
  }
  if (!pin.fixtures?.includes("parity-i18n-growth-4.json")) {
    errors.push("RELEASE_PIN missing parity-i18n-growth-4.json");
  }

  if (!dod.a11yDepth3 || dod.a11yDepth3.status !== "complete") errors.push("DoD a11yDepth3 incomplete");
  if (!dod.i18nGrowth4 || dod.i18nGrowth4.status !== "complete") errors.push("DoD i18nGrowth4 incomplete");
  if ((dod.quotas?.a11yDepth3Screens ?? 0) < 5) errors.push("DoD quotas.a11yDepth3Screens < 5");
  if ((dod.quotas?.a11yDepth3ContrastPairs ?? 0) < 2) errors.push("DoD quotas.a11yDepth3ContrastPairs < 2");
  if ((dod.quotas?.i18nUiKeysGrowth4 ?? 0) < 280) errors.push("DoD quotas.i18nUiKeysGrowth4 < 280");

  if (!pkg.scripts?.["a11yi18n4:validate"]) errors.push("package.json missing a11yi18n4:validate");
  if (!ci.includes("a11yi18n4:validate")) errors.push("ci.yml missing a11yi18n4:validate");

  const gates = [
    ...((a11yShip.preflightGates as string[]) ?? []),
    ...((i18nShip.preflightGates as string[]) ?? []),
  ];
  for (const gate of gates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  void A11Y_DEPTH_3;
  void accessibilityDepth3;
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("a11yi18n4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK a11yi18n4:validate — a11y depth 3 + i18n growth 4 wired");
