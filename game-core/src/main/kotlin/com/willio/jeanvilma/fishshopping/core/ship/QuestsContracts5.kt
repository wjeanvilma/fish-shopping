package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 16 — quests/contracts expansion ship constants
 * (mirrors shared/ship/quests-contracts-5.json).
 */
object QuestsContracts5 {
    const val PHASE = 16
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.quests_contracts_5.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val QUESTS_CONTRACTS_5_MARKER = "authored-finish-5.0-phase-16"
    const val CATALOG = "shared/ship/quests-contracts-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-quests-contracts-5.json"
    const val EXTENDS_QUESTS_CONTRACTS_4 = "shared/ship/quests-contracts-4.json"
    const val QUESTS_MIN = 75
    const val DELIVERY_CHAINS_MIN = 7
    const val REPUTATION_GATED_MIN = 9
    const val CONTRACT_TEMPLATES_MIN = 70
    const val SIM_HZ_INVARIANT = 20

    val NEW_QUESTS: List<String> = listOf(
        "quest.poach_line",
        "quest.can_line",
        "quest.aurora_curator",
        "quest.tideglass_curator",
        "quest.harbor_dozen",
        "quest.chain_commodore",
        "quest.poach_gourmet",
        "quest.can_stockist",
        "quest.board_marshal",
        "quest.perfect_circuit",
        "quest.cast_strike_wave",
        "quest.pressure_cook",
        "quest.spoil_watch",
        "quest.critic_salon",
        "quest.tourist_armada",
        "quest.night_armada",
        "quest.staff_maestro",
        "quest.branch_trainer",
        "quest.rival_rout",
        "quest.endgame_marks",
        "quest.bank_sovereign",
        "quest.revenue_crown",
        "quest.legend_circuit",
    )

    val NEW_CHAINS: List<String> = listOf(
        "chain.aurora_run",
        "chain.tideglass_ferry",
    )

    val NEW_CHAIN_HEADS: List<String> = listOf(
        "contract.chain_aurora_catch",
        "contract.chain_tide_catch",
    )

    val NEW_REPUTATION_GATED: List<String> = listOf(
        "contract.poach_trust",
        "contract.aurora_vip",
        "contract.can_legend",
    )

    const val TERMINAL_QUEST = "quest.legend_circuit"
}
