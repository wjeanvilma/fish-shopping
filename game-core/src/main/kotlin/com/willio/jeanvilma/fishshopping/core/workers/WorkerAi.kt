package com.willio.jeanvilma.fishshopping.core.workers

import com.willio.jeanvilma.fishshopping.core.content.CounterDef
import com.willio.jeanvilma.fishshopping.core.content.PointMm
import com.willio.jeanvilma.fishshopping.core.content.WorkerDef
import com.willio.jeanvilma.fishshopping.core.content.WorkerRoleKind
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.inventory.Transfers
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.sim.CounterState
import com.willio.jeanvilma.fishshopping.core.sim.FishingSpotState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MachineState
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.WorkerState
import com.willio.jeanvilma.fishshopping.core.sim.WorkerTaskPhase
import kotlin.math.max
import kotlin.math.min

/**
 * Finish 4.0 Phase 5 — worker role stepping, haul scoring, and motion extracted from Workers.kt.
 * Decision traces land in [WorkerDecisionHooks] for later staff-AI depth.
 */
internal object WorkerAi {
// ---------------------------------------------------------------- fisher

fun stepFisher(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignFisher(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> {
            // Arrived at spot; begin casting.
            w.phase = WorkerTaskPhase.WORK
            clearCast(w)
        }
        WorkerTaskPhase.WORK -> fish(ctx, w, def)
        WorkerTaskPhase.WALK_TO_DROP -> {
            w.phase = WorkerTaskPhase.DROP
        }
        WorkerTaskPhase.DROP -> dropToMachine(ctx, w, def)
        else -> clearTask(w)
    }
}

fun assignFisher(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (!w.bag.isEmpty()) {
        val dest = findMachineInputForBag(ctx, w) ?: return
        startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_DROP
        w.taskDestInvId = dest.first.input.id
        w.taskZoneId = dest.third
        w.taskId = ctx.state.newId("task")
        return
    }
    val spot = findFishableSpot(ctx, w) ?: return
    val zone = ctx.harbor.zonesById.getValue(spot.zoneId)
    startWalk(w, zone.rect.centerX, zone.rect.centerZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskZoneId = spot.zoneId
    w.taskId = ctx.state.newId("task")
}

/** Finish 4.0 Phase 19 — trophy_cast treats rarityWeight ≤ this as rare. */
const val TROPHY_CAST_RARE_WEIGHT_MAX = 20

fun fish(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    val zoneId = w.taskZoneId ?: run { clearTask(w); return }
    val spotDef = ctx.harbor.fishingSpots.firstOrNull { it.zone == zoneId } ?: run { clearTask(w); return }
    val spot = ctx.state.fishingSpots.first { it.zoneId == zoneId }
    if (!FishingSystem.isUnlocked(spotDef, ctx.state) || spot.stock <= 0 || w.bag.freeUnits() == 0) {
        // Deliver whatever we have, or idle.
        clearCast(w)
        if (!w.bag.isEmpty()) {
            val dest = findMachineInputForBag(ctx, w)
            if (dest != null) {
                startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
                w.phase = WorkerTaskPhase.WALK_TO_DROP
                w.taskDestInvId = dest.first.input.id
                w.taskZoneId = dest.third
                return
            }
        }
        clearTask(w)
        return
    }

    if (w.fishingSpecies == null) {
        val candidates = spotDef.species.map { ctx.content.speciesById.getValue(it) }
            .filter { w.bag.roomFor(it.id) >= 1 }
        if (candidates.isEmpty()) {
            clearTask(w)
            return
        }
        // Finish 4.0 Phase 19 — trophy_cast biases weighted pick toward rare species.
        val trophyCast = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.fisher.trophy_cast"
        val pick = candidates[ctx.state.rng.pickWeighted(
            candidates.map {
                val base = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.scaledWeight(
                    it.rarityWeight,
                    ctx.content,
                    ctx.state.tick,
                    it.id,
                    ctx.state.harborId,
                )
                if (trophyCast) max(1, 120 - base.coerceAtMost(119)) else base
            },
        )]
        w.fishingSpecies = pick.id
        w.fishingProgress = 0
        w.fishingCatchTicks = FishingSystem.catchTicksFor(WorkerSystem.catchSpeed(ctx.content, ctx.state, def, w), pick.catchTicks)
    }

    val species = ctx.content.speciesById.getValue(w.fishingSpecies!!)
    val duration = w.fishingCatchTicks.coerceAtLeast(1)
    w.fishingProgress++
    if (w.fishingProgress < duration) return

    if (w.bag.roomFor(species.id) >= 1 && spot.stock > 0) {
        w.bag.add(species.id, 1)
        spot.stock--
        ctx.state.bumpStat(Stats.FISH_CAUGHT)
        ctx.state.bumpStat(Stats.WORKER_FISH_CAUGHT)
        ctx.state.recordSpeciesCatch(species.id)
        WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpFishCaught)
        // Finish 4.0 Phase 19 — trophy_cast rare landings.
        if (
            StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.fisher.trophy_cast" &&
            species.rarityWeight <= TROPHY_CAST_RARE_WEIGHT_MAX
        ) {
            ctx.state.bumpStat(Stats.FISHER_TROPHY_CASTS)
        }
        val (size, value, personalBest) = com.willio.jeanvilma.fishshopping.core.fishing.TrophySystem.record(ctx, species.id)
        ctx.emit(
            GameEvent.FishCaught(
                ctx.state.tick, species.id, zoneId,
                timingBonus = false, rareUpgrade = false,
                sizePermille = size, valueCoins = value, personalBest = personalBest,
            ),
        )
        if (spot.stock == 0) ctx.emit(GameEvent.FishingSpotDepleted(ctx.state.tick, zoneId))
    }
    clearCast(w)
    if (w.bag.freeUnits() == 0 || spot.stock <= 0) {
        val dest = findMachineInputForBag(ctx, w)
        if (dest != null) {
            startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
            w.phase = WorkerTaskPhase.WALK_TO_DROP
            w.taskDestInvId = dest.first.input.id
            w.taskZoneId = dest.third
        } else {
            clearTask(w)
        }
    }
}

fun dropToMachine(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (w.transferCooldown > 0) return
    val destId = w.taskDestInvId ?: run { clearTask(w); return }
    val machine = ctx.state.machines.firstOrNull { it.input.id == destId } ?: run { clearTask(w); return }
    val accepted = ctx.content.machinesById.getValue(machine.machineId).recipes
        .flatMap { ctx.content.recipesById.getValue(it).inputs.map { iq -> iq.item } }.toSet()
    val moved = Transfers.moveFirstAccepted(w.bag, machine.input) { it in accepted }
    if (moved != null) {
        ctx.state.bumpStat(Stats.MACHINE_INPUTS)
        ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
        WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved)
        ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, w.bag.id, machine.input.id, moved, 1))
        w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1
    }
    if (w.bag.isEmpty() || moved == null) clearTask(w)
}

