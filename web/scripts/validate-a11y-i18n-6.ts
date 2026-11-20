/**
 * Finish 6.0 Phase 22 — a11y depth 5 + i18n key growth (≥400) readiness.
 *
 * Usage:
 *   npm run a11yi18n6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  A11Y_DEPTH_5,
  A11Y_DEPTH_5_MARKER,
  A11Y_DEPTH_5_PHASE,
  A11Y_DEPTH_5_SCHEMA,
  CONTRAST_PAIR_FLOOR_5,
  LIVE_REGION_FLOOR_5,
  SCREEN_SURFACE_FLOOR_5,
  UI_A11Y_STRING_FLOOR_5,
} from "../src/ship/a11yDepth5";
import {
  A11Y_STRING_KEY_FLOOR_6,
  I18N_GROWTH_6,
  I18N_GROWTH_6_MARKER,
  I18N_GROWTH_6_PHASE,
  I18N_GROWTH_6_SCHEMA,
  LOCALE_FLOOR_6,
  UI_STRING_KEY_FLOOR_6,
} from "../src/ship/i18nGrowth6";
import {
  A11Y_DEPTH_5_LIVE_REGIONS,
  A11Y_DEPTH_5_SCREEN_IDS,
  accessibilityDepth5,
  depth5ContrastFailures,
} from "../src/presenters/accessibilityDepth5";
import { depth4ContrastFailures } from "../src/presenters/accessibilityDepth4";
import { UI_STRING_KEYS } from "../src/i18n/strings";
import { measureAndroidI18n } from "../src/ship/androidI18n";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const LOCALES = ["en", "es", "pt", "fr", "ht", "it", "ca", "ru"] as const;

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const a11yShip = readJson(resolve(root, "shared/ship/a11y-depth-5.json"));
  const i18nShip = readJson(resolve(root, "shared/ship/i18n-growth-6.json"));
  const depth = readJson(resolve(root, "shared/a11y/accessibility-depth-5.json"));
  const a11yFx = readJson(resolve(root, "shared/fixtures/parity-a11y-depth-5.json"));
  const i18nFx = readJson(resolve(root, "shared/fixtures/parity-i18n-growth-6.json"));
  const index = readJson(resolve(root, "shared/i18n/ui-strings.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const uiKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/UiStrings.kt"),
    "utf8",
  );
  const questWeb = readFileSync(resolve(root, "web/src/ui/QuestLogPanel.tsx"), "utf8");
  const dashWeb = readFileSync(resolve(root, "web/src/ui/BusinessDashboardPanel.tsx"), "utf8");
  const titleWeb = readFileSync(resolve(root, "web/src/ui/TitlePanels.tsx"), "utf8");
  const offlineWeb = readFileSync(resolve(root, "web/src/ui/OfflineSummaryPanel.tsx"), "utf8");
  const staffWeb = readFileSync(resolve(root, "web/src/ui/StaffPanel.tsx"), "utf8");
  const questKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt"),
    "utf8",
  );
  const dashKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt"),
    "utf8",
  );
  const titleKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt"),
    "utf8",
  );
  const offlineKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/OfflineSummaryPanel.kt"),
    "utf8",
  );

  if (a11yShip.phase !== 22 || i18nShip.phase !== 22) errors.push("phase expected 22");
  if (a11yShip.schema !== A11Y_DEPTH_5_SCHEMA) errors.push("a11y schema mismatch");
  if (i18nShip.schema !== I18N_GROWTH_6_SCHEMA) errors.push("i18n schema mismatch");
  if (a11yShip.plan !== "30_finish_6.0" || i18nShip.plan !== "30_finish_6.0") {
    errors.push("plan must be 30_finish_6.0");
  }
  if (A11Y_DEPTH_5_PHASE !== 22 || I18N_GROWTH_6_PHASE !== 22) errors.push("phase mirror mismatch");
  if (a11yShip.a11yDepth5Marker !== A11Y_DEPTH_5_MARKER) errors.push("a11y marker mismatch");
  if (i18nShip.i18nGrowth6Marker !== I18N_GROWTH_6_MARKER) errors.push("i18n marker mismatch");
  if (a11yFx.a11yDepth5Marker !== A11Y_DEPTH_5_MARKER) errors.push("a11y fixture marker mismatch");
  if (i18nFx.i18nGrowth6Marker !== I18N_GROWTH_6_MARKER) errors.push("i18n fixture marker mismatch");
  if (a11yShip.contentVersion !== "5.0.0" || i18nShip.contentVersion !== "5.0.0") {
    errors.push("contentVersion must stay 5.0.0");
  }
  if (a11yShip.schemaVersion !== 27 || i18nShip.schemaVersion !== 27) {
    errors.push("schemaVersion must stay 27");
  }
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");

  if (a11yShip.screenSurfaceMin !== 6 || SCREEN_SURFACE_FLOOR_5 !== 6) {
    errors.push("screenSurfaceMin must be 6");
  }
  if (a11yShip.contrastPairMin !== 3 || CONTRAST_PAIR_FLOOR_5 !== 3) {
    errors.push("contrastPairMin must be 3");
  }
  if (a11yShip.liveRegionMin !== 3 || LIVE_REGION_FLOOR_5 !== 3) {
    errors.push("liveRegionMin must be 3");
  }
  if (a11yShip.uiA11yStringKeyMin !== 40 || UI_A11Y_STRING_FLOOR_5 !== 40) {
    errors.push("uiA11yStringKeyMin must be 40");
  }
  if ((depth.screenSurfaces?.length ?? 0) < 6) errors.push("depth screenSurfaces must be ≥6");
  if ((depth.contrastPairs?.length ?? 0) < 3) errors.push("depth contrastPairs must be ≥3");
  if ((depth.liveRegions?.length ?? 0) < 3) errors.push("depth liveRegions must be ≥3");
  if (A11Y_DEPTH_5_SCREEN_IDS.length < 6) errors.push("A11Y_DEPTH_5_SCREEN_IDS below floor");
  if (A11Y_DEPTH_5_LIVE_REGIONS.length < 3) errors.push("A11Y_DEPTH_5_LIVE_REGIONS below floor");
  if (!A11Y_DEPTH_5_SCREEN_IDS.includes("nest_treasury")) errors.push("missing nest_treasury surface");
  if (!A11Y_DEPTH_5_LIVE_REGIONS.includes("nest_conflict")) errors.push("missing nest_conflict live region");

  const contrastFails = depth5ContrastFailures();
  if (contrastFails.length) {
    for (const p of contrastFails) errors.push(`contrast fail ${p.id}`);
  }
  // Soft-floor prior depth-4 pairs remain green.
  if (depth4ContrastFailures().length) errors.push("depth-4 contrast soft-floor failed");

  const en = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));
  const enKeys = Object.keys(en.strings ?? {});
  if (enKeys.length < UI_STRING_KEY_FLOOR_6) {
    errors.push(`ui keys ${enKeys.length} < ${UI_STRING_KEY_FLOOR_6}`);
  }
  if (UI_STRING_KEYS.length < UI_STRING_KEY_FLOOR_6) {
    errors.push(`UI_STRING_KEYS ${UI_STRING_KEYS.length} < ${UI_STRING_KEY_FLOOR_6}`);
  }
  if ((index.keyMin ?? 0) < 400) errors.push("ui-strings.json keyMin must be ≥400");
  const a11yKeys = enKeys.filter((k) => k.startsWith("a11y."));
  if (a11yKeys.length < A11Y_STRING_KEY_FLOOR_6) {
    errors.push(`a11y.* keys ${a11yKeys.length} < ${A11Y_STRING_KEY_FLOOR_6}`);
  }
  for (const loc of LOCALES) {
    const doc = readJson(resolve(root, `shared/i18n/ui-strings.${loc}.json`));
    const n = Object.keys(doc.strings ?? {}).length;
    if (n !== enKeys.length) errors.push(`${loc} key count ${n} ≠ en ${enKeys.length}`);
  }
  if (LOCALES.length < LOCALE_FLOOR_6) errors.push("locale floor");

  for (const key of [
    "a11y.nestTreasurySection",
    "a11y.nestConflictSection",
    "a11y.nestConflictLive",
    "a11y.nestLoanSection",
    "a11y.offlineNestJournal",
    "a11y.staffTrainSection",
  ]) {
    if (!en.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
    if (!uiKt.includes(key)) errors.push(`UiStrings.kt missing ${key}`);
  }

  if (!questWeb.includes("a11y.nestLoanSection")) errors.push("QuestLogPanel web missing nest loan a11y");
  if (!dashWeb.includes("a11y.nestTreasurySection")) errors.push("Dashboard web missing nest treasury a11y");
  if (!titleWeb.includes("a11y.nestConflictSection")) errors.push("TitlePanels web missing nest conflict a11y");
  if (!offlineWeb.includes("a11y.offlineNestJournal")) errors.push("OfflineSummary web missing nest journal a11y");
  if (!staffWeb.includes("a11y.staffTrainSection")) errors.push("StaffPanel web missing staff train a11y");
  if (!questKt.includes("a11y.nestLoanSection")) errors.push("QuestLogPanel kt missing nest loan a11y");
  if (!dashKt.includes("a11y.nestTreasurySection")) errors.push("Dashboard kt missing nest treasury a11y");
  if (!titleKt.includes("a11y.nestConflictLive")) errors.push("TitlePanels kt missing nest conflict live");
  if (!offlineKt.includes("a11y.offlineNestJournal")) errors.push("OfflineSummary kt missing nest journal a11y");

  const android = measureAndroidI18n(root);
  if (android.textLiterals > I18N_GROWTH_6.androidTextLiteralsMax) {
    errors.push(`Android hud Text(" literals ${android.textLiterals} > 0`);
  }

  if (kickoff.gaps?.a11yI18n6Incomplete !== false) {
    errors.push("kickoff.gaps.a11yI18n6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("a11yI18n6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop a11yI18n6Incomplete after Phase 22");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("a11yI18n6Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop a11yI18n6Incomplete");
  }
  const phase22 = (kickoff.phases as any[])?.find((p) => p.phase === 22);
  if (!phase22 || phase22.validate !== "a11yi18n6:validate") {
    errors.push("kickoff phase 22 validate must be a11yi18n6:validate");
  }
  if (phase22?.id !== "a11y-i18n-6") errors.push("kickoff phase 22 id must be a11y-i18n-6");
  if (!finish6Kt.includes("a11yi18n6:validate")) {
    errors.push("Finish6Kickoff.kt missing a11yi18n6:validate");
  }

  if (listing.a11yDepth5Phase !== 22) errors.push("listing.a11yDepth5Phase must be 22");
  if (listing.i18nGrowth6Phase !== 22) errors.push("listing.i18nGrowth6Phase must be 22");
  if (!dod.a11yDepth5 || dod.a11yDepth5.status !== "complete") {
    errors.push("DoD a11yDepth5 must be complete");
  }
  if (!dod.i18nGrowth6 || dod.i18nGrowth6.status !== "complete") {
    errors.push("DoD i18nGrowth6 must be complete");
  }
  if (!pkg.scripts?.["a11yi18n6:validate"]) errors.push("package.json missing a11yi18n6:validate");
  if (!ci.includes("a11yi18n6:validate")) errors.push("ci.yml missing a11yi18n6:validate");
  if (!ci.includes("a11yi18n5:validate")) errors.push("ci.yml missing soft a11yi18n5:validate");
  if (!existsSync(resolve(root, "shared/tools/author_a11y_i18n_6.py"))) {
    errors.push("missing author_a11y_i18n_6.py");
  }
  if (pin.a11yDepth5 !== "shared/ship/a11y-depth-5.json") errors.push("RELEASE_PIN.a11yDepth5 mismatch");
  if (pin.i18nGrowth6 !== "shared/ship/i18n-growth-6.json") errors.push("RELEASE_PIN.i18nGrowth6 mismatch");
  if (!pin.fixtures?.includes("parity-a11y-depth-5.json")) {
    errors.push("RELEASE_PIN missing parity-a11y-depth-5.json");
  }
  if (!pin.fixtures?.includes("parity-i18n-growth-6.json")) {
    errors.push("RELEASE_PIN missing parity-i18n-growth-6.json");
  }
  if (a11yFx.expect?.screenSurfaceMin !== 6) errors.push("parity screenSurfaceMin must be 6");
  if (i18nFx.expect?.uiStringKeyMin !== 400) errors.push("parity uiStringKeyMin must be 400");
  if (a11yFx.expect?.openGapFlagMin > 7) errors.push("parity openGapFlagMin must be ≤7");
  if (i18nFx.expect?.a11yI18n6Incomplete !== false) {
    errors.push("parity a11yI18n6Incomplete must be false");
  }
  for (const gate of A11Y_DEPTH_5.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  void accessibilityDepth5;

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("a11yi18n6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK a11yi18n6:validate — a11y depth 5 + i18n ≥400 wired");
