/** The canonical simulation. Mirrors game-core sim/Simulation.kt. */
import type { ContentPack, HarborDef } from "./content";
import { CHECKPOINT_INTERVAL_TICKS, INPUT_SCALE } from "./foundations";
import type { Command, GameEvent, GameState } from "./state";
import {
  ContractSystem, CustomerSystem, EconomySystem, FishingSystem, HarborTravelSystem, MovementSystem, PrestigeSystem, ProductionSystem, ProgressionSystem,
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
    ProgressionSystem.step(ctx);
    PrestigeSystem.step(ctx);
    ContractSystem.step(ctx);
    EconomySystem.step(ctx);
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
      case "accept_contract":
        ContractSystem.accept(ctx, c.offerId, c.requestId);
        break;
      case "deliver_contract":
        ContractSystem.deliver(ctx, c.contractId, c.requestId);
        break;
      case "travel_to_harbor":
        HarborTravelSystem.travel(ctx, c.harborId, c.requestId);
        break;
    }
  }
}

