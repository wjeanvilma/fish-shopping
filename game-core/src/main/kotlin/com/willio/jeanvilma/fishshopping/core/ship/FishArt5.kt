package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 9 — fish art 5 ship contracts from
 * `shared/ship/fish-art-5.json`.
 */
object FishArt5 {
    const val PHASE = 9
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.fish_art_5.v1"
    const val CATALOG = "shared/ship/fish-art-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-fish-art-5.json"
    const val MARKER = "authored-finish-5.0-phase-9"
    const val FINISH5_MARKER = "fish-art-5"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val AUTHORED_SPECIES_TARGET = 125
    const val NEW_AUTHORED_COUNT = 25
    const val VALIDATE_SCRIPT = "fishart5:validate"
    const val GAP_CLOSED = "fishArt5Incomplete"

    val NEW_SPECIES_IDS: List<String> = listOf(
        "species.mist_sprat",
        "species.gilt_mist",
        "species.veil_shad",
        "species.prism_veil",
        "species.dusk_mullet",
        "species.bronze_dusk",
        "species.shelf_blenny",
        "species.opal_shelf",
        "species.coral_scad",
        "species.gilt_scad",
        "species.storm_drum",
        "species.thunder_storm",
        "species.ember_ray",
        "species.magma_ember",
        "species.north_smelt",
        "species.aurora_north",
        "species.marina_jack",
        "species.gilt_marina",
        "species.lantern_pike",
        "species.prism_lantern",
        "species.brine_goby",
        "species.crystal_brine",
        "species.plaza_wrasse",
        "species.crown_plaza",
        "species.mist_tuna",
    )
}
