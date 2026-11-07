package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 19 — harbor art pass ship constants
 * (mirrors shared/ship/harbor-art-pass.json).
 */
object HarborArtPass {
    const val PHASE = 19
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.harbor_art_pass.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val AUTHORED_HARBOR_MIN = 3
    const val HARBOR_ART_MARKER = "authored-phase-19"
    const val MAX_BYTES_PER_HARBOR = 200_000
    const val PARITY_FIXTURE = "shared/fixtures/parity-harbor-art-pass.json"
    const val CATALOG = "shared/ship/harbor-art-pass.json"

    val AUTHORED_HARBOR_IDS = listOf(
        "harbor.sunrise_pier",
        "harbor.coral_lagoon",
        "harbor.storm_quay",
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
    )
}
