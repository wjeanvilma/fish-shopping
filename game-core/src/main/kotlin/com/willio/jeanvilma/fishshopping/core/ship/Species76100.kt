package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 11 — species 76–100 + ecology + i18n contracts from
 * `shared/ship/species-76-100.json`.
 */
object Species76100 {
    const val PHASE = 11
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.species_76_100.v1"
    const val CATALOG = "shared/ship/species-76-100.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-species-76-100.json"
    const val MARKER = "authored-finish-4.0-phase-11"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24
    const val SPECIES_COUNT = 100
    const val NEW_SPECIES_COUNT = 25
    const val HABITAT_COUNT = 16
    const val NEW_HABITAT_COUNT = 8
    const val SCHEMA_PREP_TARGET = 25
    const val VALIDATE_SCRIPT = "species76100:validate"
    const val SCHEMA_PREP_CATALOG = "shared/ship/schema-25-prep.json"

    val NEW_BASE_SPECIES: List<String> = listOf(
        "species.cedar_smelt",
        "species.lantern_shad",
        "species.brine_mullet",
        "species.canyon_bass",
        "species.tidepool_blenny",
        "species.reef_hawkfish",
        "species.squall_smelt",
        "species.gale_herring",
        "species.cinder_smelt",
        "species.slag_perch",
        "species.frost_jack",
        "species.rime_herring",
        "species.plaza_tuna",
    )

    val NEW_RARE_SPECIES: List<String> = listOf(
        "species.gilt_cedar",
        "species.prism_shad",
        "species.bronze_brine",
        "species.crown_canyon",
        "species.opal_blenny",
        "species.ruby_hawk",
        "species.thunder_smelt",
        "species.prism_gale",
        "species.magma_cinder",
        "species.gilt_slag",
        "species.aurora_jack",
        "species.crystal_rime",
    )

    val NEW_HABITAT_IDS: List<String> = listOf(
        "habitat.cedar_rail",
        "habitat.lantern_shelf",
        "habitat.brine_pools",
        "habitat.canyon_drop",
        "habitat.tide_lip",
        "habitat.hawk_perch",
        "habitat.squall_foam",
        "habitat.plaza_cut",
    )

    fun waveIds(): List<String> = NEW_BASE_SPECIES + NEW_RARE_SPECIES

    fun speciesEnough(count: Int, target: Int = SPECIES_COUNT): Boolean = count >= target

    fun habitatsEnough(count: Int, target: Int = HABITAT_COUNT): Boolean = count >= target
}
