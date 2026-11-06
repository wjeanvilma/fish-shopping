package com.willio.jeanvilma.fishshopping.core.workers

import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Phase 20 automation goals: rush idle ticker alerts for stations stuck waiting
 * for input or with a full output while a rush is active.
 */
object AutomationSystem {

    fun step(ctx: StepContext) {
        val rush = CustomerSystem.activeRush(ctx.harbor, ctx.state.tick)
        val alerts = ctx.content.automationAlerts
        for (m in ctx.state.machines) {
            val stDef = ctx.harbor.stations.firstOrNull { it.id == m.stationId }
            if (stDef == null || !ProductionSystem.isUnlocked(stDef, ctx.state)) {
                m.idleTicks = 0
                continue
            }
            val idle = !m.paused && (
                m.status == MachineStatus.WAITING_FOR_INPUT ||
                    m.status == MachineStatus.OUTPUT_FULL
                )
            if (rush == null || !idle) {
                m.idleTicks = 0
                continue
            }
            m.idleTicks++
            if (m.idleTicks < alerts.machineIdleTicksDuringRush) continue
            val since = ctx.state.tick - m.lastIdleAlertTick
            if (m.lastIdleAlertTick > 0L && since < alerts.alertCooldownTicks.toLong()) continue
            m.lastIdleAlertTick = ctx.state.tick
            m.idleTicks = 0
            val reason = when (m.status) {
                MachineStatus.OUTPUT_FULL -> "Output full"
                else -> "No input"
            }
            ctx.emit(GameEvent.MachineIdleAlert(ctx.state.tick, m.stationId, m.machineId, reason))
        }
    }
}