// ---------------------------------------------------------------- porter

fun stepPorter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignPorter(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> {
            w.phase = WorkerTaskPhase.PICKUP
        }
        WorkerTaskPhase.PICKUP -> pickupHaul(ctx, w, def)
        WorkerTaskPhase.WALK_TO_DROP -> {
            w.phase = WorkerTaskPhase.DROP
        }
        WorkerTaskPhase.DROP -> dropHaul(ctx, w, def)
        else -> clearTask(w)
    }
}

fun assignPorter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    // Finish delivering anything already in the bag.
    if (!w.bag.isEmpty()) {
        val dest = findCounterDrop(ctx, w) ?: return
        startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_DROP
        w.taskDestInvId = dest.first.stock.id
        w.taskZoneId = dest.third
        w.taskId = ctx.state.newId("task")
        return
    }
    val haul = findHaul(ctx, w) ?: return
    if (!haul.source.reserve(haul.itemId, 1)) return
    w.taskId = ctx.state.newId("task")
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskSourceInvId = haul.source.id
    w.taskDestInvId = haul.dest.id
    w.taskItemId = haul.itemId
    w.taskQuantity = 1
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
    w.taskZoneId = haul.sourceZoneId
    startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
}

fun pickupHaul(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (w.transferCooldown > 0) return
    val sourceId = w.taskSourceInvId ?: run { abortHaul(ctx, w); return }
    val itemId = w.taskItemId ?: run { abortHaul(ctx, w); return }
    val source = findInventory(ctx, sourceId) ?: run { abortHaul(ctx, w); return }
    if (source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
        abortHaul(ctx, w)
        return
    }
    source.takeReserved(itemId, 1)
    w.bag.add(itemId, 1)
    w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1
    ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED)
    ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
    ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, source.id, w.bag.id, itemId, 1))

    // Finish 4.0 Phase 19 — dock_relay chains another haul before dropping.
    val dockRelay = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.porter.dock_relay"
    if (dockRelay) {
        val next = findHaul(ctx, w)
        if (next != null && w.bag.roomFor(next.itemId) >= 1 && next.source.reserve(next.itemId, 1)) {
            w.phase = WorkerTaskPhase.WALK_TO_WORK
            w.taskSourceInvId = next.source.id
            w.taskDestInvId = next.dest.id
            w.taskItemId = next.itemId
            w.taskQuantity = 1
            w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
            w.taskZoneId = next.sourceZoneId
            startWalk(w, next.sourceX, next.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
            ctx.state.bumpStat(Stats.PORTER_RELAY_PICKUPS)
            return
        }
    }

    val dest = findCounterDrop(ctx, w)
    if (dest == null) {
        // Keep item; clear lease fields for destination retry next tick.
        w.phase = WorkerTaskPhase.NONE
        w.taskSourceInvId = null
        w.taskItemId = null
        w.leaseExpiresAt = 0
        return
    }
    startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_DROP
    w.taskDestInvId = dest.first.stock.id
    w.taskZoneId = dest.third
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
}

fun dropHaul(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (w.transferCooldown > 0) return
    val destId = w.taskDestInvId ?: run { clearTask(w); return }
    val counter = ctx.state.counters.firstOrNull { it.stock.id == destId } ?: run { clearTask(w); return }
    val cdef = ctx.harbor.counters.first { it.id == counter.counterId }
    val moved = Transfers.moveFirstAccepted(w.bag, counter.stock) { cdef.accepts(it) }
    if (moved != null) {
        ctx.state.bumpStat(Stats.COUNTER_STOCKED)
        ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
        WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved)
        ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, w.bag.id, counter.stock.id, moved, 1))
        w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1
    }
    if (w.bag.isEmpty() || moved == null) clearTask(w)
}

// ---------------------------------------------------------------- operator (machine → machine)

fun stepOperator(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignOperator(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> {
            w.phase = WorkerTaskPhase.PICKUP
        }
        WorkerTaskPhase.PICKUP -> pickupMachineHaul(ctx, w, def)
        WorkerTaskPhase.WALK_TO_DROP -> {
            w.phase = WorkerTaskPhase.DROP
        }
        WorkerTaskPhase.DROP -> dropToMachine(ctx, w, def)
        else -> clearTask(w)
    }
}

fun assignOperator(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (!w.bag.isEmpty()) {
        val dest = findMachineInputForBag(ctx, w) ?: return
        startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_DROP
        w.taskDestInvId = dest.first.input.id
        w.taskZoneId = dest.third
        w.taskId = ctx.state.newId("task")
        return
    }
    val haul = findMachineHaul(ctx, w) ?: return
    if (!haul.source.reserve(haul.itemId, 1)) return
    w.taskId = ctx.state.newId("task")
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskSourceInvId = haul.source.id
    w.taskDestInvId = haul.dest.id
    w.taskItemId = haul.itemId
    w.taskQuantity = 1
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
    w.taskZoneId = haul.sourceZoneId
    startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
}

fun pickupMachineHaul(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (w.transferCooldown > 0) return
    val sourceId = w.taskSourceInvId ?: run { abortHaul(ctx, w); return }
    val itemId = w.taskItemId ?: run { abortHaul(ctx, w); return }
    val source = findInventory(ctx, sourceId) ?: run { abortHaul(ctx, w); return }
    if (source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
        abortHaul(ctx, w)
        return
    }
    source.takeReserved(itemId, 1)
    w.bag.add(itemId, 1)
    w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1
    ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED)
    ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
    ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, source.id, w.bag.id, itemId, 1))
    val dest = findMachineInputForBag(ctx, w)
    if (dest == null) {
        w.phase = WorkerTaskPhase.NONE
        w.taskSourceInvId = null
        w.taskItemId = null
        w.leaseExpiresAt = 0
        return
    }
    startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_DROP
    w.taskDestInvId = dest.first.input.id
    w.taskZoneId = dest.third
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
}

