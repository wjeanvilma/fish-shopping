package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 13 — quests/contracts ship contracts from
 * `shared/ship/quests-contracts-6.json`.
 */
object QuestsContracts6 {
    const val PHASE = 13
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.quests_contracts_6.v1"
    const val CATALOG = "shared/ship/quests-contracts-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-quests-contracts-6.json"
    const val QUESTS_CONTRACTS_6_MARKER = "authored-finish-6.0-phase-13"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val QUESTS_MIN = 100
    const val DELIVERY_CHAINS_MIN = 9
    const val REPUTATION_GATED_MIN = 12
    const val CONTRACT_TEMPLATES_MIN = 85
    const val VALIDATE_SCRIPT = "quests6:validate"
    const val TERMINAL_QUEST = "quest.nest_covenant"

    val NEW_QUESTS = listOf(
        "quest.roast_line",
        "quest.ferment_line",
        "quest.saffron_curator",
        "quest.cobalt_curator",
        "quest.harbor_fourteen",
        "quest.nest_admiral",
        "quest.roast_gourmet",
        "quest.ferment_stockist",
        "quest.board_regent",
        "quest.perfect_nest",
        "quest.school_flash_wave",
        "quest.nest_pressure",
        "quest.spoil_sentinel",
        "quest.critic_nest",
        "quest.tourist_nest",
        "quest.night_nest",
        "quest.staff_nest",
        "quest.branch_nest",
        "quest.rival_nest",
        "quest.endgame_nest",
        "quest.bank_nest",
        "quest.revenue_nest",
        "quest.mastery_nest",
        "quest.nest_covenant",
    )

    val NEW_CHAINS = listOf("chain.saffron_roast", "chain.cobalt_ferment")
}
