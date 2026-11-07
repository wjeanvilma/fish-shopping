package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 9 — species 37–50 + bait ladder contracts from
 * `shared/ship/species-37-50.json`.
 */
object Species3750 {
    const val PHASE = 9
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.species_37_50.v1"
    const val CATALOG = "shared/ship/species-37-50.json"
    const val SPECIES_COUNT = 50
    const val BAIT_COUNT = 8
    const val BAIT_FIXTURE = "shared/fixtures/parity-species-37-50.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 21
    const val RARE_GALLERY = "gallery.rare_gallery"

    val NEW_BASE_IDS: List<String> = listOf(
        "species.coral_wrasse",
        "species.lagoon_tang",
        "species.gale_jack",
        "species.squall_bass",
        "species.cinder_carp",
        "species.ash_pike",
        "species.tropic_ray",
    )

    val NEW_RARE_IDS: List<String> = listOf(
        "species.gilt_wrasse",
        "species.opal_tang",
        "species.thunder_jack",
        "species.prism_squall",
        "species.gilt_cinder",
        "species.magma_pike",
        "species.pearl_ray",
    )

    val NEW_BAIT_IDS: List<String> = listOf(
        "bait.brine_paste",
        "bait.coral_spark",
        "bait.storm_jig",
        "bait.ember_oil",
        "bait.abyss_chum",
    )
}
