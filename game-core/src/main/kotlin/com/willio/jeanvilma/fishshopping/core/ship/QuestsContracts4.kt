package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 14 — quests/contracts expansion ship constants
 * (mirrors shared/ship/quests-contracts-4.json).
 */
object QuestsContracts4 {
    const val PHASE = 14
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.quests_contracts_4.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24
    const val QUESTS_CONTRACTS_4_MARKER = "authored-finish-4.0-phase-14"
    const val CATALOG = "shared/ship/quests-contracts-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-quests-contracts-4.json"
    const val EXTENDS_QUESTS_CONTRACTS_3 = "shared/ship/quests-contracts-3.json"
    const val QUESTS_MIN = 50
    const val DELIVERY_CHAINS_MIN = 5
    const val REPUTATION_GATED_MIN = 6
    const val CONTRACT_TEMPLATES_MIN = 55
    const val SIM_HZ_INVARIANT = 20

    val NEW_QUESTS: List<String> = listOf(
        "quest.braise_line",
        "quest.glaze_glamour",
        "quest.mist_curator",
        "quest.prism_curator",
        "quest.bulk_board",
        "quest.chain_admiral",
        "quest.harbor_decade",
        "quest.bait_stockist",
        "quest.night_shift",
        "quest.wholesaler_wave",
        "quest.staff_academy",
        "quest.ice_logistics",
        "quest.critic_table",
        "quest.tourist_tide",
        "quest.loan_cleared",
        "quest.endgame_trials",
        "quest.rival_undercut",
        "quest.market_legend",
    )

    val NEW_CHAINS: List<String> = listOf(
        "chain.mist_runner",
        "chain.prism_relay",
    )

    val NEW_CHAIN_HEADS: List<String> = listOf(
        "contract.chain_mist_catch",
        "contract.chain_prism_catch",
    )

    val NEW_REPUTATION_GATED: List<String> = listOf(
        "contract.braise_trust",
        "contract.plaza_vip",
        "contract.glaze_legend",
    )

    const val TERMINAL_QUEST = "quest.market_legend"
}
