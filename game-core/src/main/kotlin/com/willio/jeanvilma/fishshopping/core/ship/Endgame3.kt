package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 17 — endgame deepen + schema 26 ship constants
 * (mirrors shared/ship/endgame-3.json).
 */
object Endgame3 {
    const val PHASE = 17
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.endgame_3.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val FROM_SCHEMA = 25
    const val TO_SCHEMA = 26
    const val ENDGAME_3_MARKER = "authored-finish-5.0-phase-17"
    const val CATALOG = "shared/ship/endgame-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-endgame-3.json"
    const val LEGACY_FIXTURE = "shared/fixtures/legacy/snapshot-v25-starter-line-t2500.json"
    const val TIER_COUNT_MIN = 8
    const val CHALLENGE_COUNT_MIN = 12
    const val MARK_COUNT_MIN = 3
    const val CREST_COUNT_MIN = 3
    const val SIM_HZ_INVARIANT = 20

    val NEW_TIER_IDS: List<String> = listOf(
        "endgame.tier.aurora_throne",
        "endgame.tier.tideglass_ascendant",
    )

    val NEW_CHALLENGE_IDS: List<String> = listOf(
        "endgame.challenge.harbor_circuit",
        "endgame.challenge.quest_sovereign",
        "endgame.challenge.machine_ascendant",
        "endgame.challenge.revenue_crest",
    )

    val CREST_IDS: List<String> = listOf(
        "endgame.crest.harbor_circuit",
        "endgame.crest.quest_sovereign",
        "endgame.crest.machine_ascendant",
        "endgame.crest.revenue_crest",
    )
}