// ---------------------------------------------------------------- cashier

fun stepCashier(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignCashier(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> {
            w.phase = WorkerTaskPhase.WORK
        }
        WorkerTaskPhase.WORK -> {
            // Re-route when another unlocked pad scores meaningfully higher (Phase 15).
            val best = bestCashierPost(ctx, w) ?: return
            if (best.zone != w.taskZoneId) {
                val zone = ctx.harbor.zonesById.getValue(best.zone)
                startWalk(w, zone.rect.centerX, zone.rect.centerZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
                w.phase = WorkerTaskPhase.WALK_TO_WORK
                w.taskZoneId = best.zone
                w.taskId = ctx.state.newId("task")
            }
        }
        else -> clearTask(w)
    }
}

fun assignCashier(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    val cdef = bestCashierPost(ctx, w) ?: return
    val zone = ctx.harbor.zonesById.getValue(cdef.zone)
    startWalk(w, zone.rect.centerX, zone.rect.centerZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskZoneId = cdef.zone
    w.taskId = ctx.state.newId("task")
    // Finish 4.0 Phase 19 — quick_till posts to the longest/impatient queue.
    if (StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.cashier.quick_till") {
        ctx.state.bumpStat(Stats.CASHIER_QUICK_TILLS)
    }
}

/**
 * Score unlocked counters with content [RoutingDef] weights and pick the best
 * uncovered post (Phase 15 multi-pad cashiers).
 */
fun bestCashierPost(ctx: StepContext, w: WorkerState): CounterDef? {
    val covered = ctx.state.workers
        .filter { other ->
            other.id != w.id &&
                ctx.content.workersById[other.roleId]?.role == WorkerRoleKind.CASHIER &&
                (other.phase == WorkerTaskPhase.WORK || other.phase == WorkerTaskPhase.WALK_TO_WORK)
        }
        .mapNotNull { it.taskZoneId }
        .toSet()
    val quickTill = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.cashier.quick_till"
    var best: CounterDef? = null
    var bestScore = Long.MIN_VALUE
    var considered = 0
    for (cdef in ctx.harbor.counters.sortedBy { it.id }) {
        if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue
        val counter = ctx.state.counters.first { it.counterId == cdef.id }
        val zone = ctx.harbor.zonesById.getValue(cdef.zone)
        val queued = ctx.state.customers.filter { it.counterId == cdef.id && it.arrived }
        val waiting = queued.size
        val impatient = queued.count { it.patienceLeft > 0 && it.patienceLeft <= 40 }
        val urgency = waiting * 25 + if (counter.stock.usedUnits() == 0) 0 else 10
        val distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.rect.centerX, zone.rect.centerZ, 160)
        val distance = (200 - distTicks).coerceAtLeast(0)
        val demand = waiting * 20 + if (counter.stock.usedUnits() == 0) 40 else 0
        var score = scorePost(ctx, urgency, distance, demand)
        // Finish 4.0 Phase 19 — quick_till_queue prefers longest / impatient lines.
        if (quickTill) score += waiting * 40L + impatient * 25L
        if (cdef.zone in covered) score -= 10_000L
        considered++
        if (best == null || score > bestScore || (score == bestScore && cdef.id < best.id)) {
            best = cdef
            bestScore = score
        }
    }
    WorkerDecisionHooks.record(
        WorkerDecisionTrace(
            workerId = w.id,
            role = "cashier",
            kind = "post",
            reason = when {
                best == null -> "none_available"
                quickTill -> "quick_till_queue"
                else -> "best_score"
            },
            score = if (best != null) bestScore else null,
            candidatesConsidered = considered,
            tick = ctx.state.tick,
        ),
    )
    return best
}

fun scorePost(ctx: StepContext, urgency: Int, distance: Int, demand: Int): Long {
    val routing = ctx.content.routing
    var demW = routing.demandWeight.toLong()
    if (WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)) {
        demW = demW * routing.supervisorDemandBoostPermille / 1000L
    }
    return routing.urgencyWeight.toLong() * urgency +
        routing.distanceWeight.toLong() * distance +
        demW * demand
}

// ---------------------------------------------------------------- supervisor

fun stepSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignSupervisor(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> {
            w.phase = WorkerTaskPhase.WORK
        }
        WorkerTaskPhase.WORK -> supervisorPatrol(ctx, w, def)
        else -> clearTask(w)
    }
}

fun assignSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    val post = bestSupervisorPost(ctx, w) ?: return
    startWalk(w, post.first.x, post.first.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskZoneId = post.second
    w.taskId = ctx.state.newId("task")
}

