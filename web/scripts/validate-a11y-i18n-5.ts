/**
 * Finish 5.0 Phase 24 — a11y depth 4 + i18n key growth readiness.
 *
 * Usage:
 *   npm run a11yi18n5:validate
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  A11Y_DEPTH_4,
  A11Y_DEPTH_4_MARKER,
  A11Y_DEPTH_4_PHASE,
  A11Y_DEPTH_4_SCHEMA,
  CONTRAST_PAIR_FLOOR_4,
  LIVE_REGION_FLOOR_4,
  SCREEN_SURFACE_FLOOR_4,
  UI_A11Y_STRING_FLOOR_4,
} from "../src/ship/a11yDepth4";
import {
  A11Y_STRING_KEY_FLOOR_5,
  I18N_GROWTH_5,
  I18N_GROWTH_5_MARKER,
  I18N_GROWTH_5_PHASE,
  I18N_GROWTH_5_SCHEMA,
  LOCALE_FLOOR_5,
  UI_STRING_KEY_FLOOR_5,
} from "../src/ship/i18nGrowth5";
import {
  A11Y_DEPTH_4_LIVE_REGIONS,
  A11Y_DEPTH_4_SCREEN_IDS,
  accessibilityDepth4,
  depth4ContrastFailures,
} from "../src/presenters/accessibilityDepth4";
import { depth3ContrastFailures } from "../src/presenters/accessibilityDepth3";
import { depth2ContrastFailures } from "../src/presenters/accessibilityDepth2";
import { depthContrastFailures } from "../src/presenters/accessibilityDepth";
import { UI_STRING_KEYS } from "../src/i18n/strings";
import { measureAndroidI18n } from "../src/ship/androidI18n";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const LOCALES = ["en", "es", "pt", "fr", "ht", "it", "ca", "ru"] as const;

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const a11yShip = readJson(resolve(root, "shared/ship/a11y-depth-4.json"));
  const i18nShip = readJson(resolve(root, "shared/ship/i18n-growth-5.json"));
  const depth = readJson(resolve(root, "shared/a11y/accessibility-depth-4.json"));
  const depth3 = readJson(resolve(root, "shared/a11y/accessibility-depth-3.json"));
  const a11yFx = readJson(resolve(root, "shared/fixtures/parity-a11y-depth-4.json"));
  const i18nFx = readJson(resolve(root, "shared/fixtures/parity-i18n-growth-5.json"));
  const index = readJson(resolve(root, "shared/i18n/ui-strings.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const uiKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/UiStrings.kt"),
    "utf8",
  );
  const questWeb = readFileSync(resolve(root, "web/src/ui/QuestLogPanel.tsx"), "utf8");
  const dashWeb = readFileSync(resolve(root, "web/src/ui/BusinessDashboardPanel.tsx"), "utf8");
  const warehouseWeb = readFileSync(resolve(root, "web/src/ui/MapWarehousePanels.tsx"), "utf8");
  const appWeb = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const questKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt"),
    "utf8",
  );
  const dashKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt"),
    "utf8",
  );
  const warehouseKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/MapWarehousePanels.kt"),
    "utf8",
  );
  const gameKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );

  if (a11yShip.phase !== 24 || i18nShip.phase !== 24) errors.push("phase expected 24");
  if (a11yShip.schema !== A11Y_DEPTH_4_SCHEMA) errors.push("a11y schema mismatch");
  if (i18nShip.schema !== I18N_GROWTH_5_SCHEMA) errors.push("i18n schema mismatch");
  if (a11yShip.plan !== "30_finish_5.0" || i18nShip.plan !== "30_finish_5.0") {
    errors.push("plan must be 30_finish_5.0");
  }
  if (A11Y_DEPTH_4_PHASE !== 24 || I18N_GROWTH_5_PHASE !== 24) errors.push("phase mirror mismatch");
  if (a11yShip.a11yDepth4Marker !== A11Y_DEPTH_4_MARKER) errors.push("a11y marker mismatch");
  if (i18nShip.i18nGrowth5Marker !== I18N_GROWTH_5_MARKER) errors.push("i18n marker mismatch");
  if (a11yFx.a11yDepth4Marker !== A11Y_DEPTH_4_MARKER) errors.push("a11y fixture marker mismatch");
  if (i18nFx.i18nGrowth5Marker !== I18N_GROWTH_5_MARKER) errors.push("i18n fixture marker mismatch");
  if (a11yShip.contentVersion !== "4.0.0" || i18nShip.contentVersion !== "4.0.0") {
    errors.push("contentVersion must stay 4.0.0");
  }
  if (a11yShip.schemaVersion !== 26 || i18nShip.schemaVersion !== 26) {
    errors.push("schemaVersion must stay 26");
  }
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");
  if (pack.saveSchemaVersion < 26) errors.push("content-pack.saveSchemaVersion must be >= 26");
  if (a11yShip.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");

  if (a11yShip.screenSurfaceMin !== 5 || SCREEN_SURFACE_FLOOR_4 !== 5) {
    errors.push("screenSurfaceMin must be 5");
  }
  if (a11yShip.contrastPairMin !== 2 || CONTRAST_PAIR_FLOOR_4 !== 2) {
    errors.push("contrastPairMin must be 2");
  }
  if (a11yShip.uiA11yStringKeyMin !== 30 || UI_A11Y_STRING_FLOOR_4 !== 30) {
    errors.push("uiA11yStringKeyMin must be 30");
  }
  if (a11yShip.liveRegionMin !== 2 || LIVE_REGION_FLOOR_4 !== 2) {
    errors.push("liveRegionMin must be 2");
  }
  if (depth.screenSurfaces.length < 5 || A11Y_DEPTH_4_SCREEN_IDS.length < 5) {
    errors.push("depth-4 screens short");
  }
  for (const id of a11yFx.expect.screenSurfaces as string[]) {
    if (!A11Y_DEPTH_4_SCREEN_IDS.includes(id)) errors.push(`missing screen ${id}`);
  }
  const depth3Ids = new Set((depth3.screenSurfaces as any[]).map((s) => s.id));
  for (const id of A11Y_DEPTH_4_SCREEN_IDS) {
    if (depth3Ids.has(id)) errors.push(`depth-4 screen ${id} overlaps depth-3`);
  }
  if (depth4ContrastFailures().length) {
    errors.push(`depth-4 contrast failures: ${depth4ContrastFailures().map((p) => p.id).join(",")}`);
  }
  if (depth3ContrastFailures().length) errors.push("depth-3 contrast regressions");
  if (depth2ContrastFailures().length) errors.push("depth-2 contrast regressions");
  if (depthContrastFailures().length) errors.push("depth-1 contrast regressions");
  if (A11Y_DEPTH_4_LIVE_REGIONS.length < 2) errors.push("live regions short");
  for (const id of a11yFx.expect.liveRegions as string[]) {
    if (!A11Y_DEPTH_4_LIVE_REGIONS.includes(id)) errors.push(`missing live region ${id}`);
  }

  if (i18nShip.uiStringKeyMin !== 360 || UI_STRING_KEY_FLOOR_5 !== 360) {
    errors.push("uiStringKeyMin must be 360");
  }
  if (i18nShip.localeMin !== 8 || LOCALE_FLOOR_5 !== 8) errors.push("localeMin must be 8");
  if (i18nShip.a11yStringKeyMin !== 30 || A11Y_STRING_KEY_FLOOR_5 !== 30) {
    errors.push("a11yStringKeyMin must be 30");
  }
  if ((index.keyMin ?? 0) < 360) errors.push("ui-strings.json keyMin must be ≥360");

  const localeBundles = Object.fromEntries(
    LOCALES.map((loc) => [
      loc,
      readJson(resolve(root, `shared/i18n/ui-strings.${loc}.json`)),
    ]),
  ) as Record<(typeof LOCALES)[number], any>;
  const enKeys = Object.keys(localeBundles.en.strings ?? {});
  if (enKeys.length < 360) errors.push(`en keys ${enKeys.length} < 360`);
  if (UI_STRING_KEYS.length < 360) errors.push(`runtime UI_STRING_KEYS ${UI_STRING_KEYS.length} < 360`);
  const enSet = new Set(enKeys);
  for (const loc of LOCALES) {
    const keys = Object.keys(localeBundles[loc].strings ?? {});
    if (keys.length !== enKeys.length) {
      errors.push(`${loc} key count ${keys.length} != en ${enKeys.length}`);
    }
    const set = new Set(keys);
    if (![...enSet].every((k) => set.has(k))) errors.push(`${loc} key parity broken vs en`);
  }
  const a11yKeys = enKeys.filter((k) => k.startsWith("a11y."));
  if (a11yKeys.length < 30) errors.push(`a11y.* keys ${a11yKeys.length} < 30`);

  const measure = measureAndroidI18n(root);
  if (measure.textLiterals > I18N_GROWTH_5.androidTextLiteralsMax) {
    errors.push(`ui/hud Text(" literals ${measure.textLiterals} > 0`);
  }
  for (const sample of [
    "a11y.weeklyGoalsSection",
    "a11y.dashboardLedgerSection",
    "a11y.warehouseSection",
    "a11y.frictionNudgeLive",
  ]) {
    if (!uiKt.includes(`"${sample}"`)) errors.push(`UiStrings.kt missing ${sample}`);
  }

  if ((I18N_GROWTH_5.softFloors?.i18nGrowth4KeyMin ?? 0) < 280) {
    errors.push("soft floor i18n growth 4 min must stay ≥280");
  }
  if ((I18N_GROWTH_5.softFloors?.i18nScaffoldKeyMin ?? 0) < 48) {
    errors.push("soft floor i18n scaffold min must stay ≥48");
  }

  if (!questWeb.includes("a11y.weeklyGoalsSection") || !questWeb.includes('aria-live="polite"')) {
    errors.push("QuestLogPanel missing weekly goals a11y live region");
  }
  if (!questWeb.includes("a11y.endgameSection")) errors.push("QuestLogPanel missing endgame a11y");
  if (!dashWeb.includes("a11y.dashboardLedgerSection")) {
    errors.push("BusinessDashboardPanel missing ledger a11y");
  }
  if (!warehouseWeb.includes("a11y.warehouseSection") || !warehouseWeb.includes("panels.warehouse")) {
    errors.push("WarehousePanel missing a11y wiring");
  }
  if (!appWeb.includes("a11y.frictionNudgeLive") || !appWeb.includes('aria-live="polite"')) {
    errors.push("App missing friction nudge live region");
  }
  if (!questKt.includes("a11y.weeklyGoalsSection") || !questKt.includes("LiveRegionMode.Polite")) {
    errors.push("Android QuestLogPanel missing weekly live region");
  }
  if (!questKt.includes("a11y.endgameSection")) errors.push("Android QuestLogPanel missing endgame a11y");
  if (!dashKt.includes("a11y.dashboardLedgerSection")) {
    errors.push("Android BusinessDashboardPanel missing ledger a11y");
  }
  if (!warehouseKt.includes('a11yPane("panels.warehouse")') || !warehouseKt.includes("a11y.warehouseSection")) {
    errors.push("Android WarehousePanel missing a11yPane/section");
  }
  if (!gameKt.includes("a11y.frictionNudgeLive") || !gameKt.includes("LiveRegionMode.Polite")) {
    errors.push("Android GameScreen missing friction nudge live region");
  }

  if (kickoff.gaps?.a11yI18n5Incomplete !== false) {
    errors.push("kickoff.gaps.a11yI18n5Incomplete must be false");
  }
  const phase24 = (kickoff.phases as any[])?.find((p) => p.phase === 24);
  if (!phase24 || phase24.validate !== "a11yi18n5:validate") {
    errors.push("kickoff phase 24 validate must be a11yi18n5:validate");
  }
  if (phase24?.id !== "a11y-i18n-5") errors.push("kickoff phase 24 id must be a11y-i18n-5");
  if (!finish5Kt.includes("a11yi18n5:validate")) {
    errors.push("Finish5Kickoff.kt missing a11yi18n5:validate");
  }
  if (finish5Kt.includes('"a11yI18n5Incomplete"')) {
    errors.push("Finish5Kickoff.kt OPEN_GAP_FLAGS must drop a11yI18n5Incomplete");
  }
  if ((kickoff.baseline?.i18nUiKeys ?? 0) < 360) {
    errors.push("kickoff.baseline.i18nUiKeys must be ≥360");
  }

  if (listing.a11yDepth4Phase !== 24) errors.push("listing.a11yDepth4Phase must be 24");
  if (listing.i18nGrowth5Phase !== 24) errors.push("listing.i18nGrowth5Phase must be 24");
  if (listing.a11yDepth4Catalog !== "shared/ship/a11y-depth-4.json") {
    errors.push("listing.a11yDepth4Catalog mismatch");
  }
  if (listing.i18nGrowth5Catalog !== "shared/ship/i18n-growth-5.json") {
    errors.push("listing.i18nGrowth5Catalog mismatch");
  }
  if (pin.a11yDepth4 !== "shared/ship/a11y-depth-4.json") errors.push("RELEASE_PIN.a11yDepth4 missing");
  if (pin.i18nGrowth5 !== "shared/ship/i18n-growth-5.json") errors.push("RELEASE_PIN.i18nGrowth5 missing");
  if (!pin.fixtures?.includes("parity-a11y-depth-4.json")) {
    errors.push("RELEASE_PIN missing parity-a11y-depth-4.json");
  }
  if (!pin.fixtures?.includes("parity-i18n-growth-5.json")) {
    errors.push("RELEASE_PIN missing parity-i18n-growth-5.json");
  }

  if (!dod.a11yDepth4 || dod.a11yDepth4.status !== "complete") errors.push("DoD a11yDepth4 incomplete");
  if (!dod.i18nGrowth5 || dod.i18nGrowth5.status !== "complete") errors.push("DoD i18nGrowth5 incomplete");
  if ((dod.quotas?.a11yDepth4Screens ?? 0) < 5) errors.push("DoD quotas.a11yDepth4Screens < 5");
  if ((dod.quotas?.a11yDepth4ContrastPairs ?? 0) < 2) errors.push("DoD quotas.a11yDepth4ContrastPairs < 2");
  if ((dod.quotas?.i18nUiKeysGrowth5 ?? 0) < 360) errors.push("DoD quotas.i18nUiKeysGrowth5 < 360");

  if (!pkg.scripts?.["a11yi18n5:validate"]) errors.push("package.json missing a11yi18n5:validate");
  if (!ci.includes("a11yi18n5:validate")) errors.push("ci.yml missing a11yi18n5:validate");
  if (!ci.includes("a11yi18n4:validate")) errors.push("ci.yml missing soft a11yi18n4:validate");
  if (!existsSync(resolve(root, "shared/tools/author_a11y_i18n_5.py"))) {
    errors.push("missing author_a11y_i18n_5.py");
  }
  if (a11yFx.expect?.a11yI18n5Incomplete !== false) {
    errors.push("parity a11yI18n5Incomplete must be false");
  }
  if (i18nFx.expect?.uiStringKeyMin !== 360) errors.push("parity uiStringKeyMin must be 360");

  const gates = [
    ...((a11yShip.preflightGates as string[]) ?? []),
    ...((i18nShip.preflightGates as string[]) ?? []),
  ];
  for (const gate of gates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  void A11Y_DEPTH_4;
  void accessibilityDepth4;
  void readdirSync;
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("a11yi18n5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK a11yi18n5:validate — a11y depth 4 + i18n ≥360 wired");
