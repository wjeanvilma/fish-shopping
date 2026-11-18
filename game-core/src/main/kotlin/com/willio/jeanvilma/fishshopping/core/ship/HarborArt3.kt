package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 9 — harbor art scenic pass (beyond blockout) contracts from
 * `shared/ship/harbor-art-3.json`.
 */
object HarborArt3 {
    const val PHASE = 9
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.harbor_art_3.v1"
    const val CATALOG = "shared/ship/harbor-art-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-harbor-art-3.json"
    const val MARKER = "authored-finish-4.0-phase-9"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val HARBOR_ART_PASS_CATALOG = "shared/ship/harbor-art-pass.json"
    const val HARBOR_ART_MARKER = "authored-finish-4.0-phase-9"
    const val HARBOR_SCENIC_MARKER = "harbor-art-3"
    const val AUTHORED_HARBOR_TARGET = 8
    const val SCENIC_HARBOR_TARGET = 8
    const val MIN_HARBOR_ART_NODES = 10
    const val GAP_CLOSED = "harborBlockoutPresent"
    const val VALIDATE_SCRIPT = "harborart3:validate"

    val SCENIC_HARBOR_IDS: List<String> = listOf(
        "harbor.sunrise_pier",
        "harbor.coral_lagoon",
        "harbor.storm_quay",
        "harbor.moon_cove",
        "harbor.obsidian_jetty",
        "harbor.northlight_harbor",
        "harbor.grand_marina",
        "harbor.ember_wharf",
    )

    fun scenicEnough(count: Int, target: Int = SCENIC_HARBOR_TARGET): Boolean =
        count >= target

    fun artNodesEnough(count: Int, min: Int = MIN_HARBOR_ART_NODES): Boolean =
        count >= min
}