/** Finish 3.0 Phase 11 — re-post toward busiest counter / distressed station. */
fun supervisorPatrol(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    val floorLead = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.supervisor.floor_lead"
    val interval = if (floorLead) 60L else 90L
    if (ctx.state.tick % interval != 0L) return
    val post = bestSupervisorPost(ctx, w) ?: return
    if (post.second == w.taskZoneId) return
    startWalk(w, post.first.x, post.first.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskZoneId = post.second
    w.taskId = ctx.state.newId("task")
    ctx.state.bumpStat(Stats.SUPERVISOR_PATROLS)
}

fun bestSupervisorPost(ctx: StepContext, w: WorkerState): Pair<PointMm, String>? {
    val floorLead = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.supervisor.floor_lead"
    if (floorLead) {
        var best: Triple<PointMm, String, Int>? = null
        for (m in ctx.state.machines) {
            val station = ctx.harbor.stations.firstOrNull { it.id == m.stationId } ?: continue
            if (!ProductionSystem.isUnlocked(station, ctx.state) || m.paused) continue
            var score = 0
            if (m.status == MachineStatus.OUTPUT_FULL) score += 80
            if (m.status == MachineStatus.WAITING_FOR_INPUT) score += 60
            if (m.broken) score += 40
            if (score <= 0) continue
            val zone = ctx.harbor.zonesById.getValue(station.outputZone)
            val point = PointMm(zone.rect.centerX, zone.rect.centerZ)
            val dist = WorkerSystem.walkTicks(w.x, w.z, point.x, point.z, 160)
            score += max(0, 40 - dist / 5)
            val cur = best
            if (
                cur == null ||
                score > cur.third ||
                (score == cur.third && station.outputZone < cur.second)
            ) {
                best = Triple(point, station.outputZone, score)
            }
        }
        best?.let { return it.first to it.second }
    }
    val cdef = bestCashierPost(ctx, w) ?: return null
    val zone = ctx.harbor.zonesById.getValue(cdef.zone)
    return PointMm(zone.rect.centerX, zone.rect.centerZ) to cdef.zone
}

// ---------------------------------------------------------------- ice runner (fragile / ice stock → counter)

fun stepIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignIceRunner(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> w.phase = WorkerTaskPhase.PICKUP
        WorkerTaskPhase.PICKUP -> pickupIceRunner(ctx, w, def)
        WorkerTaskPhase.WALK_TO_DROP -> w.phase = WorkerTaskPhase.DROP
        WorkerTaskPhase.DROP -> dropHaul(ctx, w, def)
        else -> clearTask(w)
    }
}

/** Finish 3.0 Phase 11 — chill_haul chains fragile pickups before dropping. */
fun pickupIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (w.transferCooldown > 0) return
    val sourceId = w.taskSourceInvId
    val itemId = w.taskItemId
    if (sourceId == null || itemId == null) {
        abortHaul(ctx, w)
        return
    }
    val source = findInventory(ctx, sourceId)
    if (source == null || source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
        abortHaul(ctx, w)
        return
    }
    source.takeReserved(itemId, 1)
    w.bag.add(itemId, 1)
    w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1
    ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED)
    ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
    ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, source.id, w.bag.id, itemId, 1))

    val chill = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.ice_runner.chill_haul"
    if (chill) {
        val next = findIceHaul(ctx, w)
        if (next != null && w.bag.roomFor(next.itemId) >= 1 && next.source.reserve(next.itemId, 1)) {
            w.phase = WorkerTaskPhase.WALK_TO_WORK
            w.taskSourceInvId = next.source.id
            w.taskDestInvId = next.dest.id
            w.taskItemId = next.itemId
            w.taskQuantity = 1
            w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
            w.taskZoneId = next.sourceZoneId
            startWalk(w, next.sourceX, next.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
            ctx.state.bumpStat(Stats.ICE_RUNNER_MULTI_PICKUPS)
            return
        }
    }

    val dest = findCounterDrop(ctx, w)
    if (dest == null) {
        w.phase = WorkerTaskPhase.NONE
        w.taskSourceInvId = null
        w.taskItemId = null
        w.leaseExpiresAt = 0
        return
    }
    startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_DROP
    w.taskDestInvId = dest.first.stock.id
    w.taskZoneId = dest.third
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
}

fun assignIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    if (!w.bag.isEmpty()) {
        val dest = findCounterDrop(ctx, w) ?: return
        startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_DROP
        w.taskDestInvId = dest.first.stock.id
        w.taskZoneId = dest.third
        w.taskId = ctx.state.newId("task")
        return
    }
    val haul = findIceHaul(ctx, w) ?: return
    if (!haul.source.reserve(haul.itemId, 1)) return
    w.taskId = ctx.state.newId("task")
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskSourceInvId = haul.source.id
    w.taskDestInvId = haul.dest.id
    w.taskItemId = haul.itemId
    w.taskQuantity = 1
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
    w.taskZoneId = haul.sourceZoneId
    startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
}

// ---------------------------------------------------------------- smoker specialist (smoker I/O + process buff)

fun stepSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignSmokerSpecialist(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> {
            // Arrived at smoker post or haul source.
            if (w.taskSourceInvId != null) w.phase = WorkerTaskPhase.PICKUP
            else w.phase = WorkerTaskPhase.WORK
        }
        WorkerTaskPhase.PICKUP -> pickupMachineHaul(ctx, w, def)
        WorkerTaskPhase.WALK_TO_DROP -> w.phase = WorkerTaskPhase.DROP
        WorkerTaskPhase.DROP -> dropToMachine(ctx, w, def)
        WorkerTaskPhase.WORK -> Unit // posted at smoker: speeds batches via smokerSpecialistOnDuty
        else -> clearTask(w)
    }
}

fun assignSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    val kilnFocus = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.smoker_specialist.kiln_focus"
    if (!w.bag.isEmpty()) {
        val dest = findSmokerInputDrop(ctx, w)
            ?: if (kilnFocus) null else findMachineInputForBag(ctx, w)
        if (dest == null) return
        startWalk(w, dest.second.x, dest.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_DROP
        w.taskDestInvId = dest.first.input.id
        w.taskZoneId = dest.third
        w.taskId = ctx.state.newId("task")
        return
    }
    val haul = findSmokerHaul(ctx, w)
    if (haul != null) {
        if (!haul.source.reserve(haul.itemId, 1)) return
        w.taskId = ctx.state.newId("task")
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskSourceInvId = haul.source.id
        w.taskDestInvId = haul.dest.id
        w.taskItemId = haul.itemId
        w.taskQuantity = 1
        w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
        w.taskZoneId = haul.sourceZoneId
        startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
        return
    }
    // Idle: post at smoker input to grant process-speed buff.
    val post = smokerPost(ctx) ?: return
    startWalk(w, post.second.x, post.second.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskZoneId = post.third
    w.taskId = ctx.state.newId("task")
    w.taskSourceInvId = null
    w.taskDestInvId = null
    w.taskItemId = null
}

// ---------------------------------------------------------------- greeter (entry post → patience buff)

fun stepGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    when (w.phase) {
        WorkerTaskPhase.NONE -> assignGreeter(ctx, w, def)
        WorkerTaskPhase.WALK_TO_WORK -> w.phase = WorkerTaskPhase.WORK
        WorkerTaskPhase.WORK -> greeterWelcomePulse(ctx, w)
        else -> clearTask(w)
    }
}

