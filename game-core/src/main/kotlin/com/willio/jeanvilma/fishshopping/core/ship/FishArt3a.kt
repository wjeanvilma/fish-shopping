package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 7 — fish mesh pass 3a (species 51–75) contracts from
 * `shared/ship/fish-art-3a.json`.
 */
object FishArt3a {
    const val PHASE = 7
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.fish_art_3a.v1"
    const val CATALOG = "shared/ship/fish-art-3a.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-fish-art-3a.json"
    const val MARKER = "authored-finish-4.0-phase-7"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val AUTHORED_SPECIES_TARGET = 75
    const val PRIOR_AUTHORED_FLOOR = 50
    const val NEW_AUTHORED_COUNT = 25
    const val GAP_CLOSED_VALUE = 25
    const val BASELINE_AUTHORED_FISH = 75
    const val GAP_FLAG = "authoredFishRemaining"
    const val FISH_ART_MARKER = "authored-phase-20"

    val NEW_SPECIES_IDS: List<String> = listOf(
        "species.mangrove_snapper",
        "species.gilt_mangrove",
        "species.glass_goby",
        "species.prism_goby",
        "species.shear_drum",
        "species.thunder_drum",
        "species.foam_skater",
        "species.crystal_skater",
        "species.slag_loach",
        "species.magma_loach",
        "species.kiln_perch",
        "species.gilt_kiln",
        "species.drift_icefish",
        "species.aurora_icefish",
        "species.rime_bream",
        "species.crystal_bream",
        "species.silk_amberjack",
        "species.gilt_amberjack",
        "species.parade_scad",
        "species.opal_scad",
        "species.veil_skate",
        "species.pearl_skate",
        "species.dusk_cuttle",
        "species.opal_cuttle",
        "species.basalt_gurnard",
    )

    fun authoredEnough(count: Int, target: Int = AUTHORED_SPECIES_TARGET): Boolean =
        count >= target

    fun waveComplete(presentCount: Int, expected: Int = NEW_AUTHORED_COUNT): Boolean =
        presentCount == expected
}
