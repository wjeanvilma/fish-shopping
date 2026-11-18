package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 27 — quests/contracts expansion ship constants
 * (mirrors shared/ship/quests-contracts-3.json).
 */
object QuestsContracts3 {
    const val PHASE = 27
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.quests_contracts_3.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val QUESTS_CONTRACTS_3_MARKER = "authored-finish-3.0-phase-27"
    const val CATALOG = "shared/ship/quests-contracts-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-quests-contracts-3.json"
    const val EXTENDS_CONTRACTS_20 = "shared/ship/contracts-2.0.json"
    const val QUESTS_MIN = 30
    const val DELIVERY_CHAINS_MIN = 3
    const val REPUTATION_GATED_MIN = 3
    const val CONTRACT_TEMPLATES_MIN = 43
    const val NEW_CHAIN = "chain.dawn_express"
    const val NEW_CHAIN_HEAD = "contract.chain_dawn_catch"
    const val SIM_HZ_INVARIANT = 20

    val NEW_QUESTS: List<String> = listOf(
        "quest.rival_pressure",
        "quest.loan_ledger",
        "quest.decor_touch",
        "quest.mastery_climb",
        "quest.daily_grind",
        "quest.achievement_hunter",
        "quest.chain_captain",
        "quest.premium_counter",
        "quest.repair_crew",
        "quest.endgame_beacon",
    )

    val NEW_REPUTATION_GATED: List<String> = listOf(
        "contract.trusted_bulk",
        "contract.legend_crate",
    )
}
