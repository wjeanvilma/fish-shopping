package com.willio.jeanvilma.fishshopping.core.production

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.content.RecipeDef
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.sim.Batch
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.MachineState
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Machine state machine (blueprint "Production state machine" and "Commit semantics"):
 * waiting for input -> remove inputs into a batch -> processing -> commit output once -> repeat.
 * A batch that finishes while the output is full holds at zero remaining ticks
 * (OUTPUT_FULL) and commits as soon as space frees up; reserved inputs are never lost.
 */
object ProductionSystem {

    fun step(ctx: StepContext) {
        for (m in ctx.state.machines) stepMachine(ctx, m)
    }

    fun durationFor(m: MachineState, recipe: RecipeDef): Int = m.recipeDurations[recipe.id] ?: recipe.durationTicks

    private fun stepMachine(ctx: StepContext, m: MachineState) {
        val tick = ctx.state.tick
        if (m.paused) {
            m.status = MachineStatus.PAUSED
            return
        }
        m.activeBatch?.let { batch ->
            if (batch.remainingTicks > 0) batch.remainingTicks--
            if (batch.remainingTicks > 0) {
                m.status = MachineStatus.PROCESSING
                return
            }
            val recipe = ctx.content.recipesById.getValue(batch.recipeId)
            if (!fits(ctx.content, m.output, recipe.outputs)) {
                m.status = MachineStatus.OUTPUT_FULL
                return
            }
            recipe.outputs.forEach { m.output.add(it.item, it.quantity) }
            m.activeBatch = null
            ctx.emit(GameEvent.BatchCompleted(tick, batch.id, m.stationId))
        }

        // Start the next batch: first recipe (content order) whose inputs are present and whose outputs will fit.
        val recipes = ctx.content.machinesById.getValue(m.machineId).recipes.map { ctx.content.recipesById.getValue(it) }
        val ready = recipes.filter { r -> r.inputs.all { m.input.available(it.item) >= it.quantity } }
        val startable = ready.firstOrNull { fits(ctx.content, m.output, it.outputs) }
        if (startable == null) {
            m.status = if (ready.isNotEmpty()) MachineStatus.OUTPUT_FULL else MachineStatus.WAITING_FOR_INPUT
            return
        }
        startable.inputs.forEach { m.input.remove(it.item, it.quantity) }
        val duration = durationFor(m, startable)
        val batch = Batch(ctx.state.newId("batch"), startable.id, duration, duration, startable.inputs)
        m.activeBatch = batch
        m.status = MachineStatus.PROCESSING
        ctx.emit(GameEvent.BatchStarted(tick, batch.id, m.stationId, startable.id))
    }

    private fun fits(content: ContentPack, inv: Inventory, items: List<ItemQuantity>): Boolean =
        items.sumOf { content.carryUnits(it.item) * it.quantity } <= inv.freeUnits()

    /** Short player-facing reason for the current state (blueprint: every blocked state shows a reason). */
    fun statusText(m: MachineState): String = when (m.status) {
        MachineStatus.WAITING_FOR_INPUT -> "Needs fish"
        MachineStatus.PROCESSING -> "Processing"
        MachineStatus.OUTPUT_FULL -> "Output full - collect portions"
        MachineStatus.PAUSED -> "Paused"
    }
}
