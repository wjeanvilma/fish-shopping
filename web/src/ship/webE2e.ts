/**
 * Finish 3.0 Phase 22 — Web Playwright E2E smoke
 * (mirrors shared/ship/web-e2e.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/web-e2e.json";
import { SCHEMA_VERSION } from "../engine";
import { WEB_E2E_ID_LIST, WEB_E2E_IDS } from "../e2e/webE2eIds";

export interface WebE2eCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  webE2eMarker: string;
  closesGap: string;
  idsModule: string;
  playwrightConfig: string;
  smokeSpec: string;
  npmScript: string;
  installBrowsersScript: string;
  minIdCount: number;
  scenarios: string[];
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const WEB_E2E = catalogJson as unknown as WebE2eCatalog;
export const WEB_E2E_PHASE = WEB_E2E.phase;
export const WEB_E2E_SCHEMA = WEB_E2E.schema;
export const WEB_E2E_MARKER = WEB_E2E.webE2eMarker;
export const WEB_E2E_CLOSES_GAP = WEB_E2E.closesGap;

export interface WebE2eMeasure {
  schemaVersion: number;
  idsPresent: boolean;
  idCountOk: boolean;
  smokePresent: boolean;
  configPresent: boolean;
  titleWired: boolean;
  appWired: boolean;
  packageWired: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureWebE2e(repoRoot: string): WebE2eMeasure {
  const idsPath = resolve(repoRoot, WEB_E2E.idsModule);
  const smokePath = resolve(repoRoot, WEB_E2E.smokeSpec);
  const configPath = resolve(repoRoot, WEB_E2E.playwrightConfig);
  const titlePath = resolve(repoRoot, "web/src/ui/TitlePanels.tsx");
  const appPath = resolve(repoRoot, "web/src/ui/App.tsx");
  const pkgPath = resolve(repoRoot, "web/package.json");

  const ids = existsSync(idsPath) ? readFileSync(idsPath, "utf8") : "";
  const smoke = existsSync(smokePath) ? readFileSync(smokePath, "utf8") : "";
  const config = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const title = existsSync(titlePath) ? readFileSync(titlePath, "utf8") : "";
  const app = existsSync(appPath) ? readFileSync(appPath, "utf8") : "";
  const pkg = existsSync(pkgPath) ? readJson(pkgPath) : {};

  let measuredAtPhase = -1;
  let kickoffWired = false;
  let gapClosed = false;
  try {
    const kickoff = readJson(resolve(repoRoot, WEB_E2E.kickoffCatalog));
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    gapClosed = kickoff.gaps?.webE2eMissing === false;
    const phase22 = (kickoff.phases as any[])?.find((p: any) => p.phase === 22);
    kickoffWired =
      measuredAtPhase >= 22 &&
      phase22?.id === "web-e2e" &&
      phase22?.validate === "webe2e:validate" &&
      gapClosed;
  } catch {
    kickoffWired = false;
  }

  const missingGates = WEB_E2E.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    idsPresent:
      ids.includes("TITLE_PLAY") &&
      ids.includes("NAV_PAUSE") &&
      ids.includes("PAUSE_RESUME") &&
      WEB_E2E_IDS.TITLE_PLAY === "title.play",
    idCountOk: WEB_E2E_ID_LIST.length >= WEB_E2E.minIdCount,
    smokePresent:
      smoke.includes("title play reaches ready HUD") &&
      smoke.includes("analytics decline then play") &&
      smoke.includes("getByTestId") &&
      smoke.includes("WEB_E2E_IDS"),
    configPresent:
      config.includes("swiftshader") &&
      config.includes("webServer") &&
      config.includes('testDir: "./e2e"'),
    titleWired:
      title.includes("WEB_E2E_IDS") &&
      title.includes("data-testid={WEB_E2E_IDS.TITLE_PLAY}") &&
      title.includes("TITLE_ANALYTICS_DECLINE"),
    appWired:
      app.includes("WEB_E2E_IDS") &&
      app.includes("NAV_PAUSE") &&
      app.includes("HUD_TOOLBAR"),
    packageWired:
      !!pkg.devDependencies?.["@playwright/test"] &&
      pkg.scripts?.["e2e:smoke"] === "playwright test" &&
      !!pkg.scripts?.["e2e:install"] &&
      !!pkg.scripts?.["webe2e:validate"],
    gapClosed,
    kickoffWired,
    measuredAtPhase,
    missingGates,
  };
}
