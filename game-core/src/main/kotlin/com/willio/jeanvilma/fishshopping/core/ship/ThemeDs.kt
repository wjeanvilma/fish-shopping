package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 7 — dark theme + design-system ship contracts from
 * `shared/ship/theme-ds.json`.
 */
object ThemeDs {
    const val PHASE = 7
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.theme_ds.v1"
    const val CATALOG = "shared/ship/theme-ds.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-theme-ds.json"
    const val MARKER = "authored-finish-3.0-phase-7"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val GAP_FLAG_CLOSED = "darkThemeMissing"
    const val VALIDATE_SCRIPT = "themeds:validate"
    const val DEFAULT_THEME_PREFERENCE = "system"

    val THEME_PREFERENCES: List<String> = listOf("system", "light", "dark")

    val REQUIRED_COLOR_DARK_KEYS: List<String> = listOf(
        "ink",
        "action",
        "reward",
        "surface",
        "surfaceMuted",
        "onAction",
        "danger",
        "water",
        "muted",
        "sky",
        "rewardText",
    )

    val DESIGN_SYSTEM_COMPONENTS: List<String> = listOf(
        "Pill",
        "Panel",
        "PrimaryButton",
        "GhostButton",
        "Scrim",
        "CenterCard",
    )
}
