package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 20 — fish art pass ship constants
 * (mirrors shared/ship/fish-art-pass.json).
 */
object FishArtPass {
    const val PHASE = 20
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.fish_art_pass.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val AUTHORED_SPECIES_MIN = 10
    const val FISH_ART_MARKER = "authored-phase-20"
    const val MAX_BYTES_PER_FISH = 32_000
    const val PARITY_FIXTURE = "shared/fixtures/parity-fish-art-pass.json"
    const val CATALOG = "shared/ship/fish-art-pass.json"

    val AUTHORED_SPECIES_IDS = listOf(
        "species.dawn_anchovy",
        "species.silver_sprat",
        "species.harbor_herring",
        "species.sail_needlefish",
        "species.blue_mackerel",
        "species.copper_mullet",
        "species.tide_bass",
        "species.amber_snapper",
        "species.king_grouper",
        "species.reef_perch",
    )
}
