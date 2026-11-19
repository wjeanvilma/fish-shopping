/**
 * Content i18n ship contracts (mirrors shared/ship/content-i18n.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/content-i18n.json";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../i18n/contentStrings";
import { UI_STRING_KEYS, uiStringKeyCount, type AppLocale } from "../i18n/strings";

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

const MEASURE_LOCALES = ["en", "es", "pt", "fr", "ht", "it", "ca", "ru"] as const;

export function measureContentI18n(repoRoot: string): ContentI18nMeasure {
  const bundles = MEASURE_LOCALES.map((loc) => {
    const path = resolve(repoRoot, `shared/i18n/content-strings.${loc}.json`);
    return existsSync(path) ? readJson(path) : { strings: {} };
  });
  const keyLists = bundles.map((b) => Object.keys(b.strings ?? {}));
  const enKeysList = keyLists[0] ?? [];
  const enSet = new Set(enKeysList);
  const keyParity = keyLists.every(
    (keys) =>
      keys.length === enKeysList.length && keys.every((k) => enSet.has(k)),
  );

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
    esKeys: keyLists[1]?.length ?? 0,
    ptKeys: keyLists[2]?.length ?? 0,
    keysEnough: keyLists.every((keys) => keys.length >= CONTENT_I18N.contentStringKeyMin),
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
  const locales: AppLocale[] = ["en", "es", "pt", "fr", "ht", "it", "ca", "ru"];
  const enCount = contentStringKeyCount("en");
  return (
    CONTENT_STRING_KEYS.length === enCount &&
    locales.every((loc) => contentStringKeyCount(loc) === enCount) &&
    UI_STRING_KEYS.length === uiStringKeyCount("pt")
  );
}
