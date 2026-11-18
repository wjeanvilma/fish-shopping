package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 13 — machines 11–12 ship contracts from
 * `shared/ship/machines-11-12.json`.
 */
object Machines1112 {
    const val PHASE = 13
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.machines_11_12.v1"
    const val CATALOG = "shared/ship/machines-11-12.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-machines-11-12.json"
    const val MARKER = "authored-finish-4.0-phase-13"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val MACHINE_COUNT = 12
    const val NEW_MACHINE_COUNT = 2
    const val VALIDATE_SCRIPT = "machines1112:validate"

    val NEW_MACHINE_IDS: List<String> = listOf(
        "machine.harbor_braiser",
        "machine.harbor_glazer",
    )

    val UNLOCK_UPGRADES: List<String> = listOf(
        "upgrade.harbor_braiser",
        "upgrade.harbor_glazer",
    )

    val SAMPLE_RECIPES: List<String> = listOf(
        "recipe.braise_fillet",
        "recipe.glaze_fillet",
    )

    val PRODUCTS: List<String> = listOf(
        "product.braised_fillet",
        "product.braise_stew",
        "product.braise_carton",
        "product.glazed_fillet",
        "product.glaze_skewer",
        "product.glaze_carton",
    )

    fun machinesEnough(count: Int, target: Int = MACHINE_COUNT): Boolean = count >= target
}
