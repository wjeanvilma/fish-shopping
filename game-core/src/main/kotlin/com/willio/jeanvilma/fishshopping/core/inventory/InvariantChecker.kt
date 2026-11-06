package com.willio.jeanvilma.fishshopping.core.inventory

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants

/**
 * Blueprint "Required invariants". Run after every tick in tests and periodically
 * in debug builds. Returns human-readable problems; empty means consistent.
 */
object InvariantChecker {
    fun check(content: ContentPack, s: GameState): List<String> {
        val p = mutableListOf<String>()
        val inventories = listOf(s.player.bag) +
            s.machines.flatMap { listOf(it.input, it.output) } +
            s.counters.map { it.stock } +
            s.workers.map { it.bag }
        inventories.forEach { inv ->
            p += inv.invariantProblems()
            inv.contents().keys.forEach { if (!content.isKnownItem(it)) p += "${inv.id}: unknown item $it" }
        }
        if (s.coins < 0) p += "Negative coins ${s.coins}"
        if (s.coins > SimConstants.MAX_SAFE_INTEGER) p += "Coins above safe range"

        // Counter reservations belong to queued customers.
        for (c in s.counters) {
            val claimedByItem = sortedMapOf<String, Int>()
            for (cust in s.customers.filter { it.counterId == c.counterId }) {
                for ((item, qty) in cust.reservedItems) {
                    claimedByItem[item] = (claimedByItem[item] ?: 0) + qty
                }
            }
            for ((item, qty) in c.stock.reservations()) {
                if (claimedByItem[item] != qty) {
                    p += "${c.counterId}: $qty reserved $item but customers claim ${claimedByItem[item] ?: 0}"
                }
            }
            for ((item, qty) in claimedByItem) {
                if (c.stock.reservedQuantity(item) != qty) {
                    p += "${c.counterId}: customers claim $qty $item but stock has ${c.stock.reservedQuantity(item)} reserved"
                }
            }
        }
        // Machine-output reservations belong to porter haul leases (pre-pickup).
        for (m in s.machines) {
            val claimedByItem = sortedMapOf<String, Int>()
            for (w in s.workers) {
                if (w.taskSourceInvId != m.output.id) continue
                val item = w.taskItemId ?: continue
                if (w.phase != com.willio.jeanvilma.fishshopping.core.sim.WorkerTaskPhase.WALK_TO_WORK &&
                    w.phase != com.willio.jeanvilma.fishshopping.core.sim.WorkerTaskPhase.PICKUP
                ) continue
                claimedByItem[item] = (claimedByItem[item] ?: 0) + w.taskQuantity.coerceAtLeast(1)
            }
            for ((item, qty) in m.output.reservations()) {
                if (claimedByItem[item] != qty) {
                    p += "${m.stationId}.output: $qty reserved $item but workers claim ${claimedByItem[item] ?: 0}"
                }
            }
        }
        for (m in s.machines) {
            m.activeBatch?.let { b ->
                if (b.recipeId !in content.recipesById) p += "${m.stationId}: batch with unknown recipe ${b.recipeId}"
                if (b.remainingTicks < 0) p += "${m.stationId}: negative remaining ticks"
            }
        }
        s.ownedUpgrades.forEach { if (it !in content.upgradesById) p += "Unknown owned upgrade $it" }
        return p
    }
}
