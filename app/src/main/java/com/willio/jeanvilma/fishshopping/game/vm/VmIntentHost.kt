package com.willio.jeanvilma.fishshopping.game.vm

import com.willio.jeanvilma.fishshopping.billing.EntitlementBilling
import com.willio.jeanvilma.fishshopping.billing.PendingEntitlementLedger
import com.willio.jeanvilma.fishshopping.billing.RestoredEntitlement
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.Simulation

/**
 * Finish 4.0 Phase 4 — shared host surface for GameViewModel intent modules
 * (shell / economy / travel / IAP).
 */
interface VmPanelCommandHost {
    fun enqueuePanelCommand(command: Command)
    fun enqueueCommand(command: Command)
    fun launchSim(block: suspend () -> Unit)
    fun emitMessage(text: String)
    fun panelBlocksWorld(): Boolean
    fun hasPendingOffline(): Boolean
    fun isPanelOpen(id: ShellPanelId): Boolean
}

interface VmShellIntentHost : VmPanelCommandHost {
    fun setPanelOpen(which: ShellPanelId, open: Boolean)
    fun syncWallClockNow()
}

interface VmTravelIntentHost : VmShellIntentHost {
    fun travelToHarbor(harborId: String)
    fun continueGameFromTitle()
    fun isReadyWithSim(): Boolean
    fun launchSimConsume(block: suspend () -> Unit)
}

interface VmIapIntentHost {
    fun cloudAccountId(): String?
    val billing: EntitlementBilling
    val pendingEntitlements: PendingEntitlementLedger
    fun emitMessage(text: String)
    fun launchMain(block: suspend () -> Unit)
    fun launchSim(block: suspend () -> Unit)
    fun applyStoreOwned(owned: List<RestoredEntitlement>, announceRestore: Boolean)
}

interface VmStationIntentHost : VmPanelCommandHost {
    fun withSimOnSimThread(block: suspend (Simulation) -> Unit)
}