fun assignGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
    val entry = ctx.harbor.customerEntry
    startWalk(w, entry.x, entry.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w))
    w.phase = WorkerTaskPhase.WALK_TO_WORK
    w.taskZoneId = "greeter.entry"
    w.taskId = ctx.state.newId("task")
}

/** Finish 3.0 Phase 11 — top up low-patience queued customers while posted. */
fun greeterWelcomePulse(ctx: StepContext, w: WorkerState) {
    val desk = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.greeter.welcome_desk"
    val interval = if (desk) 75L else 120L
    if (ctx.state.tick % interval != 0L) return
    val boost = if (desk) 55 else 35
    val threshold = if (desk) 110 else 90
    var welcomed = 0L
    for (c in ctx.state.customers) {
        if (!c.arrived || c.patienceLeft <= 0 || c.patienceLeft >= threshold) continue
        c.patienceLeft += boost
        welcomed++
    }
    if (welcomed > 0) ctx.state.bumpStat(Stats.GREETER_WELCOMES, welcomed)
}

// ---------------------------------------------------------------- wages

fun accrueWages(ctx: StepContext) {
    val s = ctx.state
    val rate = s.workerWagePerWorkerPerHour
    val onShift = s.workers.filter { it.onShift }
    if (rate <= 0 || onShift.isEmpty()) return
    s.workerWageAccrualTicks++
    val hourTicks = 3600 * SimConstants.TICKS_PER_SECOND
    if (s.workerWageAccrualTicks < hourTicks) return
    s.workerWageAccrualTicks = 0
    val n = onShift.size
    val free = WorkerSystem.freeOnShiftSlots(ctx.content, s)
    val otMult = ctx.content.staffProgression.shifts.overtimeWagePermille
    var standard = 0L
    var overtime = 0L
    onShift.forEachIndexed { index, w ->
        val base = (rate.toLong() * StaffTreesSystem.wageMultPermille(ctx.content, w)) / 1000L
        if (index < free) standard += base
        else overtime += (base * otMult) / 1000L
    }
    val cost = standard + overtime
    val paid = min(cost, s.coins)
    if (paid <= 0L) return
    s.coins -= paid
    s.bumpStat(Stats.WAGES_PAID, paid)
    val overtimePaid = min(overtime, paid)
    if (overtimePaid > 0L) s.bumpStat(Stats.OVERTIME_WAGES, overtimePaid)
    val receipt = Receipt(s.newId("wage"), "wage", -paid, s.tick, "workers:$n")
    s.record(receipt)
    ctx.emit(GameEvent.WagesPaid(s.tick, n, paid))
}

// ---------------------------------------------------------------- shared helpers

fun expireLeases(ctx: StepContext) {
    for (w in ctx.state.workers) {
        if (w.leaseExpiresAt <= 0L || ctx.state.tick < w.leaseExpiresAt) continue
        // Only release a source reservation still held for an unfinished pickup.
        if (w.phase == WorkerTaskPhase.WALK_TO_WORK || w.phase == WorkerTaskPhase.PICKUP) {
            val sourceId = w.taskSourceInvId
            val itemId = w.taskItemId
            if (sourceId != null && itemId != null) {
                findInventory(ctx, sourceId)?.let { inv ->
                    if (inv.reservedQuantity(itemId) > 0) inv.releaseReservation(itemId, 1)
                }
            }
            ctx.state.bumpStat(Stats.LEASES_EXPIRED)
            ctx.emit(GameEvent.LeaseExpired(ctx.state.tick, w.id, itemId, sourceId))
            clearTask(w)
        } else {
            w.leaseExpiresAt = 0
        }
    }
}

data class HaulOffer(
    val source: Inventory,
    val dest: Inventory,
    val itemId: String,
    val sourceX: Int,
    val sourceZ: Int,
    val sourceZoneId: String,
    val score: Long,
)

fun findHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
    val supervisor = WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)
    val cargoSprint = StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.porter.cargo_sprint"
    var considered = 0
    var best: HaulOffer? = null
    var bestFull = false
    for (counter in ctx.state.counters.sortedBy { it.counterId }) {
        val cdef = ctx.harbor.counters.first { it.id == counter.counterId }
        if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue
        for (m in ctx.state.machines.sortedBy { it.stationId }) {
            val station = ctx.harbor.stations.first { it.id == m.stationId }
            if (!ProductionSystem.isUnlocked(station, ctx.state)) continue
            val zone = ctx.harbor.zonesById.getValue(station.outputZone)
            for ((itemId, _) in m.output.contents()) {
                if (!cdef.accepts(itemId)) continue
                if (m.output.available(itemId) < 1) continue
                if (w.bag.roomFor(itemId) < 1) continue
                if (!destHasRoom(ctx, counter.stock, itemId, w.id)) continue
                if (!porterMayHaul(ctx, itemId, supervisor)) continue
                val demand = counterDemand(ctx, counter, itemId)
                val outputFull = m.status == MachineStatus.OUTPUT_FULL
                var urgency = if (outputFull) 50 else 0
                // Finish 4.0 Phase 19 — cargo_sprint_urgency clears jammed outputs first.
                if (cargoSprint && outputFull) urgency += 45
                val score = scoreHaul(
                    ctx, w, m.output, zone.rect.centerX, zone.rect.centerZ,
                    urgencyBonus = urgency,
                    demand = demand,
                )
                considered++
                val offer = HaulOffer(
                    m.output, counter.stock, itemId,
                    zone.rect.centerX, zone.rect.centerZ, station.outputZone, score,
                )
                if (best == null || betterHaul(offer, best)) {
                    best = offer
                    bestFull = outputFull
                }
            }
        }
    }
    WorkerDecisionHooks.record(
        WorkerDecisionTrace(
            workerId = w.id,
            role = "porter",
            kind = "haul",
            reason = when {
                best == null -> "none_available"
                cargoSprint && bestFull -> "cargo_sprint_urgency"
                StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.porter.dock_relay" -> "dock_relay"
                else -> "best_score"
            },
            score = best?.score,
            candidatesConsidered = considered,
            tick = ctx.state.tick,
        ),
    )
    return best
}

