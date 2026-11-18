package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 20 + Finish 3.0 Phase 9 — fish art pass ship constants
 * (mirrors shared/ship/fish-art-pass.json).
 */
object FishArtPass {
    const val PHASE = 20
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.fish_art_pass.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23
    const val AUTHORED_SPECIES_MIN = 50
    const val FISH_ART_MARKER = "authored-phase-20"
    const val MAX_BYTES_PER_FISH = 32_000
    const val MAX_TOTAL_AUTHORED_BYTES = 1_600_000
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
        "species.moon_flounder",
        "species.ink_squid",
        "species.lava_eel",
        "species.ghost_lanternfish",
        "species.golden_sprat",
        "species.gilt_mackerel",
        "species.bronze_mullet",
        "species.ruby_snapper",
        "species.silver_dawn_anchovy",
        "species.sapphire_needlefish",
        "species.crown_bass",
        "species.opal_flounder",
        "species.ember_eel",
        "species.prism_lanternfish",
        "species.frost_smelt",
        "species.arctic_cod",
        "species.ice_char",
        "species.polar_herring",
        "species.crystal_smelt",
        "species.aurora_cod",
        "species.marina_tuna",
        "species.saffron_sole",
        "species.pearl_grouper",
        "species.harbor_pompano",
        "species.gilt_tuna",
        "species.gilt_sole",
        "species.coral_wrasse",
        "species.gilt_wrasse",
        "species.lagoon_tang",
        "species.opal_tang",
        "species.gale_jack",
        "species.thunder_jack",
        "species.squall_bass",
        "species.prism_squall",
        "species.cinder_carp",
        "species.gilt_cinder",
        "species.ash_pike",
        "species.magma_pike",
        "species.tropic_ray",
        "species.pearl_ray",
    )
}
