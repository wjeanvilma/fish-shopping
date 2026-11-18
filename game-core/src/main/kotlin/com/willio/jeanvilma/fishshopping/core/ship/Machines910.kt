package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 13 — machines 9–10 ship contracts from
 * `shared/ship/machines-9-10.json`.
 */
object Machines910 {
    const val PHASE = 13
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.machines_9_10.v1"
    const val CATALOG = "shared/ship/machines-9-10.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-machines-9-10.json"
    const val MARKER = "authored-finish-3.0-phase-13"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val MACHINE_COUNT = 10
    const val VALIDATE_SCRIPT = "machines910:validate"

    val NEW_MACHINE_IDS: List<String> = listOf(
        "machine.harbor_press",
        "machine.harbor_pickler",
    )

    val UNLOCK_UPGRADES: List<String> = listOf(
        "upgrade.harbor_press",
        "upgrade.harbor_pickler",
    )

    val SAMPLE_RECIPES: List<String> = listOf(
        "recipe.press_fillet",
        "recipe.pickle_fillet",
    )

    val PRODUCTS: List<String> = listOf(
        "product.pressed_fillet",
        "product.fish_cake",
        "product.press_carton",
        "product.pickled_fillet",
        "product.relish_jar",
        "product.pickle_carton",
    )
}
