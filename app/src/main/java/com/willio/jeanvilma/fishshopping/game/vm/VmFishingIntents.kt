package com.willio.jeanvilma.fishshopping.game.vm

import com.willio.jeanvilma.fishshopping.core.sim.Command
import java.util.UUID

/**
 * Finish 5.0 Phase 4 — fishing loop intents (reel / bait / technique)
 * extracted from [VmEconomyIntents] for cast-phase + spoil depth wiring.
 */
class VmFishingIntents(
    private val host: VmPanelCommandHost,
) {
    fun buyBait(baitId: String) {
        host.enqueuePanelCommand(Command.BuyBait(baitId, UUID.randomUUID().toString()))
    }

    fun selectBait(baitId: String?) {
        host.enqueuePanelCommand(Command.SelectBait(baitId))
    }

    fun selectTechnique(techniqueId: String?) {
        host.enqueuePanelCommand(Command.SelectTechnique(techniqueId))
    }

    fun reel() {
        if (host.panelBlocksWorld()) return
        host.enqueueCommand(Command.Reel)
    }
}
