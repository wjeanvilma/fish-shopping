package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 19 + Finish 3.0 Phase 8 + Finish 4.0 Phase 9 — harbor art pass
 * ship constants (mirrors shared/ship/harbor-art-pass.json; scenic after harbor-art-3).
 */
object HarborArtPass {
    const val PHASE = 19
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.harbor_art_pass.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23
    const val AUTHORED_HARBOR_MIN = 10
    const val HARBOR_ART_MARKER = "authored-finish-4.0-phase-9"
    const val MAX_BYTES_PER_HARBOR = 200_000
    const val MAX_TOTAL_AUTHORED_BYTES = 2_200_000
    const val PARITY_FIXTURE = "shared/fixtures/parity-harbor-art-pass.json"
    const val CATALOG = "shared/ship/harbor-art-pass.json"

    val AUTHORED_HARBOR_IDS = listOf(
        "harbor.sunrise_pier",
        "harbor.coral_lagoon",
        "harbor.storm_quay",
        "harbor.moon_cove",
        "harbor.obsidian_jetty",
        "harbor.northlight_harbor",
        "harbor.grand_marina",
        "harbor.ember_wharf",
        "harbor.mist_cove",
        "harbor.prism_reach",
    )

    val ALL_BLOCKOUT_ASSETS = listOf(
        "sunrise_pier_blockout.glb",
        "moon_cove_blockout.glb",
        "obsidian_jetty_blockout.glb",
        "northlight_harbor_blockout.glb",
        "grand_marina_blockout.glb",
        "coral_lagoon_blockout.glb",
        "storm_quay_blockout.glb",
        "ember_wharf_blockout.glb",
        "mist_cove_blockout.glb",
        "prism_reach_blockout.glb",
    )
}
