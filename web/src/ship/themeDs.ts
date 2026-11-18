/**
 * Finish 3.0 Phase 7 — dark theme + design-system
 * (mirrors shared/ship/theme-ds.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/theme-ds.json";

export interface ThemeDsCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  themeDsMarker: string;
  designTokensPath: string;
  themePreferences: string[];
  defaultThemePreference: string;
  requiredColorDarkKeys: string[];
  designSystemComponents: string[];
  androidThemePath: string;
  androidDesignSystemPath: string;
  webStylesPath: string;
  webHudPrimitivesPath: string;
  kickoffCatalog: string;
  gapFlagClosed: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const THEME_DS = catalogJson as unknown as ThemeDsCatalog;
export const THEME_DS_PHASE = THEME_DS.phase;
export const THEME_DS_SCHEMA = THEME_DS.schema;
export const THEME_DS_MARKER = THEME_DS.themeDsMarker;

export interface ThemeDsMeasure {
  darkKeysPresent: boolean;
  darkKeyCount: number;
  themePrefsOk: boolean;
  androidThemeWired: boolean;
  androidDsWired: boolean;
  webDarkCss: boolean;
  webDsWired: boolean;
  settingsAndroid: boolean;
  settingsWeb: boolean;
  gapClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureThemeDs(repoRoot: string): ThemeDsMeasure {
  const tokensPath = resolve(repoRoot, THEME_DS.designTokensPath);
  const tokens = existsSync(tokensPath) ? readJson(tokensPath) : {};
  const dark = tokens.colorDark ?? {};
  const darkKeys = Object.keys(dark);
  const darkKeysPresent = THEME_DS.requiredColorDarkKeys.every((k) => dark[k]?.value);

  const themePrefs = tokens.theme?.preferences ?? [];
  const themePrefsOk =
    THEME_DS.themePreferences.every((p) => themePrefs.includes(p)) &&
    tokens.theme?.defaultPreference === THEME_DS.defaultThemePreference;

  const androidTheme = existsSync(resolve(repoRoot, THEME_DS.androidThemePath))
    ? readFileSync(resolve(repoRoot, THEME_DS.androidThemePath), "utf8")
    : "";
  const androidDs = existsSync(resolve(repoRoot, THEME_DS.androidDesignSystemPath))
    ? readFileSync(resolve(repoRoot, THEME_DS.androidDesignSystemPath), "utf8")
    : "";
  const webStyles = existsSync(resolve(repoRoot, THEME_DS.webStylesPath))
    ? readFileSync(resolve(repoRoot, THEME_DS.webStylesPath), "utf8")
    : "";
  const webHud = existsSync(resolve(repoRoot, THEME_DS.webHudPrimitivesPath))
    ? readFileSync(resolve(repoRoot, THEME_DS.webHudPrimitivesPath), "utf8")
    : "";
  const settingsAndroid = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/persistence/SettingsStore.kt"),
  )
    ? readFileSync(
        resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/persistence/SettingsStore.kt"),
        "utf8",
      )
    : "";
  const settingsWeb = existsSync(resolve(repoRoot, "web/src/game/settingsStore.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/game/settingsStore.ts"), "utf8")
    : "";

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, THEME_DS.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.[THEME_DS.gapFlagClosed] === false;
  }

  const missingGates: string[] = [];
  for (const gate of THEME_DS.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    darkKeysPresent,
    darkKeyCount: darkKeys.length,
    themePrefsOk,
    androidThemeWired:
      androidTheme.includes("darkColorScheme") &&
      androidTheme.includes("resolveDarkTheme") &&
      androidTheme.includes("ThemePreference"),
    androidDsWired:
      androidDs.includes("DsPanel") &&
      androidDs.includes("DsPill") &&
      androidDs.includes("DsPrimaryButton") &&
      androidDs.includes("DsGhostButton") &&
      androidDs.includes("DsScrim"),
    webDarkCss: webStyles.includes('[data-theme="dark"]') && webStyles.includes("--surface:"),
    webDsWired:
      webHud.includes("export function Panel") &&
      webHud.includes("export function Pill") &&
      webHud.includes("export function PrimaryButton") &&
      webHud.includes("export function GhostButton") &&
      webHud.includes("export function Scrim"),
    settingsAndroid:
      settingsAndroid.includes("ThemePreference") && settingsAndroid.includes("themePreference"),
    settingsWeb:
      settingsWeb.includes("ThemePreference") &&
      settingsWeb.includes("themePreference") &&
      settingsWeb.includes("applyThemeFromSettings"),
    gapClosed,
    missingGates,
  };
}