/** Porter-like haul with score bonus for ice crates / fragile spoil tiers. */
fun findIceHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
    val supervisor = WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)
    val buffs = ctx.content.staffProgression.roleBuffs
    var best: HaulOffer? = null
    for (counter in ctx.state.counters.sortedBy { it.counterId }) {
        val cdef = ctx.harbor.counters.first { it.id == counter.counterId }
        if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue
        for (m in ctx.state.machines.sortedBy { it.stationId }) {
            val station = ctx.harbor.stations.first { it.id == m.stationId }
            if (!ProductionSystem.isUnlocked(station, ctx.state)) continue
            val zone = ctx.harbor.zonesById.getValue(station.outputZone)
            for ((itemId, _) in m.output.contents()) {
                if (!cdef.accepts(itemId)) continue
                if (m.output.available(itemId) < 1) continue
                if (w.bag.roomFor(itemId) < 1) continue
                if (!destHasRoom(ctx, counter.stock, itemId, w.id)) continue
                if (!porterMayHaul(ctx, itemId, supervisor)) continue
                val demand = counterDemand(ctx, counter, itemId)
                var score = scoreHaul(
                    ctx, w, m.output, zone.rect.centerX, zone.rect.centerZ,
                    urgencyBonus = if (m.status == MachineStatus.OUTPUT_FULL) 50 else 0,
                    demand = demand,
                )
                score += icePreferBonus(ctx, itemId, buffs).toLong()
                val offer = HaulOffer(
                    m.output, counter.stock, itemId,
                    zone.rect.centerX, zone.rect.centerZ, station.outputZone, score,
                )
                if (best == null || betterHaul(offer, best)) best = offer
            }
        }
    }
    return best
}

fun icePreferBonus(
    ctx: StepContext,
    itemId: String,
    buffs: com.willio.jeanvilma.fishshopping.core.content.StaffRoleBuffsDef,
): Int {
    if (itemId == "product.ice_packed_crate") return buffs.iceRunnerSpoilScoreBonus
    val tier = ctx.content.productsById[itemId]?.spoilTier
        ?: ctx.content.speciesById[itemId]?.spoilTier
        ?: return 0
    return if (tier >= buffs.iceRunnerFragileSpoilTierMin) buffs.iceRunnerSpoilScoreBonus else 0
}

/** Intermediate haul: machine output → another machine's input (e.g. fillet → smoker). */
fun findMachineHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
    var best: HaulOffer? = null
    for (src in ctx.state.machines.sortedBy { it.stationId }) {
        val srcStation = ctx.harbor.stations.first { it.id == src.stationId }
        if (!ProductionSystem.isUnlocked(srcStation, ctx.state)) continue
        val zone = ctx.harbor.zonesById.getValue(srcStation.outputZone)
        for ((itemId, _) in src.output.contents()) {
            if (src.output.available(itemId) < 1) continue
            if (w.bag.roomFor(itemId) < 1) continue
            for (dst in ctx.state.machines.sortedBy { it.stationId }) {
                if (dst.stationId == src.stationId) continue
                val dstStation = ctx.harbor.stations.first { it.id == dst.stationId }
                if (!ProductionSystem.isUnlocked(dstStation, ctx.state)) continue
                val accepted = acceptedInputs(ctx, dst.machineId)
                if (itemId !in accepted) continue
                if (!destHasRoom(ctx, dst.input, itemId, w.id)) continue
                val demand = machineDemand(dst)
                var score = scoreHaul(
                    ctx, w, src.output, zone.rect.centerX, zone.rect.centerZ,
                    urgencyBonus = if (src.status == MachineStatus.OUTPUT_FULL) 50 else 0,
                    demand = demand,
                )
                // Finish 3.0 Phase 11 — pad_link prioritizes starving machine inputs.
                if (
                    StaffTreesSystem.branchOf(ctx.content, w)?.id == "branch.operator.pad_link" &&
                    dst.status == MachineStatus.WAITING_FOR_INPUT
                ) {
                    score += 35
                }
                val offer = HaulOffer(
                    src.output, dst.input, itemId,
                    zone.rect.centerX, zone.rect.centerZ, srcStation.outputZone, score,
                )
                if (best == null || betterHaul(offer, best)) best = offer
            }
        }
    }
    return best
}

fun findFishableSpot(ctx: StepContext, w: WorkerState): FishingSpotState? {
    val branchId = StaffTreesSystem.branchOf(ctx.content, w)?.id
    val trophyCast = branchId == "branch.fisher.trophy_cast"
    val linePro = branchId == "branch.fisher.line_pro"
    var considered = 0
    var best: FishingSpotState? = null
    var bestScore = -1L
    var bestZone = ""
    for (spot in ctx.state.fishingSpots) {
        val def = ctx.harbor.fishingSpots.first { it.zone == spot.zoneId }
        if (!FishingSystem.isUnlocked(def, ctx.state) || spot.stock <= 0) continue
        if (def.species.none { w.bag.roomFor(it) >= 1 }) continue
        val zone = ctx.harbor.zonesById.getValue(spot.zoneId)
        val distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.rect.centerX, zone.rect.centerZ, 160)
        val demand = def.species.count { speciesId ->
            w.bag.roomFor(speciesId) >= 1 && machineHungryFor(ctx, speciesId)
        }
        var score = spot.stock * 10L + demand * 40L + (200 - distTicks).coerceAtLeast(0).toLong()
        // Finish 4.0 Phase 19 — line_pro_stock / trophy_cast_bias spot scoring.
        if (linePro) score += spot.stock * 15L
        if (trophyCast) {
            val rareBias = def.species.count { id ->
                w.bag.roomFor(id) >= 1 &&
                    (ctx.content.speciesById[id]?.rarityWeight ?: 100) <= TROPHY_CAST_RARE_WEIGHT_MAX
            }
            score += rareBias * 55L
        }
        considered++
        if (
            best == null ||
            score > bestScore ||
            (score == bestScore && spot.zoneId > bestZone)
        ) {
            best = spot
            bestScore = score
            bestZone = spot.zoneId
        }
    }
    WorkerDecisionHooks.record(
        WorkerDecisionTrace(
            workerId = w.id,
            role = "fisher",
            kind = "spot",
            reason = when {
                best == null -> "none_available"
                trophyCast -> "trophy_cast_bias"
                linePro -> "line_pro_stock"
                else -> "best_score"
            },
            score = if (best != null) bestScore else null,
            candidatesConsidered = considered,
            tick = ctx.state.tick,
        ),
    )
    return best
}

