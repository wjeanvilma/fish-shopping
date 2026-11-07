package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.inventory.Transfers
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Ground-plane movement with 3D presentation (blueprint "Collision and navigation").
 * Integer millimetres; integer division truncates toward zero (TypeScript: Math.trunc).
 */
object MovementSystem {
    /** Obstacles are inflated by this radius so the character never visually overlaps a station. */
    const val PLAYER_RADIUS_MM = 300

    fun isOpen(h: HarborDef, x: Int, z: Int): Boolean =
        h.walkable.any { it.contains(x, z) } &&
            h.obstacles.none {
                x >= it.minX - PLAYER_RADIUS_MM && x < it.maxX + PLAYER_RADIUS_MM &&
                    z >= it.minZ - PLAYER_RADIUS_MM && z < it.maxZ + PLAYER_RADIUS_MM
            }

    fun step(ctx: StepContext) {
        val p = ctx.state.player
        var ix = p.inputX.toLong()
        var iz = p.inputZ.toLong()
        val len = SafeMath.isqrt(ix * ix + iz * iz)
        if (len == 0L) return
        val scale = SimConstants.INPUT_SCALE.toLong()
        if (len > scale) {
            ix = ix * scale / len
            iz = iz * scale / len
        }
        val speed = ctx.content.player.moveSpeedMmPerTick.toLong()
        val dx = (ix * speed / scale).toInt()
        val dz = (iz * speed / scale).toInt()
        p.facingX = ix.toInt()
        p.facingZ = iz.toInt()

        val h = ctx.harbor
        // Try the full move, then slide along each axis.
        when {
            isOpen(h, p.x + dx, p.z + dz) -> { p.x += dx; p.z += dz }
            isOpen(h, p.x + dx, p.z) -> p.x += dx
            isOpen(h, p.x, p.z + dz) -> p.z += dz
        }
    }

    fun updateZone(ctx: StepContext) {
        val p = ctx.state.player
        val zone = ctx.harbor.zones.firstOrNull { it.rect.contains(p.x, p.z) }?.id
        if (zone != p.zoneId) {
            p.zoneId = zone
            p.transferCooldown = 0
            ctx.emit(GameEvent.ZoneEntered(ctx.state.tick, zone))
        }
    }
}

/**
 * Automatic transfers while the player stands in a station zone: one item per
 * transferIntervalTicks, only of a type the destination accepts.
 */
object TransferSystem {
    fun step(ctx: StepContext) {
        val p = ctx.state.player
        if (p.transferCooldown > 0) {
            p.transferCooldown--
            return
        }
        val zone = p.zoneId?.let { ctx.harbor.zonesById[it] } ?: return
        val moved: Boolean = when (zone.kind) {
            ZoneKind.MACHINE_INPUT -> {
                val station = ctx.harbor.stations.first { it.inputZone == zone.id }
                if (!ProductionSystem.isUnlocked(station, ctx.state)) false
                else {
                    val machine = ctx.state.machines.first { it.stationId == station.id }
                    val accepted = ctx.content.machinesById.getValue(machine.machineId).recipes
                        .flatMap { ctx.content.recipesById.getValue(it).inputs.map { iq -> iq.item } }.toSet()
                    Transfers.moveFirstAccepted(p.bag, machine.input) { it in accepted }
                        ?.also { item ->
                            ctx.state.bumpStat(Stats.MACHINE_INPUTS)
                            ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, p.bag.id, machine.input.id, item, 1))
                        } != null
                }
            }
            ZoneKind.MACHINE_OUTPUT -> {
                val station = ctx.harbor.stations.first { it.outputZone == zone.id }
                if (!ProductionSystem.isUnlocked(station, ctx.state)) false
                else {
                    val machine = ctx.state.machines.first { it.stationId == station.id }
                    Transfers.moveFirstAccepted(machine.output, p.bag) { true }
                        ?.also { item ->
                            ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED)
                            ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, machine.output.id, p.bag.id, item, 1))
                        } != null
                }
            }
            ZoneKind.COUNTER -> {
                val counter = ctx.state.counters.first { c -> ctx.harbor.counters.first { it.id == c.counterId }.zone == zone.id }
                val def = ctx.harbor.counters.first { it.id == counter.counterId }
                if (!CustomerSystem.isUnlocked(def, ctx.state)) false
                else Transfers.moveFirstAccepted(p.bag, counter.stock) { def.accepts(it) }
                    ?.also { item ->
                        ctx.state.bumpStat(Stats.COUNTER_STOCKED)
                        ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, p.bag.id, counter.stock.id, item, 1))
                    } != null
            }
            ZoneKind.FISHING, ZoneKind.KIOSK, ZoneKind.PLOT -> false
        }
        if (moved) p.transferCooldown = ctx.content.player.transferIntervalTicks - 1
    }
}
