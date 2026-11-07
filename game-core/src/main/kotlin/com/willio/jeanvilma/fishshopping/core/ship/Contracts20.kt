package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 17 — Contracts 2.0 ship constants
 * (mirrors shared/ship/contracts-2.0.json).
 */
object Contracts20 {
    const val PHASE = 17
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.contracts_2_0.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val DELIVERY_CHAIN_COUNT = 2
    const val REPUTATION_GATED_COUNT = 2
    const val PARITY_FIXTURE = "shared/fixtures/parity-contracts-2.0.json"
    const val CATALOG = "shared/ship/contracts-2.0.json"

    val CHAIN_IDS = listOf(
        "chain.morning_market",
        "chain.harbor_dinner",
    )

    val CHAIN_HEAD_IDS = listOf(
        "contract.chain_morning_catch",
        "contract.chain_dinner_haul",
    )

    val REPUTATION_GATED_IDS = listOf(
        "contract.vip_crate",
        "contract.harbor_elite_board",
    )
}
