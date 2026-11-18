package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 6 — content i18n + third locale ship contracts from
 * `shared/ship/content-i18n.json`.
 */
object ContentI18n {
    const val PHASE = 6
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.content_i18n.v1"
    const val CATALOG = "shared/ship/content-i18n.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-content-i18n.json"
    const val MARKER = "authored-finish-3.0-phase-6"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val THIRD_LOCALE = "pt"
    const val LOCALE_COUNT_MIN = 3
    const val CONTENT_STRING_KEY_MIN = 250
    const val VALIDATE_SCRIPT = "contenti18n:validate"

    val GAP_FLAGS_CLOSED: List<String> = listOf(
        "contentI18nMissing",
        "thirdLocaleMissing",
    )

    val SUPPORTED_LOCALES: List<String> = listOf("en", "es", "pt")
}
