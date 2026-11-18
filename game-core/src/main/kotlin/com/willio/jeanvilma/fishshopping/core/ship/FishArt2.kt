package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 9 — fish mesh pass 2 ship contracts from
 * `shared/ship/fish-art-2.json`.
 */
object FishArt2 {
    const val PHASE = 9
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.fish_art_2.v1"
    const val CATALOG = "shared/ship/fish-art-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-fish-art-2.json"
    const val MARKER = "authored-finish-3.0-phase-9"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val FISH_ART_PASS_CATALOG = "shared/ship/fish-art-pass.json"
    const val FISH_ART_MARKER = "authored-phase-20"
    const val AUTHORED_SPECIES_TARGET = 50
    const val PRIOR_AUTHORED_SPECIES_FLOOR = 10
    const val NEW_AUTHORED_COUNT = 40
    const val GAP_CLOSED = "authoredFishRemaining"
    const val GAP_CLOSED_VALUE = 0
    const val VALIDATE_SCRIPT = "fishart2:validate"
}
