package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 8 — harbor art 5b ship contracts from
 * `shared/ship/harbor-art-5b.json`.
 */
object HarborArt5b {
    const val PHASE = 8
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.harbor_art_5b.v1"
    const val CATALOG = "shared/ship/harbor-art-5b.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-harbor-art-5b.json"
    const val MARKER = "authored-finish-5.0-phase-8"
    const val FINISH5_MARKER = "harbor-art-5b"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val FINISH5_HARBOR_TARGET = 4
    const val MIN_HARBOR_ART_NODES = 10
    const val VALIDATE_SCRIPT = "harborart5b:validate"
    const val GAP_CLOSED = "harborArt5Incomplete"

    val FINISH5_HARBOR_IDS: List<String> = listOf(
        "harbor.grand_marina",
        "harbor.ember_wharf",
        "harbor.mist_cove",
        "harbor.prism_reach",
    )
}
