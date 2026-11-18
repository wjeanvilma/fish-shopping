/**
 * Finish 3.0 Phase 6 — content-pack display-name overlays (en + es + pt).
 * Mirrors shared/i18n/content-strings.*.json. Pack schema stays 23.
 */
import enBundle from "../../../shared/i18n/content-strings.en.json";
import esBundle from "../../../shared/i18n/content-strings.es.json";
import ptBundle from "../../../shared/i18n/content-strings.pt.json";
import indexJson from "../../../shared/i18n/content-strings.json";
import { getLocale, resolveLocale, type AppLocale } from "./strings";

export const CONTENT_STRINGS_SCHEMA = (indexJson as { schema: string }).schema;
export const CONTENT_STRING_KEYS = Object.keys(
  (enBundle as { strings: Record<string, string> }).strings,
) as readonly string[];

const BUNDLES: Record<AppLocale, Record<string, string>> = {
  en: (enBundle as { strings: Record<string, string> }).strings,
  es: (esBundle as { strings: Record<string, string> }).strings,
  pt: (ptBundle as { strings: Record<string, string> }).strings,
};

/** Resolve a content entity display name by id; falls back to English then `fallback`. */
export function contentName(
  id: string,
  fallback: string = id,
  locale: AppLocale = getLocale(),
): string {
  const resolved = resolveLocale(locale);
  return BUNDLES[resolved]?.[id] ?? BUNDLES.en[id] ?? fallback;
}

export function contentStringKeyCount(locale: AppLocale = "en"): number {
  return Object.keys(BUNDLES[locale] ?? {}).length;
}
