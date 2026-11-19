package com.willio.jeanvilma.fishshopping.game

import com.willio.jeanvilma.fishshopping.core.sim.SimView

/**
 * Finish 5.0 Phase 4 — derived HUD snapshot for Finish 5 engine loops.
 * Presentation-only; never mutates sim state.
 */
data class LoopHudSnapshot(
    val castPhase: String?,
    val castStrikeStart01: Float,
    val castStrikeEnd01: Float,
    val ticksUntilBagSpoil: Int?,
    val bagSpoilPressurePermille: Int,
    val serviceQueuePressurePermille: Int,
    val minPatienceTicksLeft: Int?,
    val ticksUntilNearestContractDeadline: Int?,
    val contractBoardPressurePermille: Int,
    val nextQuestProgressPermille: Int?,
) {
    companion object {
        fun from(view: SimView): LoopHudSnapshot = LoopHudSnapshot(
            castPhase = view.castPhase,
            castStrikeStart01 = view.castStrikeStart01,
            castStrikeEnd01 = view.castStrikeEnd01,
            ticksUntilBagSpoil = view.ticksUntilBagSpoil,
            bagSpoilPressurePermille = view.bagSpoilPressurePermille,
            serviceQueuePressurePermille = view.serviceQueuePressurePermille,
            minPatienceTicksLeft = view.minPatienceTicksLeft,
            ticksUntilNearestContractDeadline = view.ticksUntilNearestContractDeadline,
            contractBoardPressurePermille = view.contractBoardPressurePermille,
            nextQuestProgressPermille = view.nextQuestProgressPermille,
        )
    }
}
