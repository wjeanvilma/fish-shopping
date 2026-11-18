package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 5 — Android i18n completion ship contracts from
 * `shared/ship/android-i18n.json`.
 */
object AndroidI18n {
    const val PHASE = 5
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.android_i18n.v1"
    const val CATALOG = "shared/ship/android-i18n.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-android-i18n.json"
    const val MARKER = "authored-finish-3.0-phase-5"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val UI_STRING_KEY_MIN = 120
    const val ANDROID_TEXT_LITERALS_MAX = 0
    const val GAP_FLAG_CLOSED = "androidI18nIncomplete"
    const val HUD_PACKAGE_ROOT =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud"
    const val VALIDATE_SCRIPT = "androidi18n:validate"
}
