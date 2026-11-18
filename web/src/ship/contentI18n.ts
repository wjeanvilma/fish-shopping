/**
 * Finish 3.0 Phase 6 — content i18n + third locale
 * (mirrors shared/ship/content-i18n.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/content-i18n.json";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../i18n/contentStrings";
import { UI_STRING_KEYS, uiStringKeyCount } from "../i18n/strings";

export interface ContentI18nCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  contentI18nMarker: string;
  thirdLocale: string;
  supportedLocales: string[];
  localeCountMin: number;
  contentStringKeyMin: number;
  contentStringsIndex: string;
  contentStringsEn: string;
  contentStringsEs: string;
  contentStringsPt: string;
  uiStringsPt: string;
  listingLocalePt: string;
  contentStringsKotlin: string;
  kickoffCatalog: string;
  gapFlagsClosed: string[];
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const CONTENT_I18N = catalogJson as unknown as ContentI18nCatalog;
export const CONTENT_I18N_PHASE = CONTENT_I18N.phase;
export const CONTENT_I18N_SCHEMA = CONTENT_I18N.schema;
export const CONTENT_I18N_MARKER = CONTENT_I18N.contentI18nMarker;

export interface ContentI18nMeasure {
  enKeys: number;
  esKeys: number;
  ptKeys: number;
  keysEnough: boolean;
  keyParity: boolean;
  localeCount: number;
  localesEnough: boolean;
  uiPtKeys: number;
  gapsClosed: boolean;
  missingGates: string[];
  itemNameWired: boolean;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureContentI18n(repoRoot: string): ContentI18nMeasure {
  const en = existsSync(resolve(repoRoot, CONTENT_I18N.contentStringsEn))
    ? readJson(resolve(repoRoot, CONTENT_I18N.contentStringsEn))
    : { strings: {} };
  const es = existsSync(resolve(repoRoot, CONTENT_I18N.contentStringsEs))
    ? readJson(resolve(repoRoot, CONTENT_I18N.contentStringsEs))
    : { strings: {} };
  const pt = existsSync(resolve(repoRoot, CONTENT_I18N.contentStringsPt))
    ? readJson(resolve(repoRoot, CONTENT_I18N.contentStringsPt))
    : { strings: {} };
  const enKeysList = Object.keys(en.strings ?? {});
  const esKeysList = Object.keys(es.strings ?? {});
  const ptKeysList = Object.keys(pt.strings ?? {});
  const enSet = new Set(enKeysList);
  const keyParity =
    enKeysList.length === esKeysList.length &&
    enKeysList.length === ptKeysList.length &&
    esKeysList.every((k) => enSet.has(k)) &&
    ptKeysList.every((k) => enSet.has(k));

  const kickoffPath = resolve(repoRoot, CONTENT_I18N.kickoffCatalog);
  let gapsClosed = false;
  let localeCount = 0;
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapsClosed = CONTENT_I18N.gapFlagsClosed.every((f) => kickoff?.gaps?.[f] === false);
    localeCount = kickoff?.baseline?.i18nLocales ?? 0;
  }

  const missingGates: string[] = [];
  for (const gate of CONTENT_I18N.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const contentKt = existsSync(resolve(repoRoot, CONTENT_I18N.contentStringsKotlin))
    ? readFileSync(resolve(repoRoot, CONTENT_I18N.contentStringsKotlin), "utf8")
    : "";
  const contentPack = readFileSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/content/ContentPack.kt"),
    "utf8",
  );
  const contentTs = readFileSync(resolve(repoRoot, "web/src/engine/content.ts"), "utf8");
  const itemNameWired =
    contentPack.includes("ContentStrings.t") &&
    contentTs.includes("contentName") &&
    contentKt.includes("object ContentStrings");

  const uiPt = existsSync(resolve(repoRoot, CONTENT_I18N.uiStringsPt))
    ? readJson(resolve(repoRoot, CONTENT_I18N.uiStringsPt))
    : { strings: {} };

  return {
    enKeys: enKeysList.length,
    esKeys: esKeysList.length,
    ptKeys: ptKeysList.length,
    keysEnough:
      enKeysList.length >= CONTENT_I18N.contentStringKeyMin &&
      esKeysList.length >= CONTENT_I18N.contentStringKeyMin &&
      ptKeysList.length >= CONTENT_I18N.contentStringKeyMin,
    keyParity,
    localeCount,
    localesEnough: localeCount >= CONTENT_I18N.localeCountMin,
    uiPtKeys: Object.keys(uiPt.strings ?? {}).length,
    gapsClosed,
    missingGates,
    itemNameWired,
  };
}

export function runtimeContentKeyParity(): boolean {
  return (
    CONTENT_STRING_KEYS.length === contentStringKeyCount("en") &&
    contentStringKeyCount("en") === contentStringKeyCount("es") &&
    contentStringKeyCount("en") === contentStringKeyCount("pt") &&
    UI_STRING_KEYS.length === uiStringKeyCount("pt")
  );
}
