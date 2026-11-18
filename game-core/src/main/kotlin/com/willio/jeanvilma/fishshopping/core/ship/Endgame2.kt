package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 17 — endgame deepen + schema 25 ship constants
 * (mirrors shared/ship/endgame-2.json).
 */
object Endgame2 {
    const val PHASE = 17
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.endgame_2.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val FROM_SCHEMA = 24
    const val TO_SCHEMA = 25
    const val ENDGAME_2_MARKER = "authored-finish-4.0-phase-17"
    const val CATALOG = "shared/ship/endgame-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-endgame-2.json"
    const val LEGACY_FIXTURE = "shared/fixtures/legacy/snapshot-v24-starter-line-t2500.json"
    const val TIER_COUNT_MIN = 6
    const val CHALLENGE_COUNT_MIN = 8
    const val MARK_COUNT_MIN = 3
    const val SIM_HZ_INVARIANT = 20

    val NEW_TIER_IDS: List<String> = listOf(
        "endgame.tier.mist_sovereign",
        "endgame.tier.prism_crown",
    )

    val NEW_CHALLENGE_IDS: List<String> = listOf(
        "endgame.challenge.rival_armada",
        "endgame.challenge.chain_admiral",
        "endgame.challenge.harbor_decade",
        "endgame.challenge.mastery_legend",
    )

    val MARK_IDS: List<String> = listOf(
        "endgame.mark.rival_armada",
        "endgame.mark.chain_admiral",
        "endgame.mark.harbor_decade",
        "endgame.mark.mastery_legend",
    )
}
