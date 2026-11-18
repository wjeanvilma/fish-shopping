package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 15 — rival markets 8→12 + AI depth ship constants
 * (mirrors shared/ship/rival-markets-2.json).
 */
object RivalMarkets2 {
    const val PHASE = 15
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.rival_markets_2.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24
    const val RIVAL_MARKETS_2_MARKER = "authored-finish-4.0-phase-15"
    const val CATALOG = "shared/ship/rival-markets-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-rival-markets-2.json"
    const val EXTENDS_RIVAL_MARKETS = "shared/ship/rival-markets.json"
    const val RIVAL_COUNT = 12
    const val SIM_HZ_INVARIANT = 20
    const val ADAPTIVE_AGGRESSION_BOOST = 120
    const val MULTI_RIVAL_PRESSURE_EXTRA = 900

    val AI_PROFILES: List<String> = listOf("siphon", "undercut", "adaptive", "roamer")

    val NEW_RIVAL_IDS: List<String> = listOf(
        "rival.mist_monger",
        "rival.prism_peddler",
        "rival.fog_roamer",
        "rival.shelf_syndicate",
    )

    val STATS: List<String> = listOf(
        "stat.rival_sales_stolen",
        "stat.rival_undercuts",
        "stat.rival_beats",
    )
}
