package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.content.PlotDef
import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Phase 6 plot construction: walk onto an expansion marker, inspect, confirm spend.
 * Building grants the linked unlock upgrade atomically (station/counter register).
 */
object PlotSystem {

    fun plotForUpgrade(harbor: HarborDef, upgradeId: String): PlotDef? =
        harbor.plotsByUpgrade[upgradeId]

    fun requiresPlotPresence(harbor: HarborDef, upgradeId: String): Boolean =
        plotForUpgrade(harbor, upgradeId) != null

    fun standingOnPlot(s: GameState, plot: PlotDef): Boolean =
        s.player.zoneId == plot.zone

    fun standingOnUpgradePlot(harbor: HarborDef, s: GameState, upgradeId: String): Boolean {
        val plot = plotForUpgrade(harbor, upgradeId) ?: return true
        return standingOnPlot(s, plot)
    }

    /**
     * Confirm spend while standing on [plotId].
     * Reuses upgrade purchase receipts so retries stay idempotent.
     */
    fun build(ctx: StepContext, plotId: String, requestId: String) {
        val s = ctx.state
        val plot = ctx.harbor.plotsById[plotId]
        if (plot == null) {
            ctx.emit(GameEvent.PlotBuildRejected(s.tick, plotId, requestId, "Unknown plot"))
            return
        }
        val zone = s.player.zoneId?.let { ctx.harbor.zonesById[it] }
        if (zone == null || zone.kind != ZoneKind.PLOT || zone.id != plot.zone) {
            ctx.emit(GameEvent.PlotBuildRejected(s.tick, plotId, requestId, "Stand on the expansion marker"))
            return
        }
        val eventCountBefore = ctx.events.size
        UpgradeSystem.purchase(ctx, plot.grantsUpgrade, requestId)
        val newEvents = ctx.events.subList(eventCountBefore, ctx.events.size).toList()
        val rejected = newEvents.filterIsInstance<GameEvent.PurchaseRejected>().lastOrNull()
        if (rejected != null) {
            ctx.emit(GameEvent.PlotBuildRejected(s.tick, plotId, requestId, rejected.reason))
            return
        }
        val purchased = newEvents.filterIsInstance<GameEvent.UpgradePurchased>().lastOrNull()
        if (purchased != null) {
            ctx.emit(
                GameEvent.PlotBuilt(
                    s.tick,
                    plotId,
                    plot.grantsUpgrade,
                    purchased.receipt,
                    replayed = purchased.replayed,
                ),
            )
        }
    }
}
