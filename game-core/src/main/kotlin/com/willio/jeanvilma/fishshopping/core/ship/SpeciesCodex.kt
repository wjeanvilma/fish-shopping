package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 12 — species codex contracts from
 * `shared/ship/species-codex.json`.
 */
object SpeciesCodex {
    const val PHASE = 12
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.species_codex.v1"
    const val CATALOG = "shared/ship/species-codex.json"
    const val SPECIES_COUNT = 50
    const val CODEX_ENTRY_COUNT = 50
    const val FAMILY_COUNT = 9
    const val PARITY_FIXTURE = "shared/fixtures/parity-species-codex.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 21

    val FAMILIES: List<String> = listOf(
        "cove", "ember", "jetty", "marina", "pier", "polar", "reef", "storm", "trophy",
    )
}
