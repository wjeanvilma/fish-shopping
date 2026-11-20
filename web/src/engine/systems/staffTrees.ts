/**
 * Extracted Finish 6.0 Phase 4 — staff specialization trees.
 */
import type { ContentPack } from "../content";
import { GameState, Receipt, Stats, WorkerState } from "../state";
import { systemsBridge } from "./bridge";
import { StepContext } from "./context";
import { FishingSystem } from "./fishing";

// ---------------------------------------------------------------- workers/StaffTreesSystem.kt

/** Finish 2.0 Phase 15 — staff specialization branches + automation schedules. */
export const StaffTreesSystem = {
  branchOf(content: ContentPack, w: WorkerState) {
    return w.activeBranchId ? content.staffBranchesById.get(w.activeBranchId) ?? null : null;
  },

  scheduleOf(content: ContentPack, w: WorkerState) {
    return w.scheduleId ? content.staffSchedulesById.get(w.scheduleId) ?? null : null;
  },

  roleWire(content: ContentPack, w: WorkerState): string {
    return content.workersById.get(w.roleId)?.role ?? "";
  },

  canTrain(content: ContentPack, state: GameState, w: WorkerState, branchId: string): string | null {
    const branch = content.staffBranchesById.get(branchId);
    if (!branch) return "Unknown branch";
    if (branch.role !== StaffTreesSystem.roleWire(content, w)) return "Wrong role for this branch";
    if (w.unlockedBranchIds.includes(branch.id)) return "Already unlocked";
    if (w.level < branch.requiresWorkerLevel) return `Needs staff level ${branch.requiresWorkerLevel}`;
    const parent = branch.parentId;
    if (parent !== null && !w.unlockedBranchIds.includes(parent)) return "Unlock parent branch first";
    if (state.coins < branch.trainingCostCoins) return `Need ${branch.trainingCostCoins - state.coins} more coins`;
    return null;
  },

  train(ctx: StepContext, workerId: string, branchId: string, requestId: string): void {
    const s = ctx.state;
    if (s.purchaseReceipts.has(requestId)) {
      const prior = s.purchaseReceipts.get(requestId)!;
      ctx.emit({
        type: "worker_branch_trained", tick: s.tick, workerId, branchId, receipt: prior, replayed: true,
      });
      return;
    }
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) {
      ctx.emit({
        type: "worker_branch_train_rejected", tick: s.tick, workerId, branchId, requestId, reason: "Unknown worker",
      });
      return;
    }
    const reason = StaffTreesSystem.canTrain(ctx.content, s, w, branchId);
    if (reason !== null) {
      ctx.emit({
        type: "worker_branch_train_rejected", tick: s.tick, workerId, branchId, requestId, reason,
      });
      return;
    }
    const branch = ctx.content.staffBranchesById.get(branchId)!;
    const cost = branch.trainingCostCoins;
    s.coins -= cost;
    w.branchTrainingXp.set(branchId, branch.trainingXpRequired);
    if (!w.unlockedBranchIds.includes(branchId)) w.unlockedBranchIds.push(branchId);
    w.branchTrainingXp.delete(branchId);
    const receipt: Receipt = { id: s.newId("train"), type: "staff_branch_train", coinDelta: -cost, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    s.bumpStat(Stats.STAFF_BRANCH_TRAINING);
    s.bumpStat(Stats.STAFF_BRANCHES_UNLOCKED);
    ctx.emit({
      type: "worker_branch_trained", tick: s.tick, workerId, branchId, receipt, replayed: false,
    });
    ctx.emit({ type: "worker_branch_unlocked", tick: s.tick, workerId, branchId });
    if (w.activeBranchId === null) {
      w.activeBranchId = branchId;
      ctx.emit({ type: "worker_branch_selected", tick: s.tick, workerId, branchId });
    }
  },

  selectBranch(ctx: StepContext, workerId: string, branchId: string | null): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) return;
    if (branchId === null) {
      w.activeBranchId = null;
      ctx.emit({ type: "worker_branch_selected", tick: s.tick, workerId, branchId: null });
      return;
    }
    if (!w.unlockedBranchIds.includes(branchId)) return;
    const branch = ctx.content.staffBranchesById.get(branchId);
    if (!branch || branch.role !== StaffTreesSystem.roleWire(ctx.content, w)) return;
    w.activeBranchId = branchId;
    ctx.emit({ type: "worker_branch_selected", tick: s.tick, workerId, branchId });
  },

  setSchedule(ctx: StepContext, workerId: string, scheduleId: string | null): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) return;
    if (scheduleId === null) {
      w.scheduleId = null;
      ctx.emit({ type: "worker_schedule_changed", tick: s.tick, workerId, scheduleId: null });
      return;
    }
    if (!ctx.content.staffSchedulesById.has(scheduleId)) return;
    w.scheduleId = scheduleId;
    ctx.emit({ type: "worker_schedule_changed", tick: s.tick, workerId, scheduleId });
    StaffTreesSystem.applySchedule(ctx, w);
  },

  applySchedule(ctx: StepContext, w: WorkerState): void {
    const schedule = StaffTreesSystem.scheduleOf(ctx.content, w);
    if (!schedule || !schedule.autoOnShift) return;
    const part = FishingSystem.dayPartAt(ctx.content, ctx.state.tick);
    const wantOn = schedule.dayParts.includes(part.id);
    if (w.onShift !== wantOn) systemsBridge.workerSetShift(ctx, w.id, wantOn);
  },

  step(ctx: StepContext): void {
    for (const w of ctx.state.workers) StaffTreesSystem.applySchedule(ctx, w);
  },

  catchSpeedMultPermille(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.catchSpeedMultPermille ?? 1000;
  },

  moveSpeedMultPermille(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.moveSpeedMultPermille ?? 1000;
  },

  carryBonus(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.carryBonus ?? 0;
  },

  transferIntervalMultPermille(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.transferIntervalMultPermille ?? 1000;
  },

  wageMultPermille(content: ContentPack, w: WorkerState): number {
    let mult = StaffTreesSystem.branchOf(content, w)?.wageMultPermille ?? 1000;
    const schedule = StaffTreesSystem.scheduleOf(content, w);
    if (schedule !== null) {
      mult = Math.trunc((mult * schedule.wageMultPermille) / 1000);
    }
    return Math.max(1, mult);
  },

  trainingProgress(w: WorkerState, branchId: string): number {
    return w.branchTrainingXp.get(branchId) ?? 0;
  },
};

