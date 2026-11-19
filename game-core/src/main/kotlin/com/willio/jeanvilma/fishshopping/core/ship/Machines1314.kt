package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 15 — machines 13–14 ship contracts from
 * `shared/ship/machines-13-14.json`.
 */
object Machines1314 {
    const val PHASE = 15
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.machines_13_14.v1"
    const val CATALOG = "shared/ship/machines-13-14.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-machines-13-14.json"
    const val MARKER = "authored-finish-5.0-phase-15"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25

    const val MACHINE_COUNT = 14
    const val NEW_MACHINE_COUNT = 2
    const val VALIDATE_SCRIPT = "machines1314:validate"

    val NEW_MACHINE_IDS: List<String> = listOf(
        "machine.harbor_poacher",
        "machine.harbor_canner",
    )

    val UNLOCK_UPGRADES: List<String> = listOf(
        "upgrade.harbor_poacher",
        "upgrade.harbor_canner",
    )

    val SAMPLE_RECIPES: List<String> = listOf(
        "recipe.poach_fillet",
        "recipe.can_fillet",
    )

    val PRODUCTS: List<String> = listOf(
        "product.poached_fillet",
        "product.poach_broth",
        "product.poach_carton",
        "product.canned_fillet",
        "product.can_medley",
        "product.can_carton",
    )

    fun machinesEnough(count: Int, target: Int = MACHINE_COUNT): Boolean = count >= target
}
