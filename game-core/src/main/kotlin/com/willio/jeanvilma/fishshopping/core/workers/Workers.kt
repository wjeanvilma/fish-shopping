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
 * Phase 16: per-worker XP/levels + hire-time trait rolls from staffProgression.
 * Phase 17: on-shift toggles, overtime wages, supervisor expands free shift slots.
 * Phase 18: ice_runner, smoker_specialist, greeter hireable roles + buffs.
 */
object WorkerSystem {

    private val HIREABLE = setOf(
        WorkerRoleKind.FISHER,
        WorkerRoleKind.PORTER,
        WorkerRoleKind.OPERATOR,
        WorkerRoleKind.CASHIER,
        WorkerRoleKind.SUPERVISOR,
        WorkerRoleKind.ICE_RUNNER,
        WorkerRoleKind.SMOKER_SPECIALIST,
        WorkerRoleKind.GREETER,
    )

    fun step(ctx: StepContext) {
        accrueWages(ctx)
        for (w in ctx.state.workers) {
            if (!w.onShift) continue
            advanceWalk(w)
            if (w.transferCooldown > 0) w.transferCooldown--
        }
        expireLeases(ctx)
        for (w in ctx.state.workers.sortedBy { it.id }) {
            if (!w.onShift || w.busyWalking) continue
            val def = ctx.content.workersById[w.roleId] ?: continue
            when (def.role) {
                WorkerRoleKind.FISHER -> stepFisher(ctx, w, def)
                WorkerRoleKind.PORTER -> stepPorter(ctx, w, def)
                WorkerRoleKind.OPERATOR -> stepOperator(ctx, w, def)
                WorkerRoleKind.CASHIER -> stepCashier(ctx, w, def)
                WorkerRoleKind.SUPERVISOR -> stepSupervisor(ctx, w, def)
                WorkerRoleKind.ICE_RUNNER -> stepIceRunner(ctx, w, def)
                WorkerRoleKind.SMOKER_SPECIALIST -> stepSmokerSpecialist(ctx, w, def)
                WorkerRoleKind.GREETER -> stepGreeter(ctx, w, def)
            }
        }
    }

    /** True when a supervisor has arrived at their post (on shift, not walking). */
    fun supervisorOnDuty(content: com.willio.jeanvilma.fishshopping.core.content.ContentPack, s: GameState): Boolean =
        s.workers.any { w ->
            val role = content.workersById[w.roleId]?.role
            role == WorkerRoleKind.SUPERVISOR &&
                w.onShift &&
                !w.busyWalking &&
                w.phase == WorkerTaskPhase.WORK
        }

    /** True when a greeter is posted at the entry (slows patience drain). */
    fun greeterOnDuty(content: com.willio.jeanvilma.fishshopping.core.content.ContentPack, s: GameState): Boolean =
        s.workers.any { w ->
            val role = content.workersById[w.roleId]?.role
            role == WorkerRoleKind.GREETER &&
                w.onShift &&
                !w.busyWalking &&
                w.phase == WorkerTaskPhase.WORK
        }

    /** True when a smoker specialist is posted at a smoker station. */
    fun smokerSpecialistOnDuty(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        harbor: com.willio.jeanvilma.fishshopping.core.content.HarborDef,
    ): Boolean =
        s.workers.any { w ->
            val role = content.workersById[w.roleId]?.role
            if (role != WorkerRoleKind.SMOKER_SPECIALIST || !w.onShift || w.busyWalking) return@any false
            if (w.phase != WorkerTaskPhase.WORK) return@any false
            val zoneId = w.taskZoneId ?: return@any false
            harbor.stations.any { st ->
                st.machine.contains("smoker") && (st.inputZone == zoneId || st.outputZone == zoneId)
            }
        }

    /** Free standard-wage on-shift slots (base + supervisor bonus when posted). */
    fun freeOnShiftSlots(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
    ): Int {
        val shifts = content.staffProgression.shifts
        var slots = shifts.baseOnShiftSlots
        if (supervisorOnDuty(content, s)) slots += shifts.supervisorExtraSlots
        return slots
    }

