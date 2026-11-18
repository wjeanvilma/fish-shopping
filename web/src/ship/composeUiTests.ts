/**
 * Finish 3.0 Phase 21 — Compose UI integration tests
 * (mirrors shared/ship/compose-ui-tests.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/compose-ui-tests.json";
import { SCHEMA_VERSION } from "../engine";

export interface ComposeUiTestsCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  composeUiTestsMarker: string;
  closesGap: string;
  tagsModule: string;
  robolectricSuite: string;
  instrumentedSuite: string;
  gradleUnitTestFilter: string;
  gradleUnitTestTask: string;
  minTagCount: number;
  scenarios: string[];
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const COMPOSE_UI_TESTS = catalogJson as unknown as ComposeUiTestsCatalog;
export const COMPOSE_UI_TESTS_PHASE = COMPOSE_UI_TESTS.phase;
export const COMPOSE_UI_TESTS_SCHEMA = COMPOSE_UI_TESTS.schema;
export const COMPOSE_UI_TESTS_MARKER = COMPOSE_UI_TESTS.composeUiTestsMarker;
export const COMPOSE_UI_CLOSES_GAP = COMPOSE_UI_TESTS.closesGap;

export interface ComposeUiTestsMeasure {
  schemaVersion: number;
  tagsPresent: boolean;
  tagCountOk: boolean;
  robolectricPresent: boolean;
  instrumentedPresent: boolean;
  titleMenuExtracted: boolean;
  buildGradleWired: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureComposeUiTests(repoRoot: string): ComposeUiTestsMeasure {
  const tagsPath = resolve(repoRoot, COMPOSE_UI_TESTS.tagsModule);
  const roboPath = resolve(repoRoot, COMPOSE_UI_TESTS.robolectricSuite);
  const instrPath = resolve(repoRoot, COMPOSE_UI_TESTS.instrumentedSuite);
  const titlePath = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt",
  );
  const buildPath = resolve(repoRoot, "app/build.gradle.kts");
  const tomlPath = resolve(repoRoot, "gradle/libs.versions.toml");

  const tags = existsSync(tagsPath) ? readFileSync(tagsPath, "utf8") : "";
  const robo = existsSync(roboPath) ? readFileSync(roboPath, "utf8") : "";
  const instr = existsSync(instrPath) ? readFileSync(instrPath, "utf8") : "";
  const title = existsSync(titlePath) ? readFileSync(titlePath, "utf8") : "";
  const build = existsSync(buildPath) ? readFileSync(buildPath, "utf8") : "";
  const toml = existsSync(tomlPath) ? readFileSync(tomlPath, "utf8") : "";

  const tagConsts = (tags.match(/const val [A-Z0-9_]+ = "/g) ?? []).length;

  let measuredAtPhase = -1;
  let kickoffWired = false;
  let gapClosed = false;
  try {
    const kickoff = readJson(resolve(repoRoot, COMPOSE_UI_TESTS.kickoffCatalog));
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    gapClosed = kickoff.gaps?.composeUiTestsMissing === false;
    const phase21 = (kickoff.phases as any[])?.find((p: any) => p.phase === 21);
    kickoffWired =
      measuredAtPhase >= 21 &&
      phase21?.id === "compose-ui-tests" &&
      phase21?.validate === "composeui:validate" &&
      gapClosed;
  } catch {
    kickoffWired = false;
  }

  const missingGates = COMPOSE_UI_TESTS.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    tagsPresent:
      tags.includes("TITLE_CONTINUE") &&
      tags.includes("OFFLINE_CONTINUE") &&
      tags.includes("PAUSE_RESUME") &&
      tags.includes("NAV_PAUSE"),
    tagCountOk: tagConsts >= COMPOSE_UI_TESTS.minTagCount,
    robolectricPresent:
      robo.includes("RobolectricTestRunner") &&
      robo.includes("TitleMenuContent") &&
      robo.includes("OfflineSummaryPanel") &&
      robo.includes("PausePanel") &&
      robo.includes("createComposeRule") &&
      // Finish 4.0 Phase 26 soft-floor: HUD nav toolbar suite.
      robo.includes("HudNavToolbarContent"),
    instrumentedPresent:
      instr.includes("TitleMenuInstrumentedTest") &&
      instr.includes("TitleMenuContent") &&
      instr.includes("AndroidJUnit4"),
    titleMenuExtracted:
      title.includes("fun TitleMenuContent") &&
      title.includes("fun TitleAnalyticsConsentContent") &&
      title.includes("ComposeUiTags"),
    buildGradleWired:
      build.includes("isIncludeAndroidResources = true") &&
      (build.includes("libs.robolectric") || build.includes("robolectric")) &&
      toml.includes("robolectric"),
    gapClosed,
    kickoffWired,
    measuredAtPhase,
    missingGates,
  };
}
