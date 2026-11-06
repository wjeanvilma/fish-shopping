package com.willio.jeanvilma.fishshopping.core.production

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.content.RecipeDef
import com.willio.jeanvilma.fishshopping.core.content.StationDef
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.sim.Batch
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MachineState
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Machine state machine (blueprint "Production state machine" and "Commit semantics"):
 * waiting for input -> remove inputs into a batch -> processing -> commit output once -> repeat.
 * A batch that finishes while the output is full holds at zero remaining ticks
 * (OUTPUT_FULL) and commits as soon as space frees up; reserved inputs are never lost.
 *
 * [MachineState.preferredRecipeId] locks the station to one recipe (null = auto: first
 * ready recipe in content order). Queue preview lists recipes that can run from current input.
 */
object ProductionSystem {

    fun isUnlocked(def: StationDef, state: GameState): Boolean =
        def.requiresUpgrade == null || def.requiresUpgrade in state.ownedUpgrades

    fun step(ctx: StepContext) {
        for (m in ctx.state.machines) stepMachine(ctx, m)
    }

    fun durationFor(m: MachineState, recipe: RecipeDef): Int = m.recipeDurations[recipe.id] ?: recipe.durationTicks

    /** Human-readable recipe label from a content id (`recipe.basic_portions` → `Basic portions`). */
    fun recipeLabel(recipeId: String): String =
        recipeId.removePrefix("recipe.")
            .split('_')
            .joinToString(" ") { part -> part.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() } }

    fun machineRecipes(ctxContent: ContentPack, machineId: String): List<RecipeDef> =
        ctxContent.machinesById.getValue(machineId).recipes.map { ctxContent.recipesById.getValue(it) }

    /** Recipes that currently have their inputs in the hopper, in run order. */
    fun queuedReady(content: ContentPack, m: MachineState): List<RecipeDef> {
        val recipes = selectableRecipes(content, m)
        return recipes.filter { r -> r.inputs.all { m.input.available(it.item) >= it.quantity } }
    }

    /** Next recipe that would start if output had room (or null). */
    fun nextStartable(content: ContentPack, m: MachineState): RecipeDef? =
        queuedReady(content, m).firstOrNull { fits(content, m.output, it.outputs) }

    fun selectableRecipes(content: ContentPack, m: MachineState): List<RecipeDef> {
        val all = machineRecipes(content, m.machineId)
        val preferred = m.preferredRecipeId
        return if (preferred == null) all
        else all.filter { it.id == preferred }.ifEmpty { all }
    }

    /**
     * Cycles Auto → each machine recipe → Auto. Invalidates unknown preferred ids.
     * Returns the new preferredRecipeId (null = Auto).
     */
    fun cyclePreferredRecipe(content: ContentPack, m: MachineState): String? {
        val ids = machineRecipes(content, m.machineId).map { it.id }
        if (ids.isEmpty()) {
            m.preferredRecipeId = null
            return null
        }
        val cur = m.preferredRecipeId
        val next = when {
            cur == null -> ids.first()
            cur !in ids -> null
            else -> {
                val i = ids.indexOf(cur)
                if (i < 0 || i >= ids.lastIndex) null else ids[i + 1]
            }
        }
        m.preferredRecipeId = next
        return next
    }

    private fun stepMachine(ctx: StepContext, m: MachineState) {
        val tick = ctx.state.tick
        val station = ctx.harbor.stations.first { it.id == m.stationId }
        if (!isUnlocked(station, ctx.state)) {
            m.status = MachineStatus.LOCKED
            return
        }
        if (m.paused) {
            m.status = MachineStatus.PAUSED
            return
        }
        // Drop a preferred recipe that no longer belongs to this machine (content change).
        m.preferredRecipeId?.let { pref ->
            if (pref !in ctx.content.machinesById.getValue(m.machineId).recipes) m.preferredRecipeId = null
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

        val ready = queuedReady(ctx.content, m)
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
    fun statusText(m: MachineState, content: ContentPack, lockedReason: String? = null): String = when (m.status) {
        MachineStatus.WAITING_FOR_INPUT -> waitingText(m, content)
        MachineStatus.PROCESSING -> {
            val id = m.activeBatch?.recipeId
            if (id != null) "Processing ${recipeLabel(id)}" else "Processing"
        }
        MachineStatus.OUTPUT_FULL -> outputFullText(m, content)
        MachineStatus.PAUSED -> "Paused"
        MachineStatus.LOCKED -> lockedReason ?: "Locked — buy an upgrade"
    }

    private fun waitingText(m: MachineState, content: ContentPack): String {
        val preferred = m.preferredRecipeId?.let { content.recipesById[it] }
        if (preferred != null) {
            val missing = preferred.inputs
                .filter { m.input.available(it.item) < it.quantity }
                .joinToString(", ") { content.itemName(it.item) }
            return if (missing.isEmpty()) "Waiting: ${recipeLabel(preferred.id)}"
            else "Needs $missing for ${recipeLabel(preferred.id)}"
        }
        val anyInput = machineRecipes(content, m.machineId)
            .flatMap { it.inputs.map { iq -> content.itemName(iq.item) } }
            .distinct()
        return when {
            anyInput.isEmpty() -> "Needs input"
            anyInput.size == 1 -> "Needs ${anyInput.single()}"
            else -> "Needs input"
        }
    }

    private fun outputFullText(m: MachineState, content: ContentPack): String {
        val recipe = m.activeBatch?.let { content.recipesById[it.recipeId] }
            ?: queuedReady(content, m).firstOrNull()
        val products = recipe?.outputs?.joinToString(", ") { content.itemName(it.item) }
        return if (products != null) "Output full — collect $products"
        else "Output full — collect products"
    }
}
