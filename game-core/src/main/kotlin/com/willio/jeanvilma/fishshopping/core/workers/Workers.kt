package com.willio.jeanvilma.fishshopping.core.workers

import com.willio.jeanvilma.fishshopping.core.content.PointMm
import com.willio.jeanvilma.fishshopping.core.content.WorkerDef
import com.willio.jeanvilma.fishshopping.core.content.WorkerRoleKind
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
 * Worker automation (blueprint "Workers, automation, and routing").
 *
 * Phase 11: hire FISHER / PORTER. Fishers walk to unlocked spots, cast into their
 * own bag, then deliver species to a machine input. Porters claim a haul lease
 * (reserve → walk → take → walk → drop) from machine output to the counter.
 *
 * Phase 12: OPERATOR hauls machine→machine (e.g. cutter fillet → smoker);
 * CASHIER walks to the counter and stays on duty so customers can check out
 * without the player standing there.
 *
 * Phase 13: haul candidates are scored (urgency / distance / demand); destination
 * capacity accounts for other workers' pending claims; leases emit on expiry;
 * SUPERVISOR on duty boosts demand weight and lets porters claim intermediates
 * when the counter is starving for that SKU.
 *
 * Phase 15: worker upgrades (move/carry/catch/wage) and hire gates via WorkerDef.requires.
 */
object WorkerSystem {

    private val HIREABLE = setOf(
        WorkerRoleKind.FISHER,
        WorkerRoleKind.PORTER,
        WorkerRoleKind.OPERATOR,
        WorkerRoleKind.CASHIER,
        WorkerRoleKind.SUPERVISOR,
    )

    fun step(ctx: StepContext) {
        accrueWages(ctx)
        for (w in ctx.state.workers) {
            advanceWalk(w)
            if (w.transferCooldown > 0) w.transferCooldown--
        }
        expireLeases(ctx)
        for (w in ctx.state.workers.sortedBy { it.id }) {
            if (w.busyWalking) continue
            val def = ctx.content.workersById[w.roleId] ?: continue
            when (def.role) {
                WorkerRoleKind.FISHER -> stepFisher(ctx, w, def)
                WorkerRoleKind.PORTER -> stepPorter(ctx, w, def)
                WorkerRoleKind.OPERATOR -> stepOperator(ctx, w, def)
                WorkerRoleKind.CASHIER -> stepCashier(ctx, w, def)
                WorkerRoleKind.SUPERVISOR -> stepSupervisor(ctx, w, def)
            }
        }
    }

    /** True when a supervisor has arrived at their post (not walking). */
    fun supervisorOnDuty(content: com.willio.jeanvilma.fishshopping.core.content.ContentPack, s: GameState): Boolean =
        s.workers.any { w ->
            val role = content.workersById[w.roleId]?.role
            role == WorkerRoleKind.SUPERVISOR &&
                !w.busyWalking &&
                w.phase == WorkerTaskPhase.WORK
        }

    fun hire(ctx: StepContext, roleId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { existing ->
            ctx.emit(GameEvent.WorkerHired(s.tick, roleId, existing, replayed = true))
            return
        }
        val def = ctx.content.workersById[roleId]
        if (def == null) {
            ctx.emit(GameEvent.HireRejected(s.tick, roleId, requestId, "Unknown worker"))
            return
        }
        if (def.role !in HIREABLE) {
            ctx.emit(GameEvent.HireRejected(s.tick, roleId, requestId, "Role not hireable yet"))
            return
        }
        missingRequirement(ctx.content, s, def)?.let { missing ->
            ctx.emit(GameEvent.HireRejected(s.tick, roleId, requestId, "Requires: $missing"))
            return
        }
        val hired = s.workers.count { it.roleId == roleId }
        if (hired >= def.maxHired) {
            ctx.emit(GameEvent.HireRejected(s.tick, roleId, requestId, "Max ${def.name}s hired"))
            return
        }
        if (s.coins < def.hireCost) {
            ctx.emit(GameEvent.HireRejected(s.tick, roleId, requestId, "Need ${def.hireCost - s.coins} more coins"))
            return
        }
        s.coins -= def.hireCost
        val spawn = ctx.harbor.customerEntry
        val id = s.newId("worker")
        val w = WorkerState(
            id = id,
            roleId = def.id,
            x = spawn.x,
            z = spawn.z,
            bag = Inventory("inv.$id.bag", carryCapacity(s, def), ctx.content::carryUnits),
        )
        s.workers += w
        s.bumpStat(Stats.WORKERS_HIRED)
        val receipt = Receipt(s.newId("hire"), "hire", -def.hireCost, s.tick, w.id)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        ctx.emit(GameEvent.WorkerHired(s.tick, roleId, receipt, replayed = false))
    }

