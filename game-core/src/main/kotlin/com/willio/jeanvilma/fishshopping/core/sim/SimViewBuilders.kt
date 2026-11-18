package com.willio.jeanvilma.fishshopping.core.sim


import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.customers.RivalMarketSystem
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.progression.EndgameSystem
import com.willio.jeanvilma.fishshopping.core.progression.PrestigeSystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.workers.StaffTreesSystem
import com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem
import com.willio.jeanvilma.fishshopping.core.world.HarborTravelSystem

/**
 * Finish 4.0 Phase 5 — SimView builder helpers (customers, automation, anchors, shares).
 */

internal fun Simulation.customerViews(): List<CustomerView> {
    return harbor.counters.flatMap { def ->
        state.customers.filter { it.counterId == def.id }.mapIndexed { index, c ->
            val slot = def.queueSlot(index)
            val path = CustomerSystem.approachPath(harbor, slot)
            val elapsed = (c.walkTicksTotal - c.walkTicksLeft).coerceAtLeast(0)
            val (x, z) = CustomerSystem.pointAlongPath(path, elapsed, c.walkTicksTotal)
            val type = content.customersById[c.typeId]
            val prefName = c.preferredProductId?.let { content.itemName(it) }
            CustomerView(
                c.id, def.id, index,
                x, z,
                c.arrived, c.wants, c.reserved,
                typeId = c.typeId,
                typeName = type?.name ?: c.typeId,
                kind = type?.kind?.wire ?: "standard",
                preferredProductId = c.preferredProductId,
                preferredProductName = prefName,
                preferenceMet = c.preferenceMet(),
            )
        }
    }
}

internal fun Simulation.topSpeciesCatchShareViews(limit: Int = 3): List<SpeciesCatchShareView> {
    val shares = Telemetry.speciesCatchSharePermille(state)
    return shares.entries
        .sortedWith(compareByDescending<Map.Entry<String, Long>> { it.value }.thenBy { it.key })
        .take(limit)
        .map { (id, share) ->
            SpeciesCatchShareView(
                speciesId = id,
                name = content.itemName(id),
                sharePermille = share,
                catches = state.speciesCatches[id] ?: 0L,
            )
        }
}

internal fun Simulation.automationIssueViews(stationViews: List<StationView>): List<AutomationIssueView> {
    val c = content
    val s = state
    val out = ArrayList<AutomationIssueView>()
    for (st in stationViews) {
        val reason = when {
            st.needsRepair && st.status == MachineStatus.NEEDS_REPAIR -> "Needs repair"
            st.needsRepair && st.slowed -> "Running slow"
            st.status == MachineStatus.OUTPUT_FULL -> "Output full"
            st.status == MachineStatus.WAITING_FOR_INPUT -> "No input"
            else -> null
        } ?: continue
        val name = harbor.stations.firstOrNull { it.id == st.stationId }?.let { pad ->
            c.machinesById[pad.machine]?.name ?: st.stationId
        } ?: st.stationId
        out += AutomationIssueView(st.stationId, "machine", name, reason)
    }
    for (w in s.workers) {
        val reason = WorkerSystem.blockedReason(c, s, harbor, w) ?: continue
        if (reason == "Off shift") continue
        val def = c.workersById[w.roleId]
        out += AutomationIssueView(w.id, "worker", def?.let { c.displayName(it.id, it.name) } ?: w.roleId, reason)
    }
    return out
}

internal fun Simulation.buildTransferAnchors(): List<TransferAnchorView> {
    val s = state
    val h = harbor
    val out = ArrayList<TransferAnchorView>(4 + h.stations.size * 2 + h.counters.size + s.workers.size)
    out += TransferAnchorView("inv.player_bag", s.player.x, s.player.z)
    for (st in h.stations) {
        val input = h.zonesById.getValue(st.inputZone).rect
        val output = h.zonesById.getValue(st.outputZone).rect
        out += TransferAnchorView("inv.${st.id}.input", input.centerX, input.centerZ)
        out += TransferAnchorView("inv.${st.id}.output", output.centerX, output.centerZ)
    }
    for (c in h.counters) {
        val z = h.zonesById.getValue(c.zone).rect
        out += TransferAnchorView("inv.${c.id}", z.centerX, z.centerZ)
    }
    for (w in s.workers) {
        out += TransferAnchorView("inv.${w.id}.bag", w.x, w.z)
    }
    return out
}
