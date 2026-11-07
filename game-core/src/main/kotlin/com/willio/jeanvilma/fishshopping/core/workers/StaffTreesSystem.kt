package com.willio.jeanvilma.fishshopping.core.workers

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.StaffBranchDef
import com.willio.jeanvilma.fishshopping.core.content.StaffScheduleDef
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.WorkerState

/**
 * Finish 2.0 Phase 15 — staff specialization branches + automation schedules.
 */
object StaffTreesSystem {
    fun branchOf(content: ContentPack, w: WorkerState): StaffBranchDef? =
        w.activeBranchId?.let { content.staffBranchesById[it] }

    fun scheduleOf(content: ContentPack, w: WorkerState): StaffScheduleDef? =
        w.scheduleId?.let { content.staffSchedulesById[it] }

    fun roleWire(content: ContentPack, w: WorkerState): String =
        content.workersById[w.roleId]?.role?.wire ?: ""

    fun canTrain(content: ContentPack, state: GameState, w: WorkerState, branchId: String): String? {
        val branch = content.staffBranchesById[branchId] ?: return "Unknown branch"
        if (branch.role != roleWire(content, w)) return "Wrong role for this branch"
        if (branch.id in w.unlockedBranchIds) return "Already unlocked"
        if (w.level < branch.requiresWorkerLevel) return "Needs staff level ${branch.requiresWorkerLevel}"
        val parent = branch.parentId
        if (parent != null && parent !in w.unlockedBranchIds) return "Unlock parent branch first"
        if (state.coins < branch.trainingCostCoins) return "Need ${branch.trainingCostCoins - state.coins} more coins"
        return null
    }

    fun train(ctx: StepContext, workerId: String, branchId: String, requestId: String) {
        val s = ctx.state
        if (requestId in s.purchaseReceipts) {
            val prior = s.purchaseReceipts.getValue(requestId)
            ctx.emit(GameEvent.WorkerBranchTrained(s.tick, workerId, branchId, prior, replayed = true))
            return
        }
        val w = s.workers.firstOrNull { it.id == workerId } ?: run {
            ctx.emit(GameEvent.WorkerBranchTrainRejected(s.tick, workerId, branchId, requestId, "Unknown worker"))
            return
        }
        val reason = canTrain(ctx.content, s, w, branchId)
        if (reason != null) {
            ctx.emit(GameEvent.WorkerBranchTrainRejected(s.tick, workerId, branchId, requestId, reason))
            return
        }
        val branch = ctx.content.staffBranchesById.getValue(branchId)
        val cost = branch.trainingCostCoins.toLong()
        s.coins -= cost
        w.branchTrainingXp[branchId] = branch.trainingXpRequired
        w.unlockedBranchIds += branchId
        w.branchTrainingXp.remove(branchId)
        val receipt = Receipt(s.newId("train"), "staff_branch_train", -cost, s.tick, requestId)
        s.purchaseReceipts[requestId] = receipt
        s.record(receipt)
        s.bumpStat(Stats.STAFF_BRANCH_TRAINING)
        s.bumpStat(Stats.STAFF_BRANCHES_UNLOCKED)
        ctx.emit(GameEvent.WorkerBranchTrained(s.tick, workerId, branchId, receipt, replayed = false))
        ctx.emit(GameEvent.WorkerBranchUnlocked(s.tick, workerId, branchId))
        if (w.activeBranchId == null) {
            w.activeBranchId = branchId
            ctx.emit(GameEvent.WorkerBranchSelected(s.tick, workerId, branchId))
        }
    }

    fun selectBranch(ctx: StepContext, workerId: String, branchId: String?) {
        val s = ctx.state
        val w = s.workers.firstOrNull { it.id == workerId } ?: return
        if (branchId == null) {
            w.activeBranchId = null
            ctx.emit(GameEvent.WorkerBranchSelected(s.tick, workerId, null))
            return
        }
        if (branchId !in w.unlockedBranchIds) return
        val branch = ctx.content.staffBranchesById[branchId] ?: return
        if (branch.role != roleWire(ctx.content, w)) return
        w.activeBranchId = branchId
        ctx.emit(GameEvent.WorkerBranchSelected(s.tick, workerId, branchId))
    }

    fun setSchedule(ctx: StepContext, workerId: String, scheduleId: String?) {
        val s = ctx.state
        val w = s.workers.firstOrNull { it.id == workerId } ?: return
        if (scheduleId == null) {
            w.scheduleId = null
            ctx.emit(GameEvent.WorkerScheduleChanged(s.tick, workerId, null))
            return
        }
        if (scheduleId !in ctx.content.staffSchedulesById) return
        w.scheduleId = scheduleId
        ctx.emit(GameEvent.WorkerScheduleChanged(s.tick, workerId, scheduleId))
        applySchedule(ctx, w)
    }

    fun applySchedule(ctx: StepContext, w: WorkerState) {
        val schedule = scheduleOf(ctx.content, w) ?: return
        if (!schedule.autoOnShift) return
        val part = FishingSystem.dayPartAt(ctx.content, ctx.state.tick)
        val wantOn = part.id in schedule.dayParts
        if (w.onShift != wantOn) {
            WorkerSystem.setShift(ctx, w.id, wantOn)
        }
    }

    fun step(ctx: StepContext) {
        for (w in ctx.state.workers) applySchedule(ctx, w)
    }

    fun catchSpeedMultPermille(content: ContentPack, w: WorkerState): Int =
        branchOf(content, w)?.catchSpeedMultPermille ?: 1000

    fun moveSpeedMultPermille(content: ContentPack, w: WorkerState): Int =
        branchOf(content, w)?.moveSpeedMultPermille ?: 1000

    fun carryBonus(content: ContentPack, w: WorkerState): Int =
        branchOf(content, w)?.carryBonus ?: 0

    fun transferIntervalMultPermille(content: ContentPack, w: WorkerState): Int =
        branchOf(content, w)?.transferIntervalMultPermille ?: 1000

    fun wageMultPermille(content: ContentPack, w: WorkerState): Int {
        var mult = branchOf(content, w)?.wageMultPermille ?: 1000
        val schedule = scheduleOf(content, w)
        if (schedule != null) {
            mult = ((mult.toLong() * schedule.wageMultPermille) / 1000L).toInt().coerceAtLeast(1)
        }
        return mult.coerceAtLeast(1)
    }

    fun trainingProgress(w: WorkerState, branchId: String): Int =
        w.branchTrainingXp[branchId] ?: 0
}
