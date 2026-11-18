package com.willio.jeanvilma.fishshopping.core.a11y

import com.willio.jeanvilma.fishshopping.core.ship.A11yDepth2

/**
 * Finish 3.0 Phase 25 — accessibility depth 2 constants
 * (mirrors shared/a11y/accessibility-depth-2.json screen + live region ids).
 */
object AccessibilityDepth2 {
    const val PHASE = A11yDepth2.PHASE
    const val SCHEMA = "fish.a11y.accessibility_depth_2.v1"
    const val CATALOG = A11yDepth2.DEPTH_CATALOG
    const val EXTENDS_CATALOG = A11yDepth2.EXTENDS_CATALOG
    const val SIM_HZ_INVARIANT = A11yDepth2.SIM_HZ_INVARIANT

    val SCREEN_IDS = listOf(
        "goals_bank_loan",
        "goals_trophy",
        "goals_decor",
        "settings_theme",
        "harbor_map_travel",
        "business_dashboard",
        "hud_rival_pressure",
    )

    val LIVE_REGIONS = listOf(
        "rival_pressure",
    )

    val CONTRAST_PAIR_IDS = listOf(
        "dark_ink_on_surface",
        "dark_muted_on_surface",
        "dark_reward_on_surface",
        "dark_action_on_surface",
        "dark_danger_on_surface",
    )
}
