/**
 * Finish 3.0 Phase 25 — a11y depth 2 readiness.
 *
 * Usage:
 *   npm run a11ydepth2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  A11Y_DEPTH_2,
  A11Y_DEPTH_2_MARKER,
  A11Y_DEPTH_2_PHASE,
  A11Y_DEPTH_2_SCHEMA,
  CONTRAST_PAIR_FLOOR_2,
  LIVE_REGION_FLOOR_2,
  SCREEN_SURFACE_FLOOR_2,
  UI_A11Y_STRING_FLOOR_2,
} from "../src/ship/a11yDepth2";
import {
  A11Y_DEPTH_2_CONTENT_PHASE,
  A11Y_DEPTH_2_LIVE_REGIONS,
  A11Y_DEPTH_2_SCREEN_IDS,
  accessibilityDepth2,
  depth2ContrastFailures,
} from "../src/presenters/accessibilityDepth2";
import { depthContrastFailures } from "../src/presenters/accessibilityDepth";
import { UI_STRING_KEYS } from "../src/i18n/strings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/a11y-depth-2.json"));
  const depth = readJson(resolve(root, "shared/a11y/accessibility-depth-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-a11y-depth-2.json"));
  const depth1 = readJson(resolve(root, "shared/a11y/accessibility-depth.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const css = readFileSync(resolve(root, "web/src/ui/styles.css"), "utf8");
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const questWeb = readFileSync(resolve(root, "web/src/ui/QuestLogPanel.tsx"), "utf8");
  const settingsWeb = readFileSync(resolve(root, "web/src/ui/PauseSettingsPanels.tsx"), "utf8");
  const mapWeb = readFileSync(resolve(root, "web/src/ui/MapWarehousePanels.tsx"), "utf8");
  const dashWeb = readFileSync(resolve(root, "web/src/ui/BusinessDashboardPanel.tsx"), "utf8");
  const gameScreen = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  const questKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt"),
    "utf8",
  );
  const settingsKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/PauseSettingsPanels.kt"),
    "utf8",
  );
  const mapKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/MapWarehousePanels.kt"),
    "utf8",
  );
  const dashKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt"),
    "utf8",
  );
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/A11yDepth2.kt"),
    "utf8",
  );

  if (catalog.phase !== 25) errors.push(`phase expected 25, got ${catalog.phase}`);
  if (catalog.schema !== A11Y_DEPTH_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (A11Y_DEPTH_2_PHASE !== 25) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.a11yDepth2Marker !== A11Y_DEPTH_2_MARKER) errors.push("marker mismatch");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsCatalog !== "shared/a11y/accessibility-depth.json") {
    errors.push("extendsCatalog must point at accessibility-depth");
  }
  if (depth1.phase !== 24) errors.push("accessibility-depth phase must stay 24");
  if (depth.phase !== 25 || A11Y_DEPTH_2_CONTENT_PHASE !== 25) {
    errors.push("depth-2 catalog phase must be 25");
  }
  if (catalog.screenSurfaceMin !== 7 || SCREEN_SURFACE_FLOOR_2 !== 7) {
    errors.push("screenSurfaceMin must be 7");
  }
  if (catalog.contrastPairMin !== 4 || CONTRAST_PAIR_FLOOR_2 !== 4) {
    errors.push("contrastPairMin must be 4");
  }
  if (catalog.uiA11yStringKeyMin !== 8 || UI_A11Y_STRING_FLOOR_2 !== 8) {
    errors.push("uiA11yStringKeyMin must be 8");
  }
  if (catalog.liveRegionMin !== 1 || LIVE_REGION_FLOOR_2 !== 1) {
    errors.push("liveRegionMin must be 1");
  }

  const surfaces = depth.screenSurfaces as { id: string }[];
  if (surfaces.length < 7) errors.push(`screenSurfaces ${surfaces.length} < 7`);
  for (const id of fixture.expect.screenIds as string[]) {
    if (!surfaces.some((s) => s.id === id)) errors.push(`missing screen surface ${id}`);
    if (!A11Y_DEPTH_2_SCREEN_IDS.includes(id)) errors.push(`runtime missing screen ${id}`);
  }

  const pairs = depth.contrastPairs as { id: string }[];
  if (pairs.length < 4) errors.push(`contrastPairs ${pairs.length} < 4`);
  for (const id of fixture.expect.contrastPairIds as string[]) {
    if (!pairs.some((p) => p.id === id)) errors.push(`missing contrast pair ${id}`);
  }
  const fails = depth2ContrastFailures();
  for (const f of fails) errors.push(`contrast fail ${f.id}`);
  if (depthContrastFailures().length) {
    errors.push("Finish 2.0 depth contrast must stay green");
  }

  for (const key of fixture.expect.requiredUiKeys as string[]) {
    if (!UI_STRING_KEYS.includes(key)) errors.push(`ui strings missing ${key}`);
  }
  const live = depth.liveRegions as string[];
  if (live.length < 1) errors.push("liveRegions < 1");
  for (const id of fixture.expect.liveRegions as string[]) {
    if (!live.includes(id)) errors.push(`missing live region ${id}`);
    if (!A11Y_DEPTH_2_LIVE_REGIONS.includes(id)) errors.push(`runtime missing live ${id}`);
  }

  if (!css.includes("[data-theme=\"dark\"]") && !css.includes("[data-theme='dark']")) {
    errors.push("styles.css must define dark theme tokens");
  }
  if (!css.includes("--ink: #e8f1f6") && !css.includes("--ink:#e8f1f6")) {
    errors.push("styles.css dark --ink must be #e8f1f6");
  }
  if (!css.includes("--muted: #9bb0bc") && !css.includes("--muted:#9bb0bc")) {
    errors.push("styles.css dark --muted must be #9bb0bc");
  }
  if (!css.includes("--surface: #1a2a35") && !css.includes("--surface:#1a2a35")) {
    errors.push("styles.css dark --surface must be #1a2a35");
  }
  if (!css.includes("rival-banner")) {
    errors.push("styles.css must define .rival-banner");
  }

  if (!app.includes('data-a11y-live="rival_pressure"') || !app.includes('t("hud.rivalPressure")')) {
    errors.push("App.tsx missing rival pressure live region");
  }
  if (!app.includes("rivalPressureActive") || !app.includes("activeRivalIds")) {
    errors.push("App.tsx missing rival pressure view wiring");
  }
  if (!questWeb.includes('t("a11y.bankSection")') || !questWeb.includes('t("a11y.trophySection")')) {
    errors.push("QuestLogPanel.tsx missing bank/trophy a11y labels");
  }
  if (!questWeb.includes('t("a11y.decorSection")')) {
    errors.push("QuestLogPanel.tsx missing decor a11y label");
  }
  if (!settingsWeb.includes('t("a11y.themeGroup")')) {
    errors.push("PauseSettingsPanels.tsx missing theme group a11y");
  }
  if (!mapWeb.includes('t("panels.map")') || !dashWeb.includes('t("panels.dashboard")')) {
    errors.push("Map/Dashboard panels missing i18n dialog labels");
  }

  if (!gameScreen.includes("a11y.rivalPressureActive") || !gameScreen.includes("LiveRegionMode")) {
    errors.push("GameScreen missing rival live region");
  }
  if (!gameScreen.includes("rivalPressureActive") || !gameScreen.includes("activeRivalIds")) {
    errors.push("GameScreen missing rival view wiring");
  }
  if (!questKt.includes("a11y.bankSection") || !questKt.includes("a11y.trophySection")) {
    errors.push("QuestLogPanel.kt missing bank/trophy a11y");
  }
  if (!questKt.includes("a11y.decorSection")) {
    errors.push("QuestLogPanel.kt missing decor a11y");
  }
  if (!settingsKt.includes("a11y.themeGroup") || !settingsKt.includes('a11yPane("settings.title")')) {
    errors.push("PauseSettingsPanels.kt missing theme/settings pane a11y");
  }
  if (!mapKt.includes('a11yPane("panels.map")') || !dashKt.includes('a11yPane("panels.dashboard")')) {
    errors.push("Map/Dashboard Android panels missing a11yPane");
  }

  if ((dod.quotas?.a11yDepth2Screens ?? 0) < 7) {
    errors.push("DoD quotas.a11yDepth2Screens must be ≥ 7");
  }
  if ((dod.quotas?.a11yDepth2ContrastPairs ?? 0) < 4) {
    errors.push("DoD quotas.a11yDepth2ContrastPairs must be ≥ 4");
  }
  if (listing.a11yDepth2Phase !== 25) errors.push("listing.a11yDepth2Phase must be 25");
  if (listing.a11yDepth2Catalog !== "shared/ship/a11y-depth-2.json") {
    errors.push("listing.a11yDepth2Catalog mismatch");
  }
  if (!pkg.scripts?.["a11ydepth2:validate"]) {
    errors.push("package.json missing a11ydepth2:validate");
  }
  if (!ci.includes("a11ydepth2:validate")) errors.push("ci.yml missing a11ydepth2:validate");
  if (!ci.includes("a11y2:validate")) errors.push("ci.yml missing baseline a11y2:validate");
  if (!pin.fixtures?.includes("parity-a11y-depth-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-a11y-depth-2.json");
  }
  if (pin.a11yDepth2 !== "shared/ship/a11y-depth-2.json") {
    errors.push("RELEASE_PIN.a11yDepth2 path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be >= 24");
  if (accessibilityDepth2.simHzInvariant !== 20) errors.push("depth-2 simHzInvariant must be 20");
  if (A11Y_DEPTH_2.depthCatalog !== "shared/a11y/accessibility-depth-2.json") {
    errors.push("depthCatalog path mismatch");
  }

  const phase25 = (kickoff.phases as any[])?.find((p: any) => p.phase === 25);
  if (!phase25 || phase25.validate !== "a11ydepth2:validate") {
    errors.push("kickoff phase 25 validate must be a11ydepth2:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 25) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 25");
  }
  if (!finish3Kt.includes("a11ydepth2:validate")) {
    errors.push("Finish3Kickoff.kt phase 25 missing a11ydepth2:validate");
  }
  if (!kotlin.includes("SCREEN_SURFACE_MIN") || !kotlin.includes("A11Y_DEPTH_2_MARKER")) {
    errors.push("Kotlin A11yDepth2 missing constants");
  }

  const block = dod.a11yDepth2;
  if (!block) errors.push("DoD missing a11yDepth2 block");
  else {
    if (block.phase !== 25) errors.push("DoD a11yDepth2.phase must be 25");
    if (block.plan !== "30_finish_3.0") errors.push("DoD a11yDepth2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD a11yDepth2.status must be complete");
    if (block.a11yDepth2Marker !== A11Y_DEPTH_2_MARKER) {
      errors.push("DoD a11yDepth2 marker mismatch");
    }
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("a11ydepth2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK a11ydepth2:validate — Finish 3.0 a11y depth 2 ready");