    fun availability(content: com.willio.jeanvilma.fishshopping.core.content.ContentPack, s: GameState, def: WorkerDef): WorkerHireAvailability {
        if (def.role !in HIREABLE) {
            return WorkerHireAvailability.Locked("Coming soon")
        }
        missingRequirement(content, s, def)?.let { return WorkerHireAvailability.Locked("Requires: $it") }
        val hired = s.workers.count { it.roleId == def.id }
        if (hired >= def.maxHired) return WorkerHireAvailability.Maxed
        if (s.coins < def.hireCost) return WorkerHireAvailability.TooExpensive(def.hireCost - s.coins)
        return WorkerHireAvailability.Purchasable
    }

    private fun missingRequirement(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        def: WorkerDef,
    ): String? {
        val missing = def.requires.firstOrNull { it !in s.ownedUpgrades && it !in s.completedQuests } ?: return null
        return content.upgradesById[missing]?.name ?: content.questsById[missing]?.name ?: missing
    }

    fun moveSpeed(s: GameState, def: WorkerDef): Int =
        max(1, ((def.moveSpeedMmPerTick.toLong() * s.workerMoveSpeedPermille) / 1000L).toInt())

    fun catchSpeed(s: GameState, def: WorkerDef): Int =
        max(def.catchSpeedPermille, s.workerCatchSpeedPermille)

    fun carryCapacity(s: GameState, def: WorkerDef): Int =
        max(def.carryCapacityUnits, s.workerCarryCapacityFloor)

    sealed interface WorkerHireAvailability {
        data object Purchasable : WorkerHireAvailability
        data object Maxed : WorkerHireAvailability
        data class TooExpensive(val missing: Long) : WorkerHireAvailability
        data class Locked(val reason: String) : WorkerHireAvailability
    }

    // ---------------------------------------------------------------- fisher

