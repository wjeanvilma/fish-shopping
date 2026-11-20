/**
 * Finish 6.0 Phase 22 — i18n key growth 6 ship constants
 * (mirrors shared/ship/i18n-growth-6.json).
 */
import catalogJson from "../../../shared/ship/i18n-growth-6.json";

export interface I18nGrowth6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  i18nGrowth6Marker: string;
  extendsCatalog: string;
  uiStringKeyMin: number;
  localeMin: number;
  a11yStringKeyMin: number;
  androidTextLiteralsMax: number;
  parityFixture: string;
  validateScript: string;
  softA11yI18n5Validate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const I18N_GROWTH_6 = catalogJson as unknown as I18nGrowth6Catalog;
export const I18N_GROWTH_6_PHASE = I18N_GROWTH_6.phase;
export const I18N_GROWTH_6_SCHEMA = I18N_GROWTH_6.schema;
export const I18N_GROWTH_6_MARKER = I18N_GROWTH_6.i18nGrowth6Marker;
export const UI_STRING_KEY_FLOOR_6 = I18N_GROWTH_6.uiStringKeyMin;
export const LOCALE_FLOOR_6 = I18N_GROWTH_6.localeMin;
export const A11Y_STRING_KEY_FLOOR_6 = I18N_GROWTH_6.a11yStringKeyMin;
