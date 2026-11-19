package com.willio.jeanvilma.fishshopping.core.i18n

/**
 * Content-pack display-name overlays (en + es + pt + fr + ht + it + ca + ru).
 * Locale maps live in ContentStringsXX.kt (generated) to stay under JVM method size limits.
 * Generated from shared/i18n/content-strings.*.json via shared/tools/sync_i18n_kotlin.py.
 */
object ContentStrings {
    const val DEFAULT_LOCALE = UiStrings.DEFAULT_LOCALE

    private val EN = ContentStringsEN.MAP

    val KEYS: Set<String> get() = EN.keys

    private val bundles = mapOf(
        "en" to ContentStringsEN.MAP,
        "es" to ContentStringsES.MAP,
        "pt" to ContentStringsPT.MAP,
        "fr" to ContentStringsFR.MAP,
        "ht" to ContentStringsHT.MAP,
        "it" to ContentStringsIT.MAP,
        "ca" to ContentStringsCA.MAP,
        "ru" to ContentStringsRU.MAP,
    )

    fun t(id: String, fallback: String = id, locale: String = UiStrings.getLocale()): String {
        val primary = bundles[UiStrings.resolveLocale(locale)]?.get(id)
        val english = EN[id]
        return primary ?: english ?: fallback
    }

    fun keyCount(locale: String = DEFAULT_LOCALE): Int =
        bundles[UiStrings.resolveLocale(locale)]?.size ?: 0
}
