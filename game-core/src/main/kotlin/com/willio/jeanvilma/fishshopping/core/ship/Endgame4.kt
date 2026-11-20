package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 14 — endgame deepen + schema 27 ship constants
 * (mirrors shared/ship/endgame-4.json).
 */
object Endgame4 {
    const val PHASE = 14
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.endgame_4.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val FROM_SCHEMA = 26
    const val TO_SCHEMA = 27
    const val ENDGAME_4_MARKER = "authored-finish-6.0-phase-14"
    const val CATALOG = "shared/ship/endgame-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-endgame-4.json"
    const val LEGACY_FIXTURE = "shared/fixtures/legacy/snapshot-v26-starter-line-t2500.json"
    const val TIER_COUNT_MIN = 10
    const val CHALLENGE_COUNT_MIN = 16
    const val MARK_COUNT_MIN = 3
    const val CREST_COUNT_MIN = 3
    const val SIGIL_COUNT_MIN = 3
    const val SIM_HZ_INVARIANT = 20

    val NEW_TIER_IDS: List<String> = listOf(
        "endgame.tier.saffron_nest",
        "endgame.tier.cobalt_covenant",
    )

    val NEW_CHALLENGE_IDS: List<String> = listOf(
        "endgame.challenge.nest_circuit",
        "endgame.challenge.quest_covenant",
        "endgame.challenge.roast_ascendant",
        "endgame.challenge.nest_revenue",
    )

    val SIGIL_IDS: List<String> = listOf(
        "endgame.sigil.nest_circuit",
        "endgame.sigil.quest_covenant",
        "endgame.sigil.roast_ascendant",
        "endgame.sigil.nest_revenue",
    )
}
