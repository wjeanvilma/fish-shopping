package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.inventory.InvariantChecker
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem
import com.willio.jeanvilma.fishshopping.core.progression.PrestigeSystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.workers.AutomationSystem
import com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem
import com.willio.jeanvilma.fishshopping.core.world.HarborTravelSystem
import com.willio.jeanvilma.fishshopping.core.world.MovementSystem
import com.willio.jeanvilma.fishshopping.core.world.TransferSystem

/** Everything a system needs for one tick. */
class StepContext(val content: ContentPack, val state: GameState) {
    /** Resolved each access so TravelToHarbor takes effect mid-tick. */
    val harbor: HarborDef get() = content.harborsById.getValue(state.harborId)
    val events = mutableListOf<GameEvent>()
    fun emit(e: GameEvent) {
        events += e
    }
}

/**
 * The canonical simulation. Not thread-safe by design: the host must call it
 * from one serialized loop (blueprint "Concurrency").
 */
class Simulation(val content: ContentPack, val state: GameState) {
    val harbor: HarborDef get() = content.harborsById.getValue(state.harborId)

    /**
     * Advances exactly one tick. The update order is part of the cross-platform
     * contract: commands; movement; arrivals; fishing and transfers; production;
     * customers and payment; task scheduling; quest events; checkpoint requests.
     */
    fun step(commands: List<Command> = emptyList()): List<GameEvent> {
        state.tick++
        val ctx = StepContext(content, state)
        commands.forEach { applyCommand(ctx, it) }
        MovementSystem.step(ctx)
        MovementSystem.updateZone(ctx)
        FishingSystem.step(ctx)
        TransferSystem.step(ctx)
        ProductionSystem.step(ctx)
        CustomerSystem.step(ctx)
        WorkerSystem.step(ctx)
        AutomationSystem.step(ctx)
        ProgressionSystem.step(ctx)
        PrestigeSystem.step(ctx)
        com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.step(ctx)
        ContractSystem.step(ctx)
        EconomySystem.step(ctx)
        com.willio.jeanvilma.fishshopping.core.economy.BankSystem.step(ctx)
        if (state.tick % SimConstants.CHECKPOINT_INTERVAL_TICKS == 0L) {
            ctx.emit(GameEvent.CheckpointRequested(state.tick, "periodic"))
        }
        return ctx.events
    }

    /** Runs [ticks] ticks with no new commands. Returns all events. */
    fun run(ticks: Int): List<GameEvent> = buildList { repeat(ticks) { addAll(step()) } }

    fun invariantProblems(): List<String> = InvariantChecker.check(content, state)

    private fun applyCommand(ctx: StepContext, c: Command) {
        when (c) {
            is Command.Move -> {
                val s = SimConstants.INPUT_SCALE
                state.player.inputX = c.x.coerceIn(-s, s)
                state.player.inputZ = c.z.coerceIn(-s, s)
            }
            is Command.PurchaseUpgrade -> UpgradeSystem.purchase(ctx, c.upgradeId, c.requestId)
            is Command.BuildPlot -> com.willio.jeanvilma.fishshopping.core.world.PlotSystem.build(ctx, c.plotId, c.requestId)
            is Command.SetMachinePaused -> state.machines.firstOrNull { it.stationId == c.stationId }?.paused = c.paused
            is Command.Reel -> state.player.reelRequested = true
            is Command.SelectMachineRecipe -> {
                val m = state.machines.firstOrNull { it.stationId == c.stationId } ?: return
                val allowed = content.machinesById[m.machineId]?.recipes.orEmpty()
                m.preferredRecipeId = c.recipeId?.takeIf { it in allowed }
            }
            is Command.HireWorker -> WorkerSystem.hire(ctx, c.roleId, c.requestId)
            is Command.SetWorkerShift -> WorkerSystem.setShift(ctx, c.workerId, c.onShift)
            is Command.AssignWorkerGear -> WorkerSystem.assignGear(ctx, c.workerId, c.upgradeId)
            is Command.UnequipWorkerGear -> WorkerSystem.unequipGear(ctx, c.workerId, c.slotId)
            is Command.AcceptContract -> ContractSystem.accept(ctx, c.offerId, c.requestId)
            is Command.DeliverContract -> ContractSystem.deliver(ctx, c.contractId, c.requestId)
            is Command.TravelToHarbor -> HarborTravelSystem.travel(ctx, c.harborId, c.requestId)
            is Command.BuyBait -> com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem.buy(ctx, c.baitId, c.requestId)
            is Command.SelectBait -> com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem.select(state, content, c.baitId)
            is Command.PurchaseDecor -> com.willio.jeanvilma.fishshopping.core.world.DecorSystem.purchase(ctx, c.decorId, c.requestId)
            is Command.GrantFullHarborUnlock -> FullUnlockSystem.grant(ctx, c.requestId)
            is Command.GrantIapCosmetic -> CosmeticsIapSystem.grant(ctx, c.cosmeticId, c.requestId)
            is Command.RepairMachine -> EconomySystem.repair(ctx, c.stationId, c.requestId)
            is Command.TakeLoan -> com.willio.jeanvilma.fishshopping.core.economy.BankSystem.takeLoan(ctx, c.requestId)
            is Command.RepayLoan -> com.willio.jeanvilma.fishshopping.core.economy.BankSystem.repayLoan(ctx, c.requestId)
            is Command.SetCoinGoal -> com.willio.jeanvilma.fishshopping.core.economy.BankSystem.setCoinGoal(ctx, c.amount)
        }
    }
}
