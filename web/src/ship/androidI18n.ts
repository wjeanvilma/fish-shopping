/**
 * Finish 3.0 Phase 5 — Android i18n completion
 * (mirrors shared/ship/android-i18n.json).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import catalogJson from "../../../shared/ship/android-i18n.json";

export interface AndroidI18nCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  androidI18nMarker: string;
  hudPackageRoot: string;
  uiStringsIndex: string;
  uiStringsEn: string;
  uiStringsEs: string;
  uiStringsKotlin: string;
  uiStringKeyMin: number;
  androidTextLiteralsMax: number;
  textLiteralPattern: string;
  kickoffCatalog: string;
  gapFlagClosed: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const ANDROID_I18N = catalogJson as unknown as AndroidI18nCatalog;
export const ANDROID_I18N_PHASE = ANDROID_I18N.phase;
export const ANDROID_I18N_SCHEMA = ANDROID_I18N.schema;
export const ANDROID_I18N_MARKER = ANDROID_I18N.androidI18nMarker;

export interface AndroidI18nMeasure {
  enKeys: number;
  esKeys: number;
  keysEnough: boolean;
  keyParity: boolean;
  textLiterals: number;
  textLiteralsOk: boolean;
  uiStringsCalls: number;
  gapClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureAndroidI18n(repoRoot: string): AndroidI18nMeasure {
  const enPath = resolve(repoRoot, ANDROID_I18N.uiStringsEn);
  const esPath = resolve(repoRoot, ANDROID_I18N.uiStringsEs);
  const en = existsSync(enPath) ? readJson(enPath) : { strings: {} };
  const es = existsSync(esPath) ? readJson(esPath) : { strings: {} };
  const enKeysList = Object.keys(en.strings ?? {});
  const esKeysList = Object.keys(es.strings ?? {});
  const enSet = new Set(enKeysList);
  const esSet = new Set(esKeysList);
  const keyParity =
    enKeysList.length === esKeysList.length &&
    enKeysList.every((k) => esSet.has(k)) &&
    esKeysList.every((k) => enSet.has(k));

  const hudRoot = resolve(repoRoot, ANDROID_I18N.hudPackageRoot);
  const literalRe = new RegExp(ANDROID_I18N.textLiteralPattern, "g");
  let textLiterals = 0;
  let uiStringsCalls = 0;
  if (existsSync(hudRoot)) {
    for (const name of readdirSync(hudRoot).filter((n) => n.endsWith(".kt"))) {
      const body = readFileSync(join(hudRoot, name), "utf8");
      textLiterals += (body.match(literalRe) ?? []).length;
      uiStringsCalls += (body.match(/UiStrings\.t\(/g) ?? []).length;
    }
  }

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, ANDROID_I18N.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.[ANDROID_I18N.gapFlagClosed] === false;
  }

  const missingGates: string[] = [];
  for (const gate of ANDROID_I18N.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    enKeys: enKeysList.length,
    esKeys: esKeysList.length,
    keysEnough:
      enKeysList.length >= ANDROID_I18N.uiStringKeyMin &&
      esKeysList.length >= ANDROID_I18N.uiStringKeyMin,
    keyParity,
    textLiterals,
    textLiteralsOk: textLiterals <= ANDROID_I18N.androidTextLiteralsMax,
    uiStringsCalls,
    gapClosed,
    missingGates,
  };
}
