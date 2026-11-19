package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 13 — species 101–125 ship contracts from
 * `shared/ship/species-125.json`.
 */
object Species125 {
    const val PHASE = 13
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.species_125.v1"
    const val CATALOG = "shared/ship/species-125.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-species-125.json"
    const val MARKER = "authored-finish-5.0-phase-13"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val SPECIES_COUNT = 125
    const val NEW_SPECIES_COUNT = 25
    const val HABITAT_COUNT = 24
    const val NEW_HABITAT_COUNT = 8
    const val VALIDATE_SCRIPT = "species125:validate"
    const val GAP_CLOSED = "speciesRemaining"

    val NEW_BASE_IDS = listOf(
        "species.mist_sprat",
        "species.veil_shad",
        "species.dusk_mullet",
        "species.shelf_blenny",
        "species.coral_scad",
        "species.storm_drum",
        "species.ember_ray",
        "species.north_smelt",
        "species.marina_jack",
        "species.lantern_pike",
        "species.brine_goby",
        "species.plaza_wrasse",
        "species.mist_tuna",
    )

    val NEW_RARE_IDS = listOf(
        "species.gilt_mist",
        "species.prism_veil",
        "species.bronze_dusk",
        "species.opal_shelf",
        "species.gilt_scad",
        "species.thunder_storm",
        "species.magma_ember",
        "species.aurora_north",
        "species.gilt_marina",
        "species.prism_lantern",
        "species.crystal_brine",
        "species.crown_plaza",
    )

    val NEW_HABITAT_IDS = listOf(
        "habitat.mist_rail",
        "habitat.veil_glow",
        "habitat.dusk_ledge",
        "habitat.shelf_rim",
        "habitat.scad_reef",
        "habitat.drum_chop",
        "habitat.ray_kiln",
        "habitat.finish5_cut",
    )

    fun waveIds(): List<String> = NEW_BASE_IDS + NEW_RARE_IDS
}
