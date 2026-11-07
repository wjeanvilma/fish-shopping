/**
 * Finish 2.0 Phase 23 — UI chrome string resolver (en + es).
 * Presentation-only; content-pack names stay English.
 */
import enBundle from "../../../shared/i18n/ui-strings.en.json";
import esBundle from "../../../shared/i18n/ui-strings.es.json";
import indexJson from "../../../shared/i18n/ui-strings.json";
import {
  DEFAULT_LOCALE,
  SECOND_LOCALE,
  SUPPORTED_LOCALES,
} from "../ship/i18nScaffold";

export type AppLocale = "en" | "es";

export const UI_STRINGS_SCHEMA = (indexJson as { schema: string }).schema;
export const UI_STRING_KEYS = Object.keys(
  (enBundle as { strings: Record<string, string> }).strings,
) as readonly string[];

const BUNDLES: Record<AppLocale, Record<string, string>> = {
  en: (enBundle as { strings: Record<string, string> }).strings,
  es: (esBundle as { strings: Record<string, string> }).strings,
};

let activeLocale: AppLocale = DEFAULT_LOCALE as AppLocale;

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "es";
}

/** Resolve a preferred locale against the supported set (fallback en). */
export function resolveLocale(preferred?: string | null): AppLocale {
  if (preferred && isAppLocale(preferred)) return preferred;
  if (typeof navigator !== "undefined" && navigator.language) {
    const primary = navigator.language.split("-")[0]?.toLowerCase();
    if (primary === "es") return "es";
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
    document.documentElement.lang = next === "es" ? "es" : "en";
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
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

export function uiStringKeyCount(locale: AppLocale = "en"): number {
  return Object.keys(BUNDLES[locale] ?? {}).length;
}