/** Porter leaves intermediates to operators unless a supervisor overrides for counter demand. */
fun porterMayHaul(ctx: StepContext, itemId: String, supervisor: Boolean): Boolean {
    val machineWants = ctx.state.machines.any { m ->
        val station = ctx.harbor.stations.first { it.id == m.stationId }
        ProductionSystem.isUnlocked(station, ctx.state) &&
            itemId in acceptedInputs(ctx, m.machineId) && destHasRoom(ctx, m.input, itemId, exceptWorkerId = "")
    }
    if (!machineWants) return true
    if (!supervisor) return false
    return counterDemandForItem(ctx, itemId) > 0
}

fun destHasRoom(ctx: StepContext, dest: Inventory, itemId: String, exceptWorkerId: String): Boolean {
    val pending = pendingDestClaims(ctx, dest.id, itemId, exceptWorkerId)
    return dest.roomFor(itemId) - pending >= 1
}

fun pendingDestClaims(ctx: StepContext, destId: String, itemId: String, exceptWorkerId: String): Int {
    var n = 0
    for (o in ctx.state.workers) {
        if (o.id == exceptWorkerId) continue
        if (o.taskDestInvId != destId) continue
        if (o.phase == WorkerTaskPhase.WALK_TO_WORK || o.phase == WorkerTaskPhase.PICKUP) {
            if (o.taskItemId == itemId) n += o.taskQuantity.coerceAtLeast(1)
        } else if (
            o.phase == WorkerTaskPhase.WALK_TO_DROP ||
            o.phase == WorkerTaskPhase.DROP ||
            o.phase == WorkerTaskPhase.NONE
        ) {
            n += o.bag.quantity(itemId)
        }
    }
    return n
}

fun scoreHaul(
    ctx: StepContext,
    w: WorkerState,
    source: Inventory,
    sourceX: Int,
    sourceZ: Int,
    urgencyBonus: Int,
    demand: Int,
): Long {
    val routing = ctx.content.routing
    val fill = if (source.capacityUnits <= 0) 0
    else (source.usedUnits().toLong() * 100L / source.capacityUnits).toInt().coerceIn(0, 100)
    val urgency = fill + urgencyBonus
    val distTicks = WorkerSystem.walkTicks(w.x, w.z, sourceX, sourceZ, 160)
    val distance = (200 - distTicks).coerceAtLeast(0)
    var demW = routing.demandWeight.toLong()
    if (WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)) {
        demW = demW * routing.supervisorDemandBoostPermille / 1000L
    }
    return routing.urgencyWeight.toLong() * urgency +
        routing.distanceWeight.toLong() * distance +
        demW * demand
}

fun betterHaul(a: HaulOffer, b: HaulOffer): Boolean {
    if (a.score != b.score) return a.score > b.score
    val srcCmp = a.source.id.compareTo(b.source.id)
    if (srcCmp != 0) return srcCmp < 0
    val destCmp = a.dest.id.compareTo(b.dest.id)
    if (destCmp != 0) return destCmp < 0
    return a.itemId < b.itemId
}

fun counterDemand(ctx: StepContext, counter: CounterState, itemId: String): Int {
    var d = 0
    val waiting = ctx.state.customers.count { it.counterId == counter.counterId && it.arrived }
    d += waiting * 20
    if (counter.stock.available(itemId) == 0) d += 40
    d += ctx.state.customers.count {
        it.counterId == counter.counterId && it.arrived && it.preferredProductId == itemId && !it.preferenceMet()
    } * 30
    return d
}

fun counterDemandForItem(ctx: StepContext, itemId: String): Int {
    var best = 0
    for (c in ctx.state.counters) {
        val def = ctx.harbor.counters.first { it.id == c.counterId }
        if (!CustomerSystem.isUnlocked(def, ctx.state)) continue
        best = maxOf(best, counterDemand(ctx, c, itemId))
    }
    return best
}

fun machineDemand(m: MachineState): Int {
    var d = 0
    if (m.status == MachineStatus.WAITING_FOR_INPUT) d += 40
    if (m.input.isEmpty()) d += 20
    return d
}

fun machineHungryFor(ctx: StepContext, itemId: String): Boolean =
    ctx.state.machines.any { m ->
        val station = ctx.harbor.stations.first { it.id == m.stationId }
        ProductionSystem.isUnlocked(station, ctx.state) &&
            itemId in acceptedInputs(ctx, m.machineId) && m.input.roomFor(itemId) >= 1
    }

fun acceptedInputs(ctx: StepContext, machineId: String): Set<String> =
    ctx.content.machinesById.getValue(machineId).recipes
        .flatMap { ctx.content.recipesById.getValue(it).inputs.map { iq -> iq.item } }.toSet()

fun findMachineInputForBag(ctx: StepContext, w: WorkerState): Triple<MachineState, PointMm, String>? {
    for (m in ctx.state.machines.sortedBy { it.stationId }) {
        val station = ctx.harbor.stations.first { it.id == m.stationId }
        if (!ProductionSystem.isUnlocked(station, ctx.state)) continue
        val accepted = acceptedInputs(ctx, m.machineId)
        val has = w.bag.contents().keys.any { it in accepted && destHasRoom(ctx, m.input, it, w.id) }
        if (!has) continue
        val zone = ctx.harbor.zonesById.getValue(station.inputZone)
        return Triple(m, PointMm(zone.rect.centerX, zone.rect.centerZ), station.inputZone)
    }
    return null
}

fun findSmokerInputDrop(ctx: StepContext, w: WorkerState): Triple<MachineState, PointMm, String>? {
    for (m in ctx.state.machines.sortedBy { it.stationId }) {
        val station = ctx.harbor.stations.first { it.id == m.stationId }
        if (!station.machine.contains("smoker")) continue
        if (!ProductionSystem.isUnlocked(station, ctx.state)) continue
        val accepted = acceptedInputs(ctx, m.machineId)
        val has = w.bag.contents().keys.any { it in accepted && destHasRoom(ctx, m.input, it, w.id) }
        if (!has) continue
        val zone = ctx.harbor.zonesById.getValue(station.inputZone)
        return Triple(m, PointMm(zone.rect.centerX, zone.rect.centerZ), station.inputZone)
    }
    return null
}

