package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 7 — harbor art 5a ship contracts from
 * `shared/ship/harbor-art-5a.json`.
 */
object HarborArt5a {
    const val PHASE = 7
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.harbor_art_5a.v1"
    const val CATALOG = "shared/ship/harbor-art-5a.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-harbor-art-5a.json"
    const val MARKER = "authored-finish-5.0-phase-7"
    const val FINISH5_MARKER = "harbor-art-5a"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val FINISH5_HARBOR_TARGET = 6
    const val MIN_HARBOR_ART_NODES = 10
    const val VALIDATE_SCRIPT = "harborart5a:validate"

    val FINISH5_HARBOR_IDS: List<String> = listOf(
        "harbor.sunrise_pier",
        "harbor.coral_lagoon",
        "harbor.storm_quay",
        "harbor.moon_cove",
        "harbor.obsidian_jetty",
        "harbor.northlight_harbor",
    )
}
