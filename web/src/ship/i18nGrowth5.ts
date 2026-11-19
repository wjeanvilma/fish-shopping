/**
 * Finish 5.0 Phase 24 — i18n growth 5 ship catalog
 * (mirrors shared/ship/i18n-growth-5.json).
 */
import catalogJson from "../../../shared/ship/i18n-growth-5.json";

export interface I18nGrowth5ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  i18nGrowth5Marker: string;
  extendsCatalog: string;
  uiStringKeyMin: number;
  localeMin: number;
  a11yStringKeyMin: number;
  androidTextLiteralsMax: number;
  parityFixture: string;
  validateScript: string;
  softA11yI18n4Validate: string;
  softFloors: {
    i18nGrowth4KeyMin: number;
    i18nScaffoldKeyMin: number;
    androidI18nKeyMin: number;
    note: string;
  };
}

export const I18N_GROWTH_5 = catalogJson as unknown as I18nGrowth5ShipCatalog;
export const I18N_GROWTH_5_PHASE = I18N_GROWTH_5.phase;
export const I18N_GROWTH_5_SCHEMA = I18N_GROWTH_5.schema;
export const I18N_GROWTH_5_MARKER = I18N_GROWTH_5.i18nGrowth5Marker;
export const UI_STRING_KEY_FLOOR_5 = I18N_GROWTH_5.uiStringKeyMin;
export const A11Y_STRING_KEY_FLOOR_5 = I18N_GROWTH_5.a11yStringKeyMin;
export const LOCALE_FLOOR_5 = I18N_GROWTH_5.localeMin;
