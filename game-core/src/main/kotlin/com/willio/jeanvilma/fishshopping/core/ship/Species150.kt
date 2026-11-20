package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 8 — species 126–150 contracts from
 * `shared/ship/species-150.json`.
 */
object Species150 {
    const val PHASE = 8
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.species_150.v1"
    const val CATALOG = "shared/ship/species-150.json"
    const val SPECIES_COUNT = 150
    const val NEW_SPECIES_COUNT = 25
    const val HABITAT_FLOOR = 32
    const val NEW_HABITAT_COUNT = 8
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val MARKER = "authored-finish-6.0-phase-8"
    const val FISH_ART_MARKER = "fish-art-6"
    const val VALIDATE_SCRIPT = "species150:validate"
    const val GAP_SPECIES = "speciesRemaining"
    const val GAP_AUTHORED_FISH = "authoredFishRemaining"
    const val GAP_FISH_ART = "fishArt6Incomplete"

    val NEW_BASE_IDS: List<String> = listOf(
        "species.saffron_sprat",
        "species.quay_mullet",
        "species.cobalt_smelt",
        "species.sound_char",
        "species.lantern_scad",
        "species.tide_wrasse",
        "species.dock_blenny",
        "species.cove_drum",
        "species.reef_jack",
        "species.kiln_shad",
        "species.mist_goby",
        "species.plaza_bass",
        "species.cobalt_tuna",
    )

    val NEW_RARE_IDS: List<String> = listOf(
        "species.gilt_saffron",
        "species.bronze_quay",
        "species.aurora_cobalt",
        "species.crystal_sound",
        "species.prism_scad",
        "species.glass_tide",
        "species.opal_dock",
        "species.thunder_cove",
        "species.gilt_reef",
        "species.magma_kiln",
        "species.veil_goby",
        "species.gilt_bass",
    )

    fun speciesEnough(count: Int, target: Int = SPECIES_COUNT): Boolean = count >= target
}
