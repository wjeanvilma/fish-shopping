/**
 * Finish 4.0 Phase 6 — economy / staff / contracts / station intents for GameHost.
 * Finish 5.0 Phase 5: fishing intents live in HostFishingIntents.
 */
import { ProductionSystem, type Command } from "../../engine";
import type { HostStationIntentHost } from "./hostIntentHost";

export class HostEconomyIntents {
  constructor(private readonly host: HostStationIntentHost) {}

  private push(command: Command): void {
    this.host.enqueuePanelCommand(command);
  }

  claimDailyGoal(objectiveId: string): void {
    this.push({ type: "claim_daily_goal", objectiveId, requestId: crypto.randomUUID() });
  }

  claimWeeklyGoal(objectiveId: string): void {
    this.push({ type: "claim_weekly_goal", objectiveId, requestId: crypto.randomUUID() });
  }

  setMachinePaused(stationId: string, paused: boolean): void {
    this.push({ type: "set_machine_paused", stationId, paused });
  }

  purchase(upgradeId: string): void {
    this.push({ type: "purchase_upgrade", upgradeId, requestId: crypto.randomUUID() });
  }

  buildPlot(plotId: string): void {
    this.push({ type: "build_plot", plotId, requestId: crypto.randomUUID() });
  }

  purchaseDecor(decorId: string): void {
    this.push({ type: "purchase_decor", decorId, requestId: crypto.randomUUID() });
  }

  repairMachine(stationId: string): void {
    this.push({ type: "repair_machine", stationId, requestId: crypto.randomUUID() });
  }

  takeLoan(productId?: string | null): void {
    this.push({
      type: "take_loan",
      requestId: crypto.randomUUID(),
      productId: productId ?? null,
    });
  }

  repayLoan(): void {
    this.push({ type: "repay_loan", requestId: crypto.randomUUID() });
  }

  setCoinGoal(amount: number): void {
    this.push({ type: "set_coin_goal", amount });
  }

  hire(roleId: string): void {
    this.push({ type: "hire_worker", roleId, requestId: crypto.randomUUID() });
  }

  setWorkerShift(workerId: string, onShift: boolean): void {
    this.push({ type: "set_worker_shift", workerId, onShift });
  }

  trainWorkerBranch(workerId: string, branchId: string): void {
    this.push({ type: "train_worker_branch", workerId, branchId, requestId: crypto.randomUUID() });
  }

  selectWorkerBranch(workerId: string, branchId: string | null): void {
    this.push({ type: "select_worker_branch", workerId, branchId });
  }

  setWorkerSchedule(workerId: string, scheduleId: string | null): void {
    this.push({ type: "set_worker_schedule", workerId, scheduleId });
  }

  assignWorkerGear(workerId: string, upgradeId: string): void {
    this.push({ type: "assign_worker_gear", workerId, upgradeId });
  }

  unequipWorkerGear(workerId: string, slotId: string): void {
    this.push({ type: "unequip_worker_gear", workerId, slotId });
  }

  acceptContract(offerId: string): void {
    this.push({ type: "accept_contract", offerId, requestId: crypto.randomUUID() });
  }

  deliverContract(contractId: string): void {
    this.push({ type: "deliver_contract", contractId, requestId: crypto.randomUUID() });
  }

  /** Cycle Auto → each recipe → Auto for a station (no tick advance). */
  cycleStationRecipe(stationId: string): void {
    if (this.host.hasPendingOffline()) return;
    if (this.host.panelBlocksWorld() && !this.host.isPanelOpen("station")) return;
    this.host.withSim((sim) => {
      const m = sim.state.machines.find((mm) => mm.stationId === stationId);
      if (!m) return;
      ProductionSystem.cyclePreferredRecipe(sim.content, m);
      this.host.buildLatestView();
      this.host.publish(true);
    });
  }
}
