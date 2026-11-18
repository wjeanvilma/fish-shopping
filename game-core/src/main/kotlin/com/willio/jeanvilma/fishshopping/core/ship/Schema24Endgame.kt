package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 15 — schema 24 + endgame deepen
 * (mirrors shared/ship/schema-24-endgame.json).
 */
object Schema24Endgame {
    const val PHASE = 15
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.schema_24_endgame.v1"
    const val CATALOG = "shared/ship/schema-24-endgame.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-schema-24-endgame.json"
    const val MARKER = "authored-finish-3.0-phase-15"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val FROM_SCHEMA = 23
    const val TO_SCHEMA = 24
    const val TIER_COUNT = 4
    const val CHALLENGE_COUNT = 4
    const val LEGACY_FIXTURE = "shared/fixtures/legacy/snapshot-v23-starter-line-t2500.json"
    const val AUTHOR_TOOL = "shared/tools/mutate_phase15_endgame.py"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val VALIDATE_SCRIPT = "npm run schema24:validate"

    val TIER_IDS = listOf(
        "endgame.tier.deep_harbor",
        "endgame.tier.rival_warden",
        "endgame.tier.legend_pier",
        "endgame.tier.crown_market",
    )

    val CHALLENGE_IDS = listOf(
        "endgame.challenge.rival_sweep",
        "endgame.challenge.prestige_surge",
        "endgame.challenge.codex_depth",
        "endgame.challenge.market_master",
    )

    val STATS = listOf(
        "stat.endgame_tiers_unlocked",
        "stat.endgame_challenges_completed",
    )
}