    private fun stepFisher(ctx: StepContext, w: WorkerState, def: WorkerDef) {
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

    private fun assignFisher(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        if (!w.bag.isEmpty()) {
            val dest = findMachineInputForBag(ctx, w) ?: return
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.state, def))
            w.phase = WorkerTaskPhase.WALK_TO_DROP
            w.taskDestInvId = dest.first.input.id
            w.taskZoneId = dest.third
            w.taskId = ctx.state.newId("task")
            return
        }
        val spot = findFishableSpot(ctx, w) ?: return
        val zone = ctx.harbor.zonesById.getValue(spot.zoneId)
        startWalk(w, zone.rect.centerX, zone.rect.centerZ, moveSpeed(ctx.state, def))
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskZoneId = spot.zoneId
        w.taskId = ctx.state.newId("task")
    }

    private fun fish(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        val zoneId = w.taskZoneId ?: run { clearTask(w); return }
        val spotDef = ctx.harbor.fishingSpots.firstOrNull { it.zone == zoneId } ?: run { clearTask(w); return }
        val spot = ctx.state.fishingSpots.first { it.zoneId == zoneId }
        if (!FishingSystem.isUnlocked(spotDef, ctx.state) || spot.stock <= 0 || w.bag.freeUnits() == 0) {
            // Deliver whatever we have, or idle.
            clearCast(w)
            if (!w.bag.isEmpty()) {
                val dest = findMachineInputForBag(ctx, w)
                if (dest != null) {
                    startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.state, def))
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
            val pick = candidates[ctx.state.rng.pickWeighted(candidates.map { it.rarityWeight })]
            w.fishingSpecies = pick.id
            w.fishingProgress = 0
            w.fishingCatchTicks = FishingSystem.catchTicksFor(catchSpeed(ctx.state, def), pick.catchTicks)
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
                startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.state, def))
                w.phase = WorkerTaskPhase.WALK_TO_DROP
                w.taskDestInvId = dest.first.input.id
                w.taskZoneId = dest.third
            } else {
                clearTask(w)
            }
        }
    }

    private fun dropToMachine(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        if (w.transferCooldown > 0) return
        val destId = w.taskDestInvId ?: run { clearTask(w); return }
        val machine = ctx.state.machines.firstOrNull { it.input.id == destId } ?: run { clearTask(w); return }
        val accepted = ctx.content.machinesById.getValue(machine.machineId).recipes
            .flatMap { ctx.content.recipesById.getValue(it).inputs.map { iq -> iq.item } }.toSet()
        val moved = Transfers.moveFirstAccepted(w.bag, machine.input) { it in accepted }
        if (moved != null) {
            ctx.state.bumpStat(Stats.MACHINE_INPUTS)
            ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
            ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, w.bag.id, machine.input.id, moved, 1))
            w.transferCooldown = def.transferIntervalTicks - 1
        }
        if (w.bag.isEmpty() || moved == null) clearTask(w)
    }

    // ---------------------------------------------------------------- porter

    private fun stepPorter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
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

    private fun assignPorter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        // Finish delivering anything already in the bag.
        if (!w.bag.isEmpty()) {
            val dest = findCounterDrop(ctx, w) ?: return
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.state, def))
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
        startWalk(w, haul.sourceX, haul.sourceZ, moveSpeed(ctx.state, def))
    }

    private fun pickupHaul(ctx: StepContext, w: WorkerState, def: WorkerDef) {
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
        w.transferCooldown = def.transferIntervalTicks - 1
        ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED)
        ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
        ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, source.id, w.bag.id, itemId, 1))
        val dest = findCounterDrop(ctx, w)
        if (dest == null) {
            // Keep item; clear lease fields for destination retry next tick.
            w.phase = WorkerTaskPhase.NONE
            w.taskSourceInvId = null
            w.taskItemId = null
            w.leaseExpiresAt = 0
            return
        }
        startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.state, def))
        w.phase = WorkerTaskPhase.WALK_TO_DROP
        w.taskDestInvId = dest.first.stock.id
        w.taskZoneId = dest.third
        w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
    }

    private fun dropHaul(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        if (w.transferCooldown > 0) return
        val destId = w.taskDestInvId ?: run { clearTask(w); return }
        val counter = ctx.state.counters.firstOrNull { it.stock.id == destId } ?: run { clearTask(w); return }
        val cdef = ctx.harbor.counters.first { it.id == counter.counterId }
        val moved = Transfers.moveFirstAccepted(w.bag, counter.stock) { cdef.accepts(it) }
        if (moved != null) {
            ctx.state.bumpStat(Stats.COUNTER_STOCKED)
            ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED)
            ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, w.bag.id, counter.stock.id, moved, 1))
            w.transferCooldown = def.transferIntervalTicks - 1
        }
        if (w.bag.isEmpty() || moved == null) clearTask(w)
    }

    // ---------------------------------------------------------------- operator (machine → machine)

    private fun stepOperator(ctx: StepContext, w: WorkerState, def: WorkerDef) {
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

    private fun assignOperator(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        if (!w.bag.isEmpty()) {
            val dest = findMachineInputForBag(ctx, w) ?: return
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.state, def))
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
        startWalk(w, haul.sourceX, haul.sourceZ, moveSpeed(ctx.state, def))
    }

    private fun pickupMachineHaul(ctx: StepContext, w: WorkerState, def: WorkerDef) {
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
        w.transferCooldown = def.transferIntervalTicks - 1
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
        startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.state, def))
        w.phase = WorkerTaskPhase.WALK_TO_DROP
        w.taskDestInvId = dest.first.input.id
        w.taskZoneId = dest.third
        w.leaseExpiresAt = ctx.state.tick + def.leaseTicks
    }

    // ---------------------------------------------------------------- cashier

    private fun stepCashier(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        when (w.phase) {
            WorkerTaskPhase.NONE -> assignCashier(ctx, w, def)
            WorkerTaskPhase.WALK_TO_WORK -> {
                w.phase = WorkerTaskPhase.WORK
            }
            WorkerTaskPhase.WORK -> Unit // stay on duty at the counter
            else -> clearTask(w)
        }
    }

    private fun assignCashier(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        val counter = ctx.state.counters.sortedBy { it.counterId }.firstOrNull() ?: return
        val cdef = ctx.harbor.counters.first { it.id == counter.counterId }
        val zone = ctx.harbor.zonesById.getValue(cdef.zone)
        startWalk(w, zone.rect.centerX, zone.rect.centerZ, moveSpeed(ctx.state, def))
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskZoneId = cdef.zone
        w.taskId = ctx.state.newId("task")
    }

    // ---------------------------------------------------------------- supervisor

    private fun stepSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        when (w.phase) {
            WorkerTaskPhase.NONE -> assignSupervisor(ctx, w, def)
            WorkerTaskPhase.WALK_TO_WORK -> {
                w.phase = WorkerTaskPhase.WORK
            }
            WorkerTaskPhase.WORK -> Unit // on duty: boosts demand scoring for other workers
            else -> clearTask(w)
        }
    }

    private fun assignSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        // Post near the counter so demand overrides favour selling.
        val counter = ctx.state.counters.sortedBy { it.counterId }.firstOrNull() ?: return
        val cdef = ctx.harbor.counters.first { it.id == counter.counterId }
        val zone = ctx.harbor.zonesById.getValue(cdef.zone)
        startWalk(w, zone.rect.centerX, zone.rect.centerZ, moveSpeed(ctx.state, def))
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskZoneId = cdef.zone
        w.taskId = ctx.state.newId("task")
    }

    // ---------------------------------------------------------------- wages

    private fun accrueWages(ctx: StepContext) {
        val s = ctx.state
        val rate = s.workerWagePerWorkerPerHour
        if (rate <= 0 || s.workers.isEmpty()) return
        s.workerWageAccrualTicks++
        val hourTicks = 3600 * SimConstants.TICKS_PER_SECOND
        if (s.workerWageAccrualTicks < hourTicks) return
        s.workerWageAccrualTicks = 0
        val n = s.workers.size
        val cost = rate.toLong() * n
        val paid = min(cost, s.coins)
        if (paid <= 0L) return
        s.coins -= paid
        s.bumpStat(Stats.WAGES_PAID, paid)
        val receipt = Receipt(s.newId("wage"), "wage", -paid, s.tick, "workers:$n")
        s.record(receipt)
        ctx.emit(GameEvent.WagesPaid(s.tick, n, paid))
    }

    // ---------------------------------------------------------------- shared helpers

    private fun expireLeases(ctx: StepContext) {
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

    private data class HaulOffer(
        val source: Inventory,
        val dest: Inventory,
        val itemId: String,
        val sourceX: Int,
        val sourceZ: Int,
        val sourceZoneId: String,
        val score: Long,
    )

    private fun findHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
        val counter = ctx.state.counters.firstOrNull() ?: return null
        val cdef = ctx.harbor.counters.first { it.id == counter.counterId }
        val supervisor = supervisorOnDuty(ctx.content, ctx.state)
        var best: HaulOffer? = null
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
                val score = scoreHaul(
                    ctx, w, m.output, zone.rect.centerX, zone.rect.centerZ,
                    urgencyBonus = if (m.status == MachineStatus.OUTPUT_FULL) 50 else 0,
                    demand = demand,
                )
                val offer = HaulOffer(
                    m.output, counter.stock, itemId,
                    zone.rect.centerX, zone.rect.centerZ, station.outputZone, score,
                )
                if (best == null || betterHaul(offer, best)) best = offer
            }
        }
        return best
    }

    /** Intermediate haul: machine output → another machine's input (e.g. fillet → smoker). */
    private fun findMachineHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
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
                    val score = scoreHaul(
                        ctx, w, src.output, zone.rect.centerX, zone.rect.centerZ,
                        urgencyBonus = if (src.status == MachineStatus.OUTPUT_FULL) 50 else 0,
                        demand = demand,
                    )
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

    private fun findFishableSpot(ctx: StepContext, w: WorkerState) =
        ctx.state.fishingSpots
            .mapNotNull { spot ->
                val def = ctx.harbor.fishingSpots.first { it.zone == spot.zoneId }
                if (!FishingSystem.isUnlocked(def, ctx.state) || spot.stock <= 0) return@mapNotNull null
                if (def.species.none { w.bag.roomFor(it) >= 1 }) return@mapNotNull null
                val zone = ctx.harbor.zonesById.getValue(spot.zoneId)
                val distTicks = walkTicks(w.x, w.z, zone.rect.centerX, zone.rect.centerZ, 160)
                val demand = def.species.count { speciesId ->
                    w.bag.roomFor(speciesId) >= 1 && machineHungryFor(ctx, speciesId)
                }
                val score = spot.stock * 10L + demand * 40L + (200 - distTicks).coerceAtLeast(0)
                Triple(spot, score, spot.zoneId)
            }
            .maxWithOrNull(compareBy<Triple<FishingSpotState, Long, String>> { it.second }
                .thenByDescending { it.third })
            ?.first

    /** Porter leaves intermediates to operators unless a supervisor overrides for counter demand. */
    private fun porterMayHaul(ctx: StepContext, itemId: String, supervisor: Boolean): Boolean {
        val machineWants = ctx.state.machines.any { m ->
            val station = ctx.harbor.stations.first { it.id == m.stationId }
            ProductionSystem.isUnlocked(station, ctx.state) &&
                itemId in acceptedInputs(ctx, m.machineId) && destHasRoom(ctx, m.input, itemId, exceptWorkerId = "")
        }
        if (!machineWants) return true
        if (!supervisor) return false
        return counterDemandForItem(ctx, itemId) > 0
    }

    private fun destHasRoom(ctx: StepContext, dest: Inventory, itemId: String, exceptWorkerId: String): Boolean {
        val pending = pendingDestClaims(ctx, dest.id, itemId, exceptWorkerId)
        return dest.roomFor(itemId) - pending >= 1
    }

    private fun pendingDestClaims(ctx: StepContext, destId: String, itemId: String, exceptWorkerId: String): Int {
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

    private fun scoreHaul(
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
        val distTicks = walkTicks(w.x, w.z, sourceX, sourceZ, 160)
        val distance = (200 - distTicks).coerceAtLeast(0)
        var demW = routing.demandWeight.toLong()
        if (supervisorOnDuty(ctx.content, ctx.state)) {
            demW = demW * routing.supervisorDemandBoostPermille / 1000L
        }
        return routing.urgencyWeight.toLong() * urgency +
            routing.distanceWeight.toLong() * distance +
            demW * demand
    }

    private fun betterHaul(a: HaulOffer, b: HaulOffer): Boolean {
        if (a.score != b.score) return a.score > b.score
        val srcCmp = a.source.id.compareTo(b.source.id)
        if (srcCmp != 0) return srcCmp < 0
        val destCmp = a.dest.id.compareTo(b.dest.id)
        if (destCmp != 0) return destCmp < 0
        return a.itemId < b.itemId
    }

    private fun counterDemand(ctx: StepContext, counter: CounterState, itemId: String): Int {
        var d = 0
        val waiting = ctx.state.customers.count { it.counterId == counter.counterId && it.arrived }
        d += waiting * 20
        if (counter.stock.available(itemId) == 0) d += 40
        d += ctx.state.customers.count {
            it.counterId == counter.counterId && it.arrived && it.preferredProductId == itemId && !it.preferenceMet()
        } * 30
        return d
    }

    private fun counterDemandForItem(ctx: StepContext, itemId: String): Int {
        var best = 0
        for (c in ctx.state.counters) {
            best = maxOf(best, counterDemand(ctx, c, itemId))
        }
        return best
    }

    private fun machineDemand(m: MachineState): Int {
        var d = 0
        if (m.status == MachineStatus.WAITING_FOR_INPUT) d += 40
        if (m.input.isEmpty()) d += 20
        return d
    }

    private fun machineHungryFor(ctx: StepContext, itemId: String): Boolean =
        ctx.state.machines.any { m ->
            val station = ctx.harbor.stations.first { it.id == m.stationId }
            ProductionSystem.isUnlocked(station, ctx.state) &&
                itemId in acceptedInputs(ctx, m.machineId) && m.input.roomFor(itemId) >= 1
        }

    private fun acceptedInputs(ctx: StepContext, machineId: String): Set<String> =
        ctx.content.machinesById.getValue(machineId).recipes
            .flatMap { ctx.content.recipesById.getValue(it).inputs.map { iq -> iq.item } }.toSet()

    private fun findMachineInputForBag(ctx: StepContext, w: WorkerState): Triple<MachineState, PointMm, String>? {
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

    private fun findCounterDrop(ctx: StepContext, w: WorkerState): Triple<CounterState, PointMm, String>? {
        for (c in ctx.state.counters.sortedBy { it.counterId }) {
            val def = ctx.harbor.counters.first { it.id == c.counterId }
            val has = w.bag.contents().keys.any { def.accepts(it) && destHasRoom(ctx, c.stock, it, w.id) }
            if (!has) continue
            val zone = ctx.harbor.zonesById.getValue(def.zone)
            return Triple(c, PointMm(zone.rect.centerX, zone.rect.centerZ), def.zone)
        }
        return null
    }

    private fun findInventory(ctx: StepContext, id: String): Inventory? {
        ctx.state.machines.forEach { m ->
            if (m.input.id == id) return m.input
            if (m.output.id == id) return m.output
        }
        ctx.state.counters.forEach { if (it.stock.id == id) return it.stock }
        ctx.state.workers.forEach { if (it.bag.id == id) return it.bag }
        if (ctx.state.player.bag.id == id) return ctx.state.player.bag
        return null
    }

    private fun abortHaul(ctx: StepContext, w: WorkerState) {
        val sourceId = w.taskSourceInvId
        val itemId = w.taskItemId
        if (sourceId != null && itemId != null) {
            findInventory(ctx, sourceId)?.let { inv ->
                if (inv.reservedQuantity(itemId) > 0) inv.releaseReservation(itemId, minOf(1, inv.reservedQuantity(itemId)))
            }
        }
        clearTask(w)
    }

    private fun clearTask(w: WorkerState) {
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

    private fun clearCast(w: WorkerState) {
        w.fishingSpecies = null
        w.fishingProgress = 0
        w.fishingCatchTicks = 0
    }

    private fun startWalk(w: WorkerState, toX: Int, toZ: Int, mmPerTick: Int) {
        w.walkFromX = w.x
        w.walkFromZ = w.z
        w.walkToX = toX
        w.walkToZ = toZ
        val ticks = walkTicks(w.x, w.z, toX, toZ, mmPerTick)
        w.walkTicksTotal = ticks
        w.walkTicksLeft = ticks
        if (ticks == 0) {
            w.x = toX
            w.z = toZ
        }
    }

    private fun advanceWalk(w: WorkerState) {
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

    fun walkTicks(fromX: Int, fromZ: Int, toX: Int, toZ: Int, mmPerTick: Int): Int {
        val dx = (toX - fromX).toLong()
        val dz = (toZ - fromZ).toLong()
        val dist = SafeMath.isqrt(dx * dx + dz * dz)
        if (dist == 0L) return 0
        return ((dist + mmPerTick - 1) / mmPerTick).toInt()
    }
}
