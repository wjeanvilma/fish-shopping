package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 12 — species 51–75 + ecology ship contracts from
 * `shared/ship/species-51-75.json`.
 */
object Species5175 {
    const val PHASE = 12
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.species_51_75.v1"
    const val CATALOG = "shared/ship/species-51-75.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-species-51-75.json"
    const val MARKER = "authored-finish-3.0-phase-12"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val SPECIES_COUNT = 75
    const val NEW_SPECIES_COUNT = 25
    const val HABITAT_COUNT = 8
    const val VALIDATE_SCRIPT = "species5175:validate"
    const val RARE_GALLERY = "gallery.rare_gallery"

    val HABITAT_IDS: List<String> = listOf(
        "habitat.mangrove_fringe",
        "habitat.shear_channel",
        "habitat.kiln_outflow",
        "habitat.rime_shelf",
        "habitat.parade_lane",
        "habitat.veil_flats",
        "habitat.basalt_spur",
        "habitat.boardwalk_edge",
    )

    val NEW_RARE_SPECIES: List<String> = listOf(
        "species.gilt_mangrove",
        "species.prism_goby",
        "species.thunder_drum",
        "species.crystal_skater",
        "species.magma_loach",
        "species.gilt_kiln",
        "species.aurora_icefish",
        "species.crystal_bream",
        "species.gilt_amberjack",
        "species.opal_scad",
        "species.pearl_skate",
        "species.opal_cuttle",
    )

    val NEW_BASE_SPECIES: List<String> = listOf(
        "species.mangrove_snapper",
        "species.glass_goby",
        "species.shear_drum",
        "species.foam_skater",
        "species.slag_loach",
        "species.kiln_perch",
        "species.drift_icefish",
        "species.rime_bream",
        "species.silk_amberjack",
        "species.parade_scad",
        "species.veil_skate",
        "species.dusk_cuttle",
        "species.basalt_gurnard",
    )
}
