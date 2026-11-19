package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.DecorDef
import com.willio.jeanvilma.fishshopping.core.content.RectMm
import com.willio.jeanvilma.fishshopping.core.sim.DecorPlacement
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/** Cozy art pass 5 decor placement rules (mirrors web DECOR_PLACEMENT). */
object DecorPlacementRules {
    /** Positions snap to this grid. */
    const val GRID_MM = 250
    /** Footprint radius of any placed decor item. */
    const val RADIUS_MM = 600
    /** Extra clearance from zones and machine/counter footprints. */
    const val CLEARANCE_MM = 400
    /** Keep this far inside the quay edge (the edge band holds scenery props). */
    const val EDGE_INSET_MM = 1300
    /** Minimum centre-to-centre spacing between placed decor items. */
    const val SPACING_MM = 1300
    /** Keep-out radius around the player spawn and customer entry. */
    const val KEEP_OUT_MM = 1600
    /** Keep-out radius around each queue slot. */
    const val QUEUE_KEEP_OUT_MM = 1100
}

/**
 * Phase 23 shop decor: buy-once placable cosmetics that add a tiny customer
 * patience buff. Banner-gated pieces reuse prestige cosmetic IDs.
 * Cozy art pass 5: owned decor can be placed on open quay ground per harbor (cosmetic only).
 */
object DecorSystem {

    /** Round half away from zero onto the placement grid (matches JS Math.round for our ranges). */
    fun snap(mm: Int): Int {
        val g = DecorPlacementRules.GRID_MM
        return Math.floorDiv(mm + g / 2, g) * g
    }

    /** Why [decorId] cannot stand at (x, z) mm in the active harbor, or null if it can. */
    fun placementProblem(content: ContentPack, s: GameState, decorId: String, xMm: Int, zMm: Int): String? {
        if (decorId !in content.decorById) return "Unknown decor"
        if (decorId !in s.ownedDecor) return "Buy it first"
        val h = content.harborsById.getValue(s.harborId)
        val p = DecorPlacementRules
        val inside = h.walkable.filter { "land" in it.id }.any { r ->
            xMm >= r.minX + p.EDGE_INSET_MM && xMm <= r.maxX - p.EDGE_INSET_MM &&
                zMm >= r.minZ + p.EDGE_INSET_MM && zMm <= r.maxZ - p.EDGE_INSET_MM
        }
        if (!inside) return "Place it on open quay ground"
        val reach = (p.RADIUS_MM + p.CLEARANCE_MM).toLong()
        fun near(r: RectMm): Boolean {
            val dx = maxOf(r.minX - xMm, 0, xMm - r.maxX).toLong()
            val dz = maxOf(r.minZ - zMm, 0, zMm - r.maxZ).toLong()
            return dx * dx + dz * dz < reach * reach
        }
        if (h.obstacles.any(::near)) return "Too close to a station"
        if (h.zones.any { near(it.rect) }) return "Too close to a work area"
        fun far(x: Int, z: Int, r: Int): Boolean {
            val dx = (x - xMm).toLong()
            val dz = (z - zMm).toLong()
            return dx * dx + dz * dz >= r.toLong() * r
        }
        if (!far(h.playerSpawn.x, h.playerSpawn.z, p.KEEP_OUT_MM)) return "Keep the spawn point clear"
        if (!far(h.customerEntry.x, h.customerEntry.z, p.KEEP_OUT_MM)) return "Keep the entrance clear"
        for (c in h.counters) {
            for (i in 0 until c.maxQueue) {
                val q = c.queueSlot(i)
                if (!far(q.x, q.z, p.QUEUE_KEEP_OUT_MM)) return "Keep the queue clear"
            }
        }
        s.decorPlacements[s.harborId]?.forEach { (id, placed) ->
            if (id != decorId && !far(placed.xMm, placed.zMm, p.SPACING_MM)) return "Too close to other decor"
        }
        return null
    }

    fun place(ctx: StepContext, decorId: String, xMm: Int, zMm: Int, rotationQuarter: Int) {
        val s = ctx.state
        val x = snap(xMm)
        val z = snap(zMm)
        val rot = Math.floorMod(rotationQuarter, 4)
        placementProblem(ctx.content, s, decorId, x, z)?.let { problem ->
            ctx.emit(GameEvent.DecorPlaceRejected(s.tick, decorId, problem))
            return
        }
        val placed = s.decorPlacements.getOrPut(s.harborId) { java.util.TreeMap() }
        val moved = decorId in placed
        placed[decorId] = DecorPlacement(x, z, rot)
        ctx.emit(GameEvent.DecorPlaced(s.tick, decorId, s.harborId, x, z, rot, moved))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "decor"))
    }

    fun store(ctx: StepContext, decorId: String) {
        val s = ctx.state
        val placed = s.decorPlacements[s.harborId]
        if (placed == null || placed.remove(decorId) == null) {
            ctx.emit(GameEvent.DecorPlaceRejected(s.tick, decorId, "Not placed here"))
            return
        }
        if (placed.isEmpty()) s.decorPlacements.remove(s.harborId)
        ctx.emit(GameEvent.DecorStored(s.tick, decorId, s.harborId))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "decor"))
    }

    fun patienceBonusTicks(content: ContentPack, s: GameState): Int =
        content.decor.items.sumOf { d ->
            if (d.id in s.ownedDecor) d.patienceBonusTicks else 0
        }

    fun missingRequirement(content: ContentPack, s: GameState, def: DecorDef): String? {
        val cos = def.requiresCosmetic ?: return null
        if (cos in s.unlockedCosmetics) return null
        return content.prestige.milestones.firstOrNull { it.reward.cosmetic == cos }?.name ?: cos
    }

    fun availability(content: ContentPack, s: GameState, def: DecorDef): DecorAvailability {
        if (def.id in s.ownedDecor) return DecorAvailability.Owned
        missingRequirement(content, s, def)?.let { return DecorAvailability.Locked(it) }
        if (s.coins < def.cost) {
            return DecorAvailability.TooExpensive(def.cost - s.coins)
        }
        return DecorAvailability.Purchasable
    }

    fun purchase(ctx: StepContext, decorId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { prior ->
            ctx.emit(GameEvent.DecorPurchased(s.tick, decorId, prior, replayed = true))
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.DecorPurchaseRejected(s.tick, decorId, requestId, reason))
        }
        val def = ctx.content.decorById[decorId] ?: return reject("Unknown decor")
        when (val a = availability(ctx.content, s, def)) {
            DecorAvailability.Owned -> reject("Already owned")
            is DecorAvailability.Locked -> reject("Requires: ${a.reason}")
            is DecorAvailability.TooExpensive -> reject("Need ${a.missing} more coins")
            DecorAvailability.Purchasable -> {
                s.coins -= def.cost
                s.ownedDecor += def.id
                s.bumpStat(Stats.DECOR_BOUGHT)
                val receipt = Receipt(s.newId("receipt"), "decor", -def.cost, s.tick, requestId)
                s.purchaseReceipts[requestId] = receipt
                s.record(receipt)
                ctx.emit(GameEvent.DecorPurchased(s.tick, def.id, receipt, replayed = false))
                ctx.emit(GameEvent.CheckpointRequested(s.tick, "purchase"))
            }
        }
    }
}

sealed interface DecorAvailability {
    data object Owned : DecorAvailability
    data object Purchasable : DecorAvailability
    data class Locked(val reason: String) : DecorAvailability
    data class TooExpensive(val missing: Long) : DecorAvailability
}
