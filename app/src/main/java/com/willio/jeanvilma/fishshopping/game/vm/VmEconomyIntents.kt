package com.willio.jeanvilma.fishshopping.game.vm

import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId
import com.willio.jeanvilma.fishshopping.core.sim.Command
import java.util.UUID

/**
 * Finish 4.0 Phase 4 — economy / staff / contracts / bait / station command intents.
 */
class VmEconomyIntents(
    private val host: VmStationIntentHost,
) {
    fun setMachinePaused(stationId: String, paused: Boolean) {
        host.enqueuePanelCommand(Command.SetMachinePaused(stationId, paused))
    }

    fun purchase(upgradeId: String) {
        host.enqueuePanelCommand(Command.PurchaseUpgrade(upgradeId, UUID.randomUUID().toString()))
    }

    fun buildPlot(plotId: String) {
        host.enqueuePanelCommand(Command.BuildPlot(plotId, UUID.randomUUID().toString()))
    }

    fun purchaseDecor(decorId: String) {
        host.enqueuePanelCommand(Command.PurchaseDecor(decorId, UUID.randomUUID().toString()))
    }

    fun repairMachine(stationId: String) {
        host.enqueuePanelCommand(Command.RepairMachine(stationId, UUID.randomUUID().toString()))
    }

    fun takeLoan(productId: String? = null) {
        host.enqueuePanelCommand(Command.TakeLoan(UUID.randomUUID().toString(), productId))
    }

    fun repayLoan() {
        host.enqueuePanelCommand(Command.RepayLoan(UUID.randomUUID().toString()))
    }

    fun setCoinGoal(amount: Long) {
        host.enqueuePanelCommand(Command.SetCoinGoal(amount))
    }

    fun hire(roleId: String) {
        host.enqueuePanelCommand(Command.HireWorker(roleId, UUID.randomUUID().toString()))
    }

    fun setWorkerShift(workerId: String, onShift: Boolean) {
        host.enqueuePanelCommand(Command.SetWorkerShift(workerId, onShift))
    }

    fun assignWorkerGear(workerId: String, upgradeId: String) {
        host.enqueuePanelCommand(Command.AssignWorkerGear(workerId, upgradeId))
    }

    fun unequipWorkerGear(workerId: String, slotId: String) {
        host.enqueuePanelCommand(Command.UnequipWorkerGear(workerId, slotId))
    }

    fun acceptContract(offerId: String) {
        host.enqueuePanelCommand(Command.AcceptContract(offerId, UUID.randomUUID().toString()))
    }

    fun deliverContract(contractId: String) {
        host.enqueuePanelCommand(Command.DeliverContract(contractId, UUID.randomUUID().toString()))
    }

    fun buyBait(baitId: String) {
        host.enqueuePanelCommand(Command.BuyBait(baitId, UUID.randomUUID().toString()))
    }

    fun selectBait(baitId: String?) {
        host.enqueuePanelCommand(Command.SelectBait(baitId))
    }

    fun selectTechnique(techniqueId: String?) {
        host.enqueuePanelCommand(Command.SelectTechnique(techniqueId))
    }

    fun trainWorkerBranch(workerId: String, branchId: String) {
        host.enqueuePanelCommand(
            Command.TrainWorkerBranch(workerId, branchId, UUID.randomUUID().toString()),
        )
    }

    fun selectWorkerBranch(workerId: String, branchId: String?) {
        host.enqueuePanelCommand(Command.SelectWorkerBranch(workerId, branchId))
    }

    fun setWorkerSchedule(workerId: String, scheduleId: String?) {
        host.enqueuePanelCommand(Command.SetWorkerSchedule(workerId, scheduleId))
    }

    fun claimDailyGoal(objectiveId: String) {
        host.enqueuePanelCommand(Command.ClaimDailyGoal(objectiveId, UUID.randomUUID().toString()))
    }

    fun reel() {
        if (host.panelBlocksWorld()) return
        host.enqueueCommand(Command.Reel)
    }

    fun cycleStationRecipe(stationId: String) {
        if (host.hasPendingOffline()) return
        if (host.panelBlocksWorld() && !host.isPanelOpen(ShellPanelId.STATION)) return
        host.withSimOnSimThread { s ->
            val m = s.state.machines.firstOrNull { it.stationId == stationId } ?: return@withSimOnSimThread
            ProductionSystem.cyclePreferredRecipe(s.content, m)
        }
    }
}