    fun setShift(ctx: StepContext, workerId: String, onShift: Boolean) {
        val w = ctx.state.workers.firstOrNull { it.id == workerId } ?: return
        if (w.onShift == onShift) return
        w.onShift = onShift
        if (!onShift) {
            abortHaul(ctx, w)
            w.walkTicksLeft = 0
            w.walkTicksTotal = 0
        }
        ctx.emit(GameEvent.WorkerShiftChanged(ctx.state.tick, w.id, w.roleId, onShift))
    }

    /** Slot id for an assignable staff-gear upgrade, or null if not a loadout piece. */
    fun loadoutSlotFor(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        upgradeId: String,
    ): String? =
        content.staffProgression.loadouts.slots.firstOrNull { upgradeId in it.upgradeIds }?.id

    fun assignableUpgradeIds(content: com.willio.jeanvilma.fishshopping.core.content.ContentPack): Set<String> =
        content.staffProgression.loadouts.slots.flatMap { it.upgradeIds }.toSet()

    /** Equip [upgradeId] onto [workerId]; moves it off any other worker first. */
    fun assignGear(ctx: StepContext, workerId: String, upgradeId: String) {
        val s = ctx.state
        val w = s.workers.firstOrNull { it.id == workerId } ?: return
        if (upgradeId !in s.ownedUpgrades) return
        val slotId = loadoutSlotFor(ctx.content, upgradeId) ?: return
        if (w.equipment[slotId] == upgradeId) return
        for (other in s.workers) {
            var changed = false
            val stealKeys = other.equipment.filterValues { it == upgradeId }.keys.toList()
            for (key in stealKeys) {
                other.equipment.remove(key)
                changed = true
            }
            if (other.id == w.id) {
                val prev = other.equipment[slotId]
                if (prev != null && prev != upgradeId) {
                    other.equipment.remove(slotId)
                    changed = true
                }
            }
            if (changed && other.id != w.id) refreshCarry(ctx.content, s, other)
        }
        w.equipment[slotId] = upgradeId
        refreshCarry(ctx.content, s, w)
        ctx.emit(GameEvent.WorkerGearAssigned(s.tick, w.id, upgradeId, slotId))
    }

    fun unequipGear(ctx: StepContext, workerId: String, slotId: String) {
        val s = ctx.state
        val w = s.workers.firstOrNull { it.id == workerId } ?: return
        val upgradeId = w.equipment.remove(slotId) ?: return
        refreshCarry(ctx.content, s, w)
        ctx.emit(GameEvent.WorkerGearUnequipped(s.tick, w.id, upgradeId, slotId))
    }

    /**
     * Legacy saves applied staff boots/satchel/tackle as global floors. Phase 19 moves those
     * into per-worker equipment — auto-equip owned gear onto the first workers that can take it.
     */
    fun migrateLegacyGlobalGear(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
    ) {
        val assignable = assignableUpgradeIds(content)
        for (upgradeId in content.upgrades.map { it.id }.filter { it in assignable && it in s.ownedUpgrades }) {
            if (s.workers.any { upgradeId in it.equipment.values }) continue
            val slotId = loadoutSlotFor(content, upgradeId) ?: continue
            val target = s.workers.firstOrNull { slotId !in it.equipment } ?: continue
            target.equipment[slotId] = upgradeId
        }
        s.workerMoveSpeedPermille = 1000
        s.workerCatchSpeedPermille = 0
        s.workerCarryCapacityFloor = 0
    }

    private fun refreshCarry(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        w: WorkerState,
    ) {
        val def = content.workersById[w.roleId] ?: return
        w.bag.capacityUnits = carryCapacity(content, s, def, w)
    }

