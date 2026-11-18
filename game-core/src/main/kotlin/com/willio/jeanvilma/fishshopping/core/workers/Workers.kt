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
 *
 * Finish 4.0 Phase 5: role/haul/motion AI lives in [WorkerAi]; decision traces in [WorkerDecisionHooks].
 */
object WorkerSystem {

    /**
     * Finish 3.0 Phase 10 — every content-defined worker role is hireable.
     * The old `"Coming soon"` allowlist lock is retired; requirements/cost/caps remain.
     */
    private val HIREABLE = WorkerRoleKind.entries.toSet()

    fun step(ctx: StepContext) {
        WorkerAi.accrueWages(ctx)
        for (w in ctx.state.workers) {
            if (!w.onShift) continue
            WorkerAi.advanceWalk(w)
            if (w.transferCooldown > 0) w.transferCooldown--
        }
        WorkerAi.expireLeases(ctx)
        for (w in ctx.state.workers.sortedBy { it.id }) {
            if (!w.onShift || w.busyWalking) continue
            val def = ctx.content.workersById[w.roleId] ?: continue
            when (def.role) {
                WorkerRoleKind.FISHER -> WorkerAi.stepFisher(ctx, w, def)
                WorkerRoleKind.PORTER -> WorkerAi.stepPorter(ctx, w, def)
                WorkerRoleKind.OPERATOR -> WorkerAi.stepOperator(ctx, w, def)
                WorkerRoleKind.CASHIER -> WorkerAi.stepCashier(ctx, w, def)
                WorkerRoleKind.SUPERVISOR -> WorkerAi.stepSupervisor(ctx, w, def)
                WorkerRoleKind.ICE_RUNNER -> WorkerAi.stepIceRunner(ctx, w, def)
                WorkerRoleKind.SMOKER_SPECIALIST -> WorkerAi.stepSmokerSpecialist(ctx, w, def)
                WorkerRoleKind.GREETER -> WorkerAi.stepGreeter(ctx, w, def)
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
            WorkerAi.abortHaul(ctx, w)
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
        mult = (mult * StaffTreesSystem.transferIntervalMultPermille(content, w).toLong()) / 1000L
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

    /** Finish 3.0 Phase 10 — count hire rows still showing the retired Coming soon lock. */
    fun countComingSoonReasons(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        s: GameState,
    ): Int = content.workers.count { def ->
        when (val a = availability(content, s, def)) {
            is WorkerHireAvailability.Locked -> a.reason == "Coming soon"
            else -> false
        }
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
        speed = (speed * StaffTreesSystem.moveSpeedMultPermille(content, w).toLong()) / 1000L
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
        speed = (speed * StaffTreesSystem.catchSpeedMultPermille(content, w).toLong()) / 1000L
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
        return max(def.carryCapacityUnits, gearCarry) + levelBonus + traitCarry +
            StaffTreesSystem.carryBonus(content, w)
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


    fun walkTicks(fromX: Int, fromZ: Int, toX: Int, toZ: Int, mmPerTick: Int): Int {
        val dx = (toX - fromX).toLong()
        val dz = (toZ - fromZ).toLong()
        val dist = SafeMath.isqrt(dx * dx + dz * dz)
        if (dist == 0L) return 0
        return ((dist + mmPerTick - 1) / mmPerTick).toInt()
    }
}
