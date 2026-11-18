package com.willio.jeanvilma.fishshopping.game.vm

import com.willio.jeanvilma.fishshopping.core.deeplink.DeepLinkRoutes
import com.willio.jeanvilma.fishshopping.core.sim.Command
import java.util.UUID

/**
 * Finish 4.0 Phase 4 — harbor travel + deep-link consumption intents.
 */
class VmTravelIntents(
    private val host: VmTravelIntentHost,
    private val shell: VmShellIntents,
) {
    fun travelToHarbor(harborId: String) {
        host.enqueuePanelCommand(Command.TravelToHarbor(harborId, UUID.randomUUID().toString()))
    }

    fun applyDeepLink(
        intent: DeepLinkRoutes.Intent,
        canAutoContinueFromTitle: Boolean,
        queueUntilReady: (DeepLinkRoutes.Intent) -> Unit,
    ) {
        if (intent.isEmpty) return
        if (host.isReadyWithSim()) {
            host.launchSimConsume { consumeDeepLink(intent) }
            return
        }
        queueUntilReady(intent)
        if (canAutoContinueFromTitle) {
            host.continueGameFromTitle()
        }
    }

    fun consumeDeepLink(intent: DeepLinkRoutes.Intent) {
        shell.openFromDeepLink(intent.panel)
        val harbor = intent.harborId?.trim().orEmpty()
        if (harbor.isNotEmpty()) travelToHarbor(harbor)
    }
}
