/**
 * UI chrome string resolver (en + es + pt + fr + ht + it + ca + ru).
 * Content-pack display names resolve via contentStrings.ts.
 */
import enBundle from "../../../shared/i18n/ui-strings.en.json";
import esBundle from "../../../shared/i18n/ui-strings.es.json";
import ptBundle from "../../../shared/i18n/ui-strings.pt.json";
import frBundle from "../../../shared/i18n/ui-strings.fr.json";
import htBundle from "../../../shared/i18n/ui-strings.ht.json";
import itBundle from "../../../shared/i18n/ui-strings.it.json";
import caBundle from "../../../shared/i18n/ui-strings.ca.json";
import ruBundle from "../../../shared/i18n/ui-strings.ru.json";
import indexJson from "../../../shared/i18n/ui-strings.json";
import {
  DEFAULT_LOCALE,
  SECOND_LOCALE,
  SUPPORTED_LOCALES,
} from "../ship/i18nScaffold";

export type AppLocale = "en" | "es" | "pt" | "fr" | "ht" | "it" | "ca" | "ru";

export const UI_STRINGS_SCHEMA = (indexJson as { schema: string }).schema;
export const UI_STRING_KEYS = Object.keys(
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

const LANG_ATTR: Record<AppLocale, string> = {
  en: "en",
  es: "es",
  pt: "pt",
  fr: "fr",
  ht: "ht",
  it: "it",
  ca: "ca",
  ru: "ru",
};

let activeLocale: AppLocale = DEFAULT_LOCALE as AppLocale;

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return (
    value === "en" ||
    value === "es" ||
    value === "pt" ||
    value === "fr" ||
    value === "ht" ||
    value === "it" ||
    value === "ca" ||
    value === "ru"
  );
}

/** Resolve a preferred locale against the supported set (fallback en). */
export function resolveLocale(preferred?: string | null): AppLocale {
  if (preferred && isAppLocale(preferred)) return preferred;
  if (typeof navigator !== "undefined" && navigator.language) {
    const primary = navigator.language.split("-")[0]?.toLowerCase();
    if (isAppLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE as AppLocale;
}

export function getLocale(): AppLocale {
  return activeLocale;
}

export function setLocale(locale: string): AppLocale {
  const next = resolveLocale(locale);
  activeLocale = next;
  if (typeof document !== "undefined") {
    document.documentElement.lang = LANG_ATTR[next];
  }
  return next;
}

export function supportedLocales(): readonly string[] {
  return SUPPORTED_LOCALES;
}

export function secondLocale(): string {
  return SECOND_LOCALE;
}

/**
 * Translate a UI chrome key. Missing keys fall back to English, then the key itself.
 * Simple `{name}` interpolation for params.
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: AppLocale = activeLocale,
): string {
  const primary = BUNDLES[locale]?.[key];
  const fallback = BUNDLES.en[key];
  let out = primary ?? fallback ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return out;
}

export function uiStringKeyCount(locale: AppLocale = "en"): number {
  return Object.keys(BUNDLES[locale] ?? {}).length;
}
