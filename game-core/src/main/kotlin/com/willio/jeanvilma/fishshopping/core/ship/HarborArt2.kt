package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 8 — harbor art pass 2 ship contracts from
 * `shared/ship/harbor-art-2.json`.
 */
object HarborArt2 {
    const val PHASE = 8
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.harbor_art_2.v1"
    const val CATALOG = "shared/ship/harbor-art-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-harbor-art-2.json"
    const val MARKER = "authored-finish-3.0-phase-8"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val HARBOR_ART_PASS_CATALOG = "shared/ship/harbor-art-pass.json"
    const val HARBOR_ART_MARKER = "authored-phase-19"
    const val AUTHORED_HARBOR_TARGET = 8
    const val PRIOR_AUTHORED_HARBOR_FLOOR = 3
    const val GAP_CLOSED = "authoredHarborsRemaining"
    const val GAP_CLOSED_VALUE = 0
    const val VALIDATE_SCRIPT = "harborart2:validate"

    val NEW_AUTHORED_HARBOR_IDS: List<String> = listOf(
        "harbor.moon_cove",
        "harbor.obsidian_jetty",
        "harbor.northlight_harbor",
        "harbor.grand_marina",
        "harbor.ember_wharf",
    )

    val NEW_THEMES: List<String> = listOf(
        "moon",
        "obsidian",
        "northlight",
        "marina",
        "ember",
    )
}
