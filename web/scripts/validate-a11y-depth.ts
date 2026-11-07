/**
 * Finish 2.0 Phase 24 — a11y depth readiness.
 *
 * Usage:
 *   npm run a11y2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  A11Y_DEPTH,
  A11Y_DEPTH_MARKER,
  A11Y_DEPTH_PHASE,
  A11Y_DEPTH_SCHEMA,
  CONTRAST_PAIR_FLOOR,
  LIVE_REGION_FLOOR,
  SCREEN_SURFACE_FLOOR,
  UI_A11Y_STRING_FLOOR,
} from "../src/ship/a11yDepth";
import {
  A11Y_DEPTH_CONTENT_PHASE,
  A11Y_DEPTH_LIVE_REGIONS,
  A11Y_DEPTH_SCREEN_IDS,
  accessibilityDepth,
  depthContrastFailures,
} from "../src/presenters/accessibilityDepth";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";
import { UI_STRING_KEYS } from "../src/i18n/strings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/a11y-depth.json"));
  const depth = readJson(resolve(root, "shared/a11y/accessibility-depth.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-a11y-depth.json"));
  const sweep = readJson(resolve(root, "shared/a11y/accessibility-sweep.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const css = readFileSync(resolve(root, "web/src/ui/styles.css"), "utf8");
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const gameScreen = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );

  if (catalog.phase !== 24) errors.push(`phase expected 24, got ${catalog.phase}`);
  if (catalog.schema !== A11Y_DEPTH_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (A11Y_DEPTH_PHASE !== 24) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.a11yDepthMarker !== A11Y_DEPTH_MARKER) errors.push("marker mismatch");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsCatalog !== "shared/a11y/accessibility-sweep.json") {
    errors.push("extendsCatalog must point at accessibility-sweep");
  }
  if (sweep.phase !== 16) errors.push("accessibility-sweep phase must stay 16");
  if (depth.phase !== 24 || A11Y_DEPTH_CONTENT_PHASE !== 24) {
    errors.push("depth catalog phase must be 24");
  }
  if (catalog.screenSurfaceMin !== 9 || SCREEN_SURFACE_FLOOR !== 9) {
    errors.push("screenSurfaceMin must be 9");
  }
  if (catalog.contrastPairMin !== 4 || CONTRAST_PAIR_FLOOR !== 4) {
    errors.push("contrastPairMin must be 4");
  }
  if (catalog.uiA11yStringKeyMin !== 12 || UI_A11Y_STRING_FLOOR !== 12) {
    errors.push("uiA11yStringKeyMin must be 12");
  }
  if (catalog.liveRegionMin !== 3 || LIVE_REGION_FLOOR !== 3) {
    errors.push("liveRegionMin must be 3");
  }

  const surfaces = depth.screenSurfaces as { id: string }[];
  if (surfaces.length < 9) errors.push(`screenSurfaces ${surfaces.length} < 9`);
  for (const id of fixture.expect.screenIds as string[]) {
    if (!surfaces.some((s) => s.id === id)) errors.push(`missing screen surface ${id}`);
    if (!A11Y_DEPTH_SCREEN_IDS.includes(id)) errors.push(`runtime missing screen ${id}`);
  }

  const pairs = depth.contrastPairs as { id: string }[];
  if (pairs.length < 4) errors.push(`contrastPairs ${pairs.length} < 4`);
  for (const id of fixture.expect.contrastPairIds as string[]) {
    if (!pairs.some((p) => p.id === id)) errors.push(`missing contrast pair ${id}`);
  }
  const fails = depthContrastFailures();
  for (const f of fails) errors.push(`contrast fail ${f.id}`);

  for (const key of fixture.expect.requiredUiKeys as string[]) {
    if (!UI_STRING_KEYS.includes(key)) errors.push(`ui strings missing ${key}`);
  }
  const live = depth.liveRegions as string[];
  if (live.length < 3) errors.push("liveRegions < 3");
  for (const id of fixture.expect.liveRegions as string[]) {
    if (!live.includes(id)) errors.push(`missing live region ${id}`);
    if (!A11Y_DEPTH_LIVE_REGIONS.includes(id)) errors.push(`runtime missing live ${id}`);
  }

  if (!css.includes("--muted: #4a5d68") && !css.includes("--muted:#4a5d68")) {
    errors.push("styles.css must define --muted #4a5d68 for AA muted text");
  }
  if (!css.includes("--reward-text") && !css.includes("reward-text")) {
    errors.push("styles.css must define --reward-text for AA reward copy");
  }
  if (!app.includes('t("hud.weatherTide")') || !app.includes('t("panels.codex")')) {
    errors.push("App.tsx missing weather/codex a11y labels");
  }
  if (!app.includes('t("nav.jobs")') || !app.includes('t("a11y.failStreak"')) {
    errors.push("App.tsx missing jobs/fail-streak a11y");
  }
  if (!app.includes("festival_hud") || !app.includes('aria-live="polite"')) {
    errors.push("App.tsx missing festival live region wiring");
  }
  if (!gameScreen.includes("a11yPane") || !gameScreen.includes("paneTitle")) {
    errors.push("GameScreen missing a11yPane / paneTitle");
  }
  if (!gameScreen.includes("hud.weatherTide") || !gameScreen.includes("LiveRegionMode")) {
    errors.push("GameScreen missing weather live region");
  }

  if ((dod.quotas?.a11yDepthScreens ?? 0) < 9) {
    errors.push("DoD quotas.a11yDepthScreens must be ≥ 9");
  }
  if ((dod.quotas?.a11yContrastPairs ?? 0) < 4) {
    errors.push("DoD quotas.a11yContrastPairs must be ≥ 4");
  }
  if (listing.a11yDepthPhase !== 24) errors.push("listing.a11yDepthPhase must be 24");
  if (listing.a11yDepthCatalog !== "shared/ship/a11y-depth.json") {
    errors.push("listing.a11yDepthCatalog mismatch");
  }
  if (!ci.includes("a11y2:validate")) errors.push("ci.yml missing a11y2:validate");
  if (!ci.includes("a11y:validate")) errors.push("ci.yml missing baseline a11y:validate");
  if (!pin.fixtures?.includes("parity-a11y-depth.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-a11y-depth.json");
  }
  if (pin.a11yDepth !== "shared/ship/a11y-depth.json") {
    errors.push("RELEASE_PIN.a11yDepth path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");
  if (accessibilityDepth.simHzInvariant !== 20) errors.push("depth simHzInvariant must be 20");
  if (A11Y_DEPTH.depthCatalog !== "shared/a11y/accessibility-depth.json") {
    errors.push("depthCatalog path mismatch");
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("a11y2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK a11y2:validate — 2.0 screen TalkBack/keyboard + contrast depth");
