package com.willio.jeanvilma.fishshopping.core.inventory

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.CounterKind
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.WarehouseLineView
import com.willio.jeanvilma.fishshopping.core.sim.WarehouseLocationView
import com.willio.jeanvilma.fishshopping.core.sim.WarehouseView
import java.util.TreeMap

/**
 * Phase 7 warehouse panel: available vs reserved quantities across bag, stations,
 * counters, and worker bags. Totals must reconcile to the underlying inventories.
 */
object Warehouse {

    fun build(content: ContentPack, state: GameState, harbor: HarborDef): WarehouseView {
        data class Acc(var quantity: Int = 0, var reserved: Int = 0, val locations: MutableList<WarehouseLocationView> = mutableListOf())
        val byItem = TreeMap<String, Acc>()

        fun add(inv: Inventory, locationId: String, label: String) {
            for ((item, qty) in inv.contents()) {
                val reserved = inv.reservedQuantity(item)
                val acc = byItem.getOrPut(item) { Acc() }
                acc.quantity += qty
                acc.reserved += reserved
                acc.locations += WarehouseLocationView(
                    id = locationId,
                    label = label,
                    quantity = qty,
                    available = qty - reserved,
                    reserved = reserved,
                )
            }
        }

        add(state.player.bag, state.player.bag.id, "Bag")
        for (m in state.machines.sortedBy { it.stationId }) {
            val machineName = content.machinesById[m.machineId]?.name ?: m.machineId
            add(m.input, m.input.id, "$machineName in")
            add(m.output, m.output.id, "$machineName out")
        }
        for (c in state.counters.sortedBy { it.counterId }) {
            val def = harbor.counters.firstOrNull { it.id == c.counterId }
            val label = when (def?.kind) {
                CounterKind.WHOLESALE -> "Wholesale"
                else -> "Retail counter"
            }
            add(c.stock, c.stock.id, label)
        }
        for (w in state.workers.sortedBy { it.id }) {
            val role = content.workersById[w.roleId]?.name ?: w.roleId
            add(w.bag, w.bag.id, "$role bag")
        }

        val lines = byItem.map { (itemId, acc) ->
            val locQty = acc.locations.sumOf { it.quantity }
            val locReserved = acc.locations.sumOf { it.reserved }
            WarehouseLineView(
                itemId = itemId,
                name = content.itemName(itemId),
                quantity = acc.quantity,
                available = acc.quantity - acc.reserved,
                reserved = acc.reserved,
                locations = acc.locations,
                reconcileOk = locQty == acc.quantity && locReserved == acc.reserved,
            )
        }

        val invProblems = buildList {
            addAll(state.player.bag.invariantProblems())
            state.machines.forEach { m ->
                addAll(m.input.invariantProblems())
                addAll(m.output.invariantProblems())
            }
            state.counters.forEach { addAll(it.stock.invariantProblems()) }
            state.workers.forEach { addAll(it.bag.invariantProblems()) }
        }
        val lineErrors = lines.filter { !it.reconcileOk }.map { "${it.itemId}: location totals mismatch" }
        val allErrors = invProblems + lineErrors
        val quantity = lines.sumOf { it.quantity }
        val reserved = lines.sumOf { it.reserved }
        return WarehouseView(
            lines = lines,
            quantity = quantity,
            available = quantity - reserved,
            reserved = reserved,
            empty = lines.isEmpty(),
            reconcileOk = allErrors.isEmpty(),
            reconcileError = allErrors.firstOrNull(),
        )
    }
}
