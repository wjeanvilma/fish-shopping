package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 8 — fish mesh pass 3b (species 76–100) contracts from
 * `shared/ship/fish-art-3b.json`.
 */
object FishArt3b {
    const val PHASE = 8
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.fish_art_3b.v1"
    const val CATALOG = "shared/ship/fish-art-3b.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-fish-art-3b.json"
    const val MARKER = "authored-finish-4.0-phase-8"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val AUTHORED_SPECIES_TARGET = 100
    const val SPECIES_COUNT_TARGET = 100
    const val PRIOR_AUTHORED_FLOOR = 75
    const val NEW_AUTHORED_COUNT = 25
    const val GAP_CLOSED_VALUE = 0
    const val BASELINE_AUTHORED_FISH = 100
    const val BASELINE_SPECIES = 100
    const val GAP_FLAG = "authoredFishRemaining"
    const val FISH_ART_MARKER = "authored-phase-20"

    val NEW_SPECIES_IDS: List<String> = listOf(
        "species.cedar_smelt",
        "species.gilt_cedar",
        "species.lantern_shad",
        "species.prism_shad",
        "species.brine_mullet",
        "species.bronze_brine",
        "species.canyon_bass",
        "species.crown_canyon",
        "species.tidepool_blenny",
        "species.opal_blenny",
        "species.reef_hawkfish",
        "species.ruby_hawk",
        "species.squall_smelt",
        "species.thunder_smelt",
        "species.gale_herring",
        "species.prism_gale",
        "species.cinder_smelt",
        "species.magma_cinder",
        "species.slag_perch",
        "species.gilt_slag",
        "species.frost_jack",
        "species.aurora_jack",
        "species.rime_herring",
        "species.crystal_rime",
        "species.plaza_tuna",
    )

    fun authoredEnough(count: Int, target: Int = AUTHORED_SPECIES_TARGET): Boolean =
        count >= target

    fun speciesEnough(count: Int, target: Int = SPECIES_COUNT_TARGET): Boolean =
        count >= target

    fun waveComplete(presentCount: Int, expected: Int = NEW_AUTHORED_COUNT): Boolean =
        presentCount == expected
}
