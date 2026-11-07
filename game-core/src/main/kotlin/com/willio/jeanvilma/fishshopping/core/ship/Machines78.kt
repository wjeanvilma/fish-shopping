package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 10 — machines 7–8 contracts from
 * `shared/ship/machines-7-8.json`.
 */
object Machines78 {
    const val PHASE = 10
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.machines_7_8.v1"
    const val CATALOG = "shared/ship/machines-7-8.json"
    const val MACHINE_COUNT = 8
    const val RECIPE_FIXTURE = "shared/fixtures/parity-machines-7-8.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 21

    val NEW_MACHINE_IDS: List<String> = listOf(
        "machine.harbor_steamer",
        "machine.harbor_kiln",
    )

    val UNLOCK_UPGRADES: List<String> = listOf(
        "upgrade.harbor_steamer",
        "upgrade.harbor_kiln",
    )

    val SAMPLE_RECIPES: List<String> = listOf(
        "recipe.steam_fillet",
        "recipe.cure_fillet",
    )
}
