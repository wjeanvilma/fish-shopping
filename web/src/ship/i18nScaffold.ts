/**
 * Finish 2.0 Phase 23 — i18n scaffold ship catalog
 * (mirrors shared/ship/i18n-scaffold.json).
 */
import catalogJson from "../../../shared/ship/i18n-scaffold.json";

export interface I18nScaffoldShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  i18nMarker: string;
  defaultLocale: string;
  secondLocale: string;
  supportedLocales: string[];
  uiStringKeyMin: number;
  localeFileMin: number;
  listingKeyParity: boolean;
  parityFixture: string;
  validateScript: string;
}

export const I18N_SCAFFOLD = catalogJson as unknown as I18nScaffoldShipCatalog;
export const I18N_SCAFFOLD_PHASE = I18N_SCAFFOLD.phase;
export const I18N_SCAFFOLD_SCHEMA = I18N_SCAFFOLD.schema;
export const I18N_SCAFFOLD_MARKER = I18N_SCAFFOLD.i18nMarker;
export const UI_STRING_KEY_FLOOR = I18N_SCAFFOLD.uiStringKeyMin;
export const LOCALE_FILE_FLOOR = I18N_SCAFFOLD.localeFileMin;
export const SUPPORTED_LOCALES = I18N_SCAFFOLD.supportedLocales as readonly string[];
export const DEFAULT_LOCALE = I18N_SCAFFOLD.defaultLocale;
export const SECOND_LOCALE = I18N_SCAFFOLD.secondLocale;
