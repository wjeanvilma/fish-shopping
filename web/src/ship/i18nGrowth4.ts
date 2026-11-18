/**
 * Finish 4.0 Phase 24 — i18n growth 4 ship catalog
 * (mirrors shared/ship/i18n-growth-4.json).
 */
import catalogJson from "../../../shared/ship/i18n-growth-4.json";

export interface I18nGrowth4ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  i18nGrowth4Marker: string;
  extendsCatalog: string;
  uiStringKeyMin: number;
  localeMin: number;
  a11yStringKeyMin: number;
  androidTextLiteralsMax: number;
  parityFixture: string;
  validateScript: string;
  softFloors: {
    i18nScaffoldKeyMin: number;
    androidI18nKeyMin: number;
    note: string;
  };
}

export const I18N_GROWTH_4 = catalogJson as unknown as I18nGrowth4ShipCatalog;
export const I18N_GROWTH_4_PHASE = I18N_GROWTH_4.phase;
export const I18N_GROWTH_4_SCHEMA = I18N_GROWTH_4.schema;
export const I18N_GROWTH_4_MARKER = I18N_GROWTH_4.i18nGrowth4Marker;
export const UI_STRING_KEY_FLOOR_4 = I18N_GROWTH_4.uiStringKeyMin;
export const A11Y_STRING_KEY_FLOOR_4 = I18N_GROWTH_4.a11yStringKeyMin;
export const LOCALE_FLOOR_4 = I18N_GROWTH_4.localeMin;