fun findSmokerHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
    var best: HaulOffer? = null
    for (src in ctx.state.machines.sortedBy { it.stationId }) {
        val srcStation = ctx.harbor.stations.first { it.id == src.stationId }
        if (!ProductionSystem.isUnlocked(srcStation, ctx.state)) continue
        val zone = ctx.harbor.zonesById.getValue(srcStation.outputZone)
        for ((itemId, _) in src.output.contents()) {
            if (src.output.available(itemId) < 1) continue
            if (w.bag.roomFor(itemId) < 1) continue
            for (dst in ctx.state.machines.sortedBy { it.stationId }) {
                if (dst.stationId == src.stationId) continue
                val dstStation = ctx.harbor.stations.first { it.id == dst.stationId }
                if (!ProductionSystem.isUnlocked(dstStation, ctx.state)) continue
                val involvesSmoker = srcStation.machine.contains("smoker") ||
                    dstStation.machine.contains("smoker")
                if (!involvesSmoker) continue
                val accepted = acceptedInputs(ctx, dst.machineId)
                if (itemId !in accepted) continue
                if (!destHasRoom(ctx, dst.input, itemId, w.id)) continue
                val demand = machineDemand(dst)
                val score = scoreHaul(
                    ctx, w, src.output, zone.rect.centerX, zone.rect.centerZ,
                    urgencyBonus = if (src.status == MachineStatus.OUTPUT_FULL) 50 else 0,
                    demand = demand,
                ) + 60L // prefer smoker-related hauls over idle posting
                val offer = HaulOffer(
                    src.output, dst.input, itemId,
                    zone.rect.centerX, zone.rect.centerZ, srcStation.outputZone, score,
                )
                if (best == null || betterHaul(offer, best)) best = offer
            }
        }
    }
    return best
}

fun smokerPost(ctx: StepContext): Triple<MachineState, PointMm, String>? {
    for (m in ctx.state.machines.sortedBy { it.stationId }) {
        val station = ctx.harbor.stations.first { it.id == m.stationId }
        if (!station.machine.contains("smoker")) continue
        if (!ProductionSystem.isUnlocked(station, ctx.state)) continue
        val zone = ctx.harbor.zonesById.getValue(station.inputZone)
        return Triple(m, PointMm(zone.rect.centerX, zone.rect.centerZ), station.inputZone)
    }
    return null
}

fun findCounterDrop(ctx: StepContext, w: WorkerState): Triple<CounterState, PointMm, String>? {
    var best: Triple<CounterState, PointMm, String>? = null
    var bestScore = Long.MIN_VALUE
    for (c in ctx.state.counters.sortedBy { it.counterId }) {
        val def = ctx.harbor.counters.first { it.id == c.counterId }
        if (!CustomerSystem.isUnlocked(def, ctx.state)) continue
        val item = w.bag.contents().keys
            .filter { def.accepts(it) && destHasRoom(ctx, c.stock, it, w.id) }
            .minOrNull() ?: continue
        val zone = ctx.harbor.zonesById.getValue(def.zone)
        val demand = counterDemand(ctx, c, item).toLong()
        if (best == null || demand > bestScore || (demand == bestScore && c.counterId < best.first.counterId)) {
            best = Triple(c, PointMm(zone.rect.centerX, zone.rect.centerZ), def.zone)
            bestScore = demand
        }
    }
    return best
}

fun findInventory(ctx: StepContext, id: String): Inventory? {
    ctx.state.machines.forEach { m ->
        if (m.input.id == id) return m.input
        if (m.output.id == id) return m.output
    }
    ctx.state.counters.forEach { if (it.stock.id == id) return it.stock }
    ctx.state.workers.forEach { if (it.bag.id == id) return it.bag }
    if (ctx.state.player.bag.id == id) return ctx.state.player.bag
    return null
}

fun abortHaul(ctx: StepContext, w: WorkerState) {
    val sourceId = w.taskSourceInvId
    val itemId = w.taskItemId
    if (sourceId != null && itemId != null) {
        findInventory(ctx, sourceId)?.let { inv ->
            if (inv.reservedQuantity(itemId) > 0) inv.releaseReservation(itemId, minOf(1, inv.reservedQuantity(itemId)))
        }
    }
    clearTask(w)
}

fun clearTask(w: WorkerState) {
    w.phase = WorkerTaskPhase.NONE
    w.taskId = null
    w.taskZoneId = null
    w.taskSourceInvId = null
    w.taskDestInvId = null
    w.taskItemId = null
    w.taskQuantity = 0
    w.leaseExpiresAt = 0
    clearCast(w)
}

fun clearCast(w: WorkerState) {
    w.fishingSpecies = null
    w.fishingProgress = 0
    w.fishingCatchTicks = 0
}

fun startWalk(w: WorkerState, toX: Int, toZ: Int, mmPerTick: Int) {
    w.walkFromX = w.x
    w.walkFromZ = w.z
    w.walkToX = toX
    w.walkToZ = toZ
    val ticks = WorkerSystem.walkTicks(w.x, w.z, toX, toZ, mmPerTick)
    w.walkTicksTotal = ticks
    w.walkTicksLeft = ticks
    if (ticks == 0) {
        w.x = toX
        w.z = toZ
    }
}

fun advanceWalk(w: WorkerState) {
    if (w.walkTicksLeft <= 0) return
    w.walkTicksLeft--
    val total = w.walkTicksTotal.coerceAtLeast(1)
    val elapsed = total - w.walkTicksLeft
    w.x = w.walkFromX + ((w.walkToX - w.walkFromX).toLong() * elapsed / total).toInt()
    w.z = w.walkFromZ + ((w.walkToZ - w.walkFromZ).toLong() * elapsed / total).toInt()
    if (w.walkTicksLeft == 0) {
        w.x = w.walkToX
        w.z = w.walkToZ
    }
}


}
