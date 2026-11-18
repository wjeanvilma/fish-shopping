package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 14 — rival NPC markets ship contracts from
 * `shared/ship/rival-markets.json`.
 */
object RivalMarkets {
    const val PHASE = 14
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.rival_markets.v1"
    const val CATALOG = "shared/ship/rival-markets.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-rival-markets.json"
    const val MARKER = "authored-finish-3.0-phase-14"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val RIVAL_COUNT = 8
    const val VALIDATE_SCRIPT = "rivalmarkets:validate"

    val STATS: List<String> = listOf(
        "stat.rival_sales_stolen",
        "stat.rival_undercuts",
        "stat.rival_beats",
    )

    val RIVAL_IDS: List<String> = listOf(
        "rival.dockside_dolly",
        "rival.moon_mariner",
        "rival.obsidian_cart",
        "rival.northlight_nook",
        "rival.marina_monger",
        "rival.coral_crock",
        "rival.storm_hawker",
        "rival.ember_emporium",
    )
}
