package com.willio.jeanvilma.fishshopping.core.content

/**
 * Phase 23 (post-1.0) — balance patch 1.0.1 contracts from
 * `shared/content/balance-patch-1.0.1.json`. Schema 20 unchanged.
 */
object BalancePatch101 {
    const val PHASE = 23
    const val SCHEMA = "fish.content.balance_patch.v1"
    const val CATALOG = "shared/content/balance-patch-1.0.1.json"
    const val CONTENT_PACK = "shared/content/content-pack.json"
    const val FROM_VERSION = "1.0.0"
    const val TO_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 20

    const val BAG_CAPACITY_2_COST = 30
    const val BASIC_PORTION_UNIT_PRICE = 6
    const val FILLET_UNIT_PRICE = 13
    const val PORTER_HIRE_COST = 85
    const val FISHER_HIRE_COST = 105
    const val XP_FISH_CAUGHT = 5
    const val XP_SALE_ASSISTED = 4
    const val REPAIR_COINS = 35

    val XP_THRESHOLDS: List<Int> = listOf(0, 35, 90, 160, 250)
}
