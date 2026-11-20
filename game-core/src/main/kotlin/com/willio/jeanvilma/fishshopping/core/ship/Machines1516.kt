package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 9 — machines 15–16 ship contracts from
 * `shared/ship/machines-15-16.json`.
 */
object Machines1516 {
    const val PHASE = 9
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.machines_15_16.v1"
    const val CATALOG = "shared/ship/machines-15-16.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-machines-15-16.json"
    const val MARKER = "authored-finish-6.0-phase-9"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26

    const val MACHINE_COUNT = 16
    const val NEW_MACHINE_COUNT = 2
    const val VALIDATE_SCRIPT = "machines1516:validate"

    val NEW_MACHINE_IDS: List<String> = listOf(
        "machine.harbor_roaster",
        "machine.harbor_fermenter",
    )

    val UNLOCK_UPGRADES: List<String> = listOf(
        "upgrade.harbor_roaster",
        "upgrade.harbor_fermenter",
    )

    val SAMPLE_RECIPES: List<String> = listOf(
        "recipe.roast_fillet",
        "recipe.ferment_fillet",
    )

    val PRODUCTS: List<String> = listOf(
        "product.roasted_fillet",
        "product.roast_chip",
        "product.roast_carton",
        "product.fermented_fillet",
        "product.ferment_paste",
        "product.ferment_carton",
    )

    fun machinesEnough(count: Int, target: Int = MACHINE_COUNT): Boolean = count >= target
}