    /** movePermille, catchFloor, carryFloor from equipped staff gear. */
    fun gearBonuses(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        w: WorkerState,
    ): Triple<Int, Int, Int> {
        var move = 1000L
        var catchFloor = 0
        var carryFloor = 0
        for (upgradeId in w.equipment.values) {
            when (val effect = content.upgradesById[upgradeId]?.effect) {
                is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.WorkerMoveSpeed ->
                    move = (move * effect.speedPermille.toLong()) / 1000L
                is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.WorkerCatchSpeed ->
                    catchFloor = max(catchFloor, effect.speedPermille)
                is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.WorkerCarry ->
                    carryFloor = max(carryFloor, effect.capacityUnits)
                else -> Unit
            }
        }
        return Triple(move.toInt().coerceAtLeast(1), catchFloor, carryFloor)
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
            bag = Inventory("inv.$id.bag", def.carryCapacityUnits, ctx.content::carryUnits),
        )
        rollTraits(ctx, w)
        w.bag.capacityUnits = carryCapacity(ctx.content, s, def, w)
        s.workers += w
        s.bumpStat(Stats.WORKERS_HIRED)
        val receipt = Receipt(s.newId("hire"), "hire", -def.hireCost, s.tick, w.id)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        ctx.emit(GameEvent.WorkerHired(s.tick, roleId, receipt, replayed = false))
    }

    /** Deterministic weighted trait picks without replacement. */
    fun rollTraits(ctx: StepContext, w: WorkerState) {
        val prog = ctx.content.staffProgression
        val pool = prog.traits.toMutableList()
        repeat(prog.traitsOnHire.coerceAtMost(pool.size)) {
            if (pool.isEmpty()) return
            val pick = pool[ctx.state.rng.pickWeighted(pool.map { it.weight })]
            w.traits += pick.id
            pool.removeAll { it.id == pick.id }
        }
    }

    fun levelForXp(content: com.willio.jeanvilma.fishshopping.core.content.ContentPack, xp: Int): Int {
        val thresholds = content.staffProgression.xpThresholds
        var level = 1
        for (i in 1 until thresholds.size) {
            if (xp >= thresholds[i]) level = i + 1 else break
        }
        return level.coerceIn(1, content.staffProgression.maxLevel)
    }

    fun grantXp(ctx: StepContext, w: WorkerState, amount: Int) {
        if (amount <= 0) return
        w.xp += amount
        ctx.state.bumpStat(Stats.WORKER_XP, amount.toLong())
        val next = levelForXp(ctx.content, w.xp)
        if (next <= w.level) return
        w.level = next
        val def = ctx.content.workersById[w.roleId] ?: return
        w.bag.capacityUnits = carryCapacity(ctx.content, ctx.state, def, w)
        ctx.state.bumpStat(Stats.WORKER_LEVEL_UPS)
        ctx.emit(GameEvent.WorkerLeveledUp(ctx.state.tick, w.id, w.roleId, w.level))
    }

    private fun traitBonus(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        w: WorkerState,
    ): Triple<Int, Int, Int> {
        // moveMult, catchMult, carryBonus (permille, permille, units)
        var move = 1000L
        var catch = 1000L
        var carry = 0
        for (tid in w.traits) {
            val t = content.workerTraitsById[tid] ?: continue
            move = (move * t.moveSpeedPermille.toLong()) / 1000L
            catch = (catch * t.catchSpeedPermille.toLong()) / 1000L
            carry += t.carryBonus
        }
        return Triple(move.toInt().coerceAtLeast(1), catch.toInt().coerceAtLeast(1), carry)
    }

    private fun transferIntervalMult(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        w: WorkerState,
    ): Int {
        var mult = 1000L
        for (tid in w.traits) {
            val t = content.workerTraitsById[tid] ?: continue
            mult = (mult * t.transferIntervalMultPermille.toLong()) / 1000L
        }
        return mult.toInt().coerceAtLeast(1)
    }

    /**
     * Why an on-shift worker is stuck idle (Phase 20). Null while walking, casting, or actively tasked.
     */
    fun blockedReason(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        harbor: com.willio.jeanvilma.fishshopping.core.content.HarborDef,
        w: WorkerState,
    ): String? {
        if (!w.onShift) return "Off shift"
        if (w.busyWalking) return null
        val def = content.workersById[w.roleId] ?: return null
        if (w.phase != WorkerTaskPhase.NONE && w.phase != WorkerTaskPhase.WORK) return null
        if (w.phase == WorkerTaskPhase.WORK && def.role != WorkerRoleKind.FISHER) return null
        if (def.role == WorkerRoleKind.FISHER && w.fishingSpecies != null) return null
        return when (def.role) {
            WorkerRoleKind.FISHER -> fisherBlocked(content, s, harbor, w)
            WorkerRoleKind.PORTER, WorkerRoleKind.ICE_RUNNER ->
                haulBlocked(content, s, harbor, counterHaul = true)
            WorkerRoleKind.OPERATOR, WorkerRoleKind.SMOKER_SPECIALIST ->
                haulBlocked(content, s, harbor, counterHaul = false)
            WorkerRoleKind.CASHIER, WorkerRoleKind.GREETER, WorkerRoleKind.SUPERVISOR -> null
        }
    }

    private fun fisherBlocked(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        harbor: com.willio.jeanvilma.fishshopping.core.content.HarborDef,
        w: WorkerState,
    ): String? {
        if (!w.bag.isEmpty()) {
            val canDrop = s.machines.any { m ->
                val st = harbor.stations.firstOrNull { it.id == m.stationId } ?: return@any false
                ProductionSystem.isUnlocked(st, s) && !m.paused &&
                    w.bag.contents().any { (item, qty) -> qty > 0 && m.input.roomFor(item) >= 1 }
            }
            if (!canDrop) return "No path"
        }
        val unlocked = harbor.fishingSpots.filter { FishingSystem.isUnlocked(it, s) }
        if (unlocked.isEmpty()) return "No fishing spots"
        val stocked = unlocked.any { spot ->
            (s.fishingSpots.firstOrNull { it.zoneId == spot.zone }?.stock ?: 0) > 0
        }
        if (!stocked) return "Spots empty"
        if (w.bag.freeUnits() == 0) return "No path"
        return null
    }

    private fun haulBlocked(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        harbor: com.willio.jeanvilma.fishshopping.core.content.HarborDef,
        counterHaul: Boolean,
    ): String? {
        val unlocked = s.machines.filter { m ->
            val st = harbor.stations.firstOrNull { it.id == m.stationId } ?: return@filter false
            ProductionSystem.isUnlocked(st, s) && !m.paused
        }
        if (unlocked.any { it.status == MachineStatus.OUTPUT_FULL }) return "Output full"
        val hasOutput = unlocked.any { !it.output.isEmpty() }
        if (counterHaul) {
            val counterRoom = s.counters.any { c ->
                unlocked.any { m ->
                    m.output.contents().any { (item, qty) -> qty > 0 && c.stock.roomFor(item) >= 1 }
                }
            }
            if (hasOutput && !counterRoom) return "No path"
            if (!hasOutput && unlocked.any { it.status == MachineStatus.WAITING_FOR_INPUT }) return "No input"
            return null
        }
        // Operator / smoker specialist: machine→machine
        if (hasOutput) {
            val canFeed = unlocked.any { src ->
                src.output.contents().any { (item, qty) ->
                    qty > 0 && unlocked.any { dest ->
                        dest.stationId != src.stationId && dest.input.roomFor(item) >= 1
                    }
                }
            }
            if (!canFeed) return "No path"
        }
        if (!hasOutput && unlocked.any { it.status == MachineStatus.WAITING_FOR_INPUT }) return "No input"
        return null
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

    fun moveSpeed(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        def: WorkerDef,
        w: WorkerState,
    ): Int {
        val prog = content.staffProgression
        val levelMult = 1000L + prog.moveSpeedPermillePerLevel.toLong() * (w.level - 1).coerceAtLeast(0)
        val (traitMove, _, _) = traitBonus(content, w)
        val (gearMove, _, _) = gearBonuses(content, w)
        var speed = def.moveSpeedMmPerTick.toLong()
        speed = (speed * gearMove.toLong()) / 1000L
        speed = (speed * levelMult) / 1000L
        speed = (speed * traitMove.toLong()) / 1000L
        return max(1, speed.toInt())
    }

    /** Legacy helper for callers that only have global floors (no per-worker traits). */
    fun moveSpeed(s: GameState, def: WorkerDef): Int =
        max(1, ((def.moveSpeedMmPerTick.toLong() * s.workerMoveSpeedPermille) / 1000L).toInt())

    fun catchSpeed(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        def: WorkerDef,
        w: WorkerState,
    ): Int {
        val prog = content.staffProgression
        val levelMult = 1000L + prog.catchSpeedPermillePerLevel.toLong() * (w.level - 1).coerceAtLeast(0)
        val (_, traitCatch, _) = traitBonus(content, w)
        val (_, gearCatch, _) = gearBonuses(content, w)
        var speed = max(def.catchSpeedPermille, gearCatch).toLong()
        speed = (speed * levelMult) / 1000L
        speed = (speed * traitCatch.toLong()) / 1000L
        return max(1, speed.toInt())
    }

    fun catchSpeed(s: GameState, def: WorkerDef): Int =
        max(def.catchSpeedPermille, s.workerCatchSpeedPermille)

    fun carryCapacity(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
        def: WorkerDef,
        w: WorkerState,
    ): Int {
        val prog = content.staffProgression
        val levelBonus = if (prog.carryBonusEveryLevels <= 0) 0
        else (w.level - 1).coerceAtLeast(0) / prog.carryBonusEveryLevels
        val (_, _, traitCarry) = traitBonus(content, w)
        val (_, _, gearCarry) = gearBonuses(content, w)
        return max(def.carryCapacityUnits, gearCarry) + levelBonus + traitCarry
    }

    fun carryCapacity(s: GameState, def: WorkerDef): Int =
        max(def.carryCapacityUnits, s.workerCarryCapacityFloor)

    fun transferInterval(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        def: WorkerDef,
        w: WorkerState,
    ): Int {
        val mult = transferIntervalMult(content, w)
        return max(1, ((def.transferIntervalTicks.toLong() * mult) / 1000L).toInt())
    }

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
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
            w.phase = WorkerTaskPhase.WALK_TO_DROP
            w.taskDestInvId = dest.first.input.id
            w.taskZoneId = dest.third
            w.taskId = ctx.state.newId("task")
            return
        }
        val spot = findFishableSpot(ctx, w) ?: return
        val zone = ctx.harbor.zonesById.getValue(spot.zoneId)
        startWalk(w, zone.rect.centerX, zone.rect.centerZ, moveSpeed(ctx.content, ctx.state, def, w))
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
                    startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
            val pick = candidates[ctx.state.rng.pickWeighted(
                candidates.map {
                    com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.scaledWeight(
                        it.rarityWeight,
                        ctx.content,
                        ctx.state.tick,
                        it.id,
                    )
                },
            )]
            w.fishingSpecies = pick.id
            w.fishingProgress = 0
            w.fishingCatchTicks = FishingSystem.catchTicksFor(catchSpeed(ctx.content, ctx.state, def, w), pick.catchTicks)
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
            grantXp(ctx, w, ctx.content.staffProgression.xpFishCaught)
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
                startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
            grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved)
            ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, w.bag.id, machine.input.id, moved, 1))
            w.transferCooldown = transferInterval(ctx.content, def, w) - 1
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
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
        startWalk(w, haul.sourceX, haul.sourceZ, moveSpeed(ctx.content, ctx.state, def, w))
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
        w.transferCooldown = transferInterval(ctx.content, def, w) - 1
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
        startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
            grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved)
            ctx.emit(GameEvent.ItemsTransferred(ctx.state.tick, w.bag.id, counter.stock.id, moved, 1))
            w.transferCooldown = transferInterval(ctx.content, def, w) - 1
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
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
        startWalk(w, haul.sourceX, haul.sourceZ, moveSpeed(ctx.content, ctx.state, def, w))
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
        w.transferCooldown = transferInterval(ctx.content, def, w) - 1
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
        startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
            WorkerTaskPhase.WORK -> {
                // Re-route when another unlocked pad scores meaningfully higher (Phase 15).
                val best = bestCashierPost(ctx, w) ?: return
                if (best.zone != w.taskZoneId) {
                    val zone = ctx.harbor.zonesById.getValue(best.zone)
                    startWalk(w, zone.rect.centerX, zone.rect.centerZ, moveSpeed(ctx.content, ctx.state, def, w))
                    w.phase = WorkerTaskPhase.WALK_TO_WORK
                    w.taskZoneId = best.zone
                    w.taskId = ctx.state.newId("task")
                }
            }
            else -> clearTask(w)
        }
    }

    private fun assignCashier(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        val cdef = bestCashierPost(ctx, w) ?: return
        val zone = ctx.harbor.zonesById.getValue(cdef.zone)
        startWalk(w, zone.rect.centerX, zone.rect.centerZ, moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskZoneId = cdef.zone
        w.taskId = ctx.state.newId("task")
    }

    /**
     * Score unlocked counters with content [RoutingDef] weights and pick the best
     * uncovered post (Phase 15 multi-pad cashiers).
     */
    private fun bestCashierPost(ctx: StepContext, w: WorkerState): CounterDef? {
        val covered = ctx.state.workers
            .filter { other ->
                other.id != w.id &&
                    ctx.content.workersById[other.roleId]?.role == WorkerRoleKind.CASHIER &&
                    (other.phase == WorkerTaskPhase.WORK || other.phase == WorkerTaskPhase.WALK_TO_WORK)
            }
            .mapNotNull { it.taskZoneId }
            .toSet()
        var best: CounterDef? = null
        var bestScore = Long.MIN_VALUE
        for (cdef in ctx.harbor.counters.sortedBy { it.id }) {
            if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue
            val counter = ctx.state.counters.first { it.counterId == cdef.id }
            val zone = ctx.harbor.zonesById.getValue(cdef.zone)
            val waiting = ctx.state.customers.count { it.counterId == cdef.id && it.arrived }
            val urgency = waiting * 25 + if (counter.stock.usedUnits() == 0) 0 else 10
            val distTicks = walkTicks(w.x, w.z, zone.rect.centerX, zone.rect.centerZ, 160)
            val distance = (200 - distTicks).coerceAtLeast(0)
            val demand = waiting * 20 + if (counter.stock.usedUnits() == 0) 40 else 0
            var score = scorePost(ctx, urgency, distance, demand)
            if (cdef.zone in covered) score -= 10_000L
            if (best == null || score > bestScore || (score == bestScore && cdef.id < best.id)) {
                best = cdef
                bestScore = score
            }
        }
        return best
    }

    private fun scorePost(ctx: StepContext, urgency: Int, distance: Int, demand: Int): Long {
        val routing = ctx.content.routing
        var demW = routing.demandWeight.toLong()
        if (supervisorOnDuty(ctx.content, ctx.state)) {
            demW = demW * routing.supervisorDemandBoostPermille / 1000L
        }
        return routing.urgencyWeight.toLong() * urgency +
            routing.distanceWeight.toLong() * distance +
            demW * demand
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
        // Post near the busiest unlocked counter so demand overrides favour selling.
        val cdef = bestCashierPost(ctx, w) ?: return
        val zone = ctx.harbor.zonesById.getValue(cdef.zone)
        startWalk(w, zone.rect.centerX, zone.rect.centerZ, moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskZoneId = cdef.zone
        w.taskId = ctx.state.newId("task")
    }

    // ---------------------------------------------------------------- ice runner (fragile / ice stock → counter)

    private fun stepIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        when (w.phase) {
            WorkerTaskPhase.NONE -> assignIceRunner(ctx, w, def)
            WorkerTaskPhase.WALK_TO_WORK -> w.phase = WorkerTaskPhase.PICKUP
            WorkerTaskPhase.PICKUP -> pickupHaul(ctx, w, def)
            WorkerTaskPhase.WALK_TO_DROP -> w.phase = WorkerTaskPhase.DROP
            WorkerTaskPhase.DROP -> dropHaul(ctx, w, def)
            else -> clearTask(w)
        }
    }

    private fun assignIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        if (!w.bag.isEmpty()) {
            val dest = findCounterDrop(ctx, w) ?: return
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
        startWalk(w, haul.sourceX, haul.sourceZ, moveSpeed(ctx.content, ctx.state, def, w))
    }

    // ---------------------------------------------------------------- smoker specialist (smoker I/O + process buff)

    private fun stepSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef) {
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

    private fun assignSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        if (!w.bag.isEmpty()) {
            val dest = findSmokerInputDrop(ctx, w) ?: findMachineInputForBag(ctx, w) ?: return
            startWalk(w, dest.second.x, dest.second.z, moveSpeed(ctx.content, ctx.state, def, w))
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
            startWalk(w, haul.sourceX, haul.sourceZ, moveSpeed(ctx.content, ctx.state, def, w))
            return
        }
        // Idle: post at smoker input to grant process-speed buff.
        val post = smokerPost(ctx) ?: return
        startWalk(w, post.second.x, post.second.z, moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskZoneId = post.third
        w.taskId = ctx.state.newId("task")
        w.taskSourceInvId = null
        w.taskDestInvId = null
        w.taskItemId = null
    }

    // ---------------------------------------------------------------- greeter (entry post → patience buff)

    private fun stepGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        when (w.phase) {
            WorkerTaskPhase.NONE -> assignGreeter(ctx, w, def)
            WorkerTaskPhase.WALK_TO_WORK -> w.phase = WorkerTaskPhase.WORK
            WorkerTaskPhase.WORK -> Unit
            else -> clearTask(w)
        }
    }

    private fun assignGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef) {
        val entry = ctx.harbor.customerEntry
        startWalk(w, entry.x, entry.z, moveSpeed(ctx.content, ctx.state, def, w))
        w.phase = WorkerTaskPhase.WALK_TO_WORK
        w.taskZoneId = "greeter.entry"
        w.taskId = ctx.state.newId("task")
    }

    // ---------------------------------------------------------------- wages

    private fun accrueWages(ctx: StepContext) {
        val s = ctx.state
        val rate = s.workerWagePerWorkerPerHour
        val onShift = s.workers.filter { it.onShift }
        if (rate <= 0 || onShift.isEmpty()) return
        s.workerWageAccrualTicks++
        val hourTicks = 3600 * SimConstants.TICKS_PER_SECOND
        if (s.workerWageAccrualTicks < hourTicks) return
        s.workerWageAccrualTicks = 0
        val n = onShift.size
        val free = freeOnShiftSlots(ctx.content, s)
        val standardN = min(n, free)
        val overtimeN = max(0, n - free)
        val standard = rate.toLong() * standardN
        val overtime = (rate.toLong() * overtimeN * ctx.content.staffProgression.shifts.overtimeWagePermille) / 1000L
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
        val supervisor = supervisorOnDuty(ctx.content, ctx.state)
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
        }
        return best
    }

    /** Porter-like haul with score bonus for ice crates / fragile spoil tiers. */
    private fun findIceHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
        val supervisor = supervisorOnDuty(ctx.content, ctx.state)
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

    private fun icePreferBonus(
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
            val def = ctx.harbor.counters.first { it.id == c.counterId }
            if (!CustomerSystem.isUnlocked(def, ctx.state)) continue
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

    private fun findSmokerInputDrop(ctx: StepContext, w: WorkerState): Triple<MachineState, PointMm, String>? {
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

    private fun findSmokerHaul(ctx: StepContext, w: WorkerState): HaulOffer? {
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

    private fun smokerPost(ctx: StepContext): Triple<MachineState, PointMm, String>? {
        for (m in ctx.state.machines.sortedBy { it.stationId }) {
            val station = ctx.harbor.stations.first { it.id == m.stationId }
            if (!station.machine.contains("smoker")) continue
            if (!ProductionSystem.isUnlocked(station, ctx.state)) continue
            val zone = ctx.harbor.zonesById.getValue(station.inputZone)
            return Triple(m, PointMm(zone.rect.centerX, zone.rect.centerZ), station.inputZone)
        }
        return null
    }

    private fun findCounterDrop(ctx: StepContext, w: WorkerState): Triple<CounterState, PointMm, String>? {
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
