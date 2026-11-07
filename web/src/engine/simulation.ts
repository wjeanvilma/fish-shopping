/** The canonical simulation. Mirrors game-core sim/Simulation.kt. */
import type { ContentPack, HarborDef } from "./content";
import { CHECKPOINT_INTERVAL_TICKS, INPUT_SCALE } from "./foundations";
import type { Command, GameEvent, GameState } from "./state";
import {
  AchievementSystem, AutomationSystem, BaitSystem, BankSystem, ContractSystem, CosmeticsIapSystem, CustomerSystem, DailyGoalsSystem, DecorSystem, EconomySystem, FishingSystem, FullUnlockSystem, HarborTravelSystem, MovementSystem, PlotSystem, PrestigeSystem, ProductionSystem, ProgressionSystem, SeasonalEventSystem, WeatherSystem, MasterySystem, StaffTreesSystem,
  StepContext, TransferSystem, UpgradeSystem, WorkerSystem, invariantProblems,
} from "./systems";

export class Simulation {
  get harbor(): HarborDef {
    return this.content.harbor(this.state.harborId);
  }

  constructor(readonly content: ContentPack, readonly state: GameState) {}

  /**
   * One tick. Update order is part of the contract: commands; movement; arrivals;
   * fishing and transfers; production; customers and payment; workers; quests; prestige; contracts; economy; checkpoints.
   */
  step(commands: readonly Command[] = []): GameEvent[] {
    const s = this.state;
    s.tick++;
    const ctx = new StepContext(this.content, s);
    for (const c of commands) this.applyCommand(ctx, c);
    MovementSystem.step(ctx);
    MovementSystem.updateZone(ctx);
    FishingSystem.step(ctx);
    TransferSystem.step(ctx);
    ProductionSystem.step(ctx);
    CustomerSystem.step(ctx);
    WorkerSystem.step(ctx);
    StaffTreesSystem.step(ctx);
    AutomationSystem.step(ctx);
    ProgressionSystem.step(ctx);
    PrestigeSystem.step(ctx);
    AchievementSystem.step(ctx);
    DailyGoalsSystem.step(ctx);
    WeatherSystem.step(ctx);
    SeasonalEventSystem.step(ctx);
    ContractSystem.step(ctx);
    EconomySystem.step(ctx);
    BankSystem.step(ctx);
    if (s.tick % CHECKPOINT_INTERVAL_TICKS === 0) ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "periodic" });
    return ctx.events;
  }

  run(ticks: number): GameEvent[] {
    const all: GameEvent[] = [];
    for (let i = 0; i < ticks; i++) all.push(...this.step());
    return all;
  }

  invariantProblems(): string[] {
    return invariantProblems(this.content, this.state);
  }

  private applyCommand(ctx: StepContext, c: Command): void {
    switch (c.type) {
      case "move": {
        const clamp = (v: number) => Math.max(-INPUT_SCALE, Math.min(INPUT_SCALE, Math.trunc(v)));
        this.state.player.inputX = clamp(c.x);
        this.state.player.inputZ = clamp(c.z);
        break;
      }
      case "purchase_upgrade":
        UpgradeSystem.purchase(ctx, c.upgradeId, c.requestId);
        break;
      case "build_plot":
        PlotSystem.build(ctx, c.plotId, c.requestId);
        break;
      case "purchase_decor":
        DecorSystem.purchase(ctx, c.decorId, c.requestId);
        break;
      case "grant_full_harbor_unlock":
        FullUnlockSystem.grant(ctx, c.requestId);
        break;
      case "grant_iap_cosmetic":
        CosmeticsIapSystem.grant(ctx, c.cosmeticId, c.requestId);
        break;
      case "repair_machine":
        EconomySystem.repair(ctx, c.stationId, c.requestId);
        break;
      case "take_loan":
        BankSystem.takeLoan(ctx, c.requestId);
        break;
      case "repay_loan":
        BankSystem.repayLoan(ctx, c.requestId);
        break;
      case "set_coin_goal":
        BankSystem.setCoinGoal(ctx, c.amount);
        break;
      case "set_machine_paused": {
        const m = this.state.machines.find((mm) => mm.stationId === c.stationId);
        if (m) m.paused = c.paused;
        break;
      }
      case "reel":
        this.state.player.reelRequested = true;
        break;
      case "select_machine_recipe": {
        const m = this.state.machines.find((mm) => mm.stationId === c.stationId);
        if (!m) break;
        const allowed = this.content.machinesById.get(m.machineId)?.recipes ?? [];
        m.preferredRecipeId = c.recipeId && allowed.includes(c.recipeId) ? c.recipeId : null;
        break;
      }
      case "hire_worker":
        WorkerSystem.hire(ctx, c.roleId, c.requestId);
        break;
      case "set_worker_shift":
        WorkerSystem.setShift(ctx, c.workerId, c.onShift);
        break;
      case "assign_worker_gear":
        WorkerSystem.assignGear(ctx, c.workerId, c.upgradeId);
        break;
      case "unequip_worker_gear":
        WorkerSystem.unequipGear(ctx, c.workerId, c.slotId);
        break;
      case "train_worker_branch":
        StaffTreesSystem.train(ctx, c.workerId, c.branchId, c.requestId);
        break;
      case "select_worker_branch":
        StaffTreesSystem.selectBranch(ctx, c.workerId, c.branchId);
        break;
      case "set_worker_schedule":
        StaffTreesSystem.setSchedule(ctx, c.workerId, c.scheduleId);
        break;
      case "accept_contract":
        ContractSystem.accept(ctx, c.offerId, c.requestId);
        break;
      case "deliver_contract":
        ContractSystem.deliver(ctx, c.contractId, c.requestId);
        break;
      case "travel_to_harbor":
        HarborTravelSystem.travel(ctx, c.harborId, c.requestId);
        break;
      case "sync_wall_clock":
        DailyGoalsSystem.syncClock(ctx, c.epochMs);
        break;
      case "claim_daily_goal":
        DailyGoalsSystem.claim(ctx, c.objectiveId, c.requestId);
        break;
      case "buy_bait":
        BaitSystem.buy(ctx, c.baitId, c.requestId);
        break;
      case "select_technique":
        MasterySystem.select(this.state, this.content, c.techniqueId);
        break;
      case "select_bait":
        BaitSystem.select(this.state, this.content, c.baitId);
        break;
    }
  }
}

