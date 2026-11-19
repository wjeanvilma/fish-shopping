/**
 * Content-pack display-name overlays (en + es + pt + fr + ht + it + ca + ru).
 * Mirrors shared/i18n/content-strings.*.json.
 */
import enBundle from "../../../shared/i18n/content-strings.en.json";
import esBundle from "../../../shared/i18n/content-strings.es.json";
import ptBundle from "../../../shared/i18n/content-strings.pt.json";
import frBundle from "../../../shared/i18n/content-strings.fr.json";
import htBundle from "../../../shared/i18n/content-strings.ht.json";
import itBundle from "../../../shared/i18n/content-strings.it.json";
import caBundle from "../../../shared/i18n/content-strings.ca.json";
import ruBundle from "../../../shared/i18n/content-strings.ru.json";
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
  fr: (frBundle as { strings: Record<string, string> }).strings,
  ht: (htBundle as { strings: Record<string, string> }).strings,
  it: (itBundle as { strings: Record<string, string> }).strings,
  ca: (caBundle as { strings: Record<string, string> }).strings,
  ru: (ruBundle as { strings: Record<string, string> }).strings,
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
