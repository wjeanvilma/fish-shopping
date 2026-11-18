/**
 * Extracted Finish 4.0 Phase 2 — production / machines.
 */
import type { ContentPack, ItemQuantity, RecipeDef } from "../content";
import { Inventory } from "../inventory";
import { GameState, MachineState } from "../state";
import { StepContext } from "./context";
import { systemsBridge } from "./bridge";

const fits = (content: ContentPack, inv: Inventory, items: readonly ItemQuantity[]) =>
  items.reduce((sum, iq) => sum + content.carryUnits(iq.item) * iq.quantity, 0) <= inv.freeUnits();

export const ProductionSystem = {
  isUnlocked(def: { requiresUpgrade?: string | null }, state: GameState): boolean {
    return !def.requiresUpgrade || state.ownedUpgrades.has(def.requiresUpgrade);
  },

  stationDef(ctx: StepContext, stationId: string) {
    return ctx.harbor.stations.find((st) => st.id === stationId)!;
  },

  durationFor(m: MachineState, recipe: RecipeDef): number {
    return m.recipeDurations.get(recipe.id) ?? recipe.durationTicks;
  },

  durationForCtx(ctx: StepContext, m: MachineState, recipe: RecipeDef): number {
    let duration = ProductionSystem.durationFor(m, recipe);
    if (m.machineId.includes("smoker") &&
      systemsBridge.smokerSpecialistOnDuty(ctx.content, ctx.state, ctx.harbor)) {
      const mult = ctx.content.staffProgression.roleBuffs.smokerSpecialistProcessSpeedPermille;
      duration = Math.max(1, Math.trunc((duration * 1000) / mult));
    }
    if (systemsBridge.economyIsSlowed(m, ctx.state.tick)) {
      const slow = ctx.content.economy.wear.slowProcessMultPermille;
      duration = Math.max(1, Math.trunc((duration * slow) / 1000));
    }
    return duration;
  },

  recipeLabel(recipeId: string): string {
    return recipeId.replace(/^recipe\./, "").split("_")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  },

  machineRecipes(content: ContentPack, machineId: string): RecipeDef[] {
    return content.machinesById.get(machineId)!.recipes.map((id) => content.recipesById.get(id)!);
  },

  selectableRecipes(content: ContentPack, m: MachineState): RecipeDef[] {
    const all = ProductionSystem.machineRecipes(content, m.machineId);
    if (!m.preferredRecipeId) return all;
    const locked = all.filter((r) => r.id === m.preferredRecipeId);
    return locked.length > 0 ? locked : all;
  },

  queuedReady(content: ContentPack, m: MachineState): RecipeDef[] {
    return ProductionSystem.selectableRecipes(content, m)
      .filter((r) => r.inputs.every((iq) => m.input.available(iq.item) >= iq.quantity));
  },

  nextStartable(content: ContentPack, m: MachineState): RecipeDef | null {
    return ProductionSystem.queuedReady(content, m).find((r) => fits(content, m.output, r.outputs)) ?? null;
  },

  cyclePreferredRecipe(content: ContentPack, m: MachineState): string | null {
    const ids = ProductionSystem.machineRecipes(content, m.machineId).map((r) => r.id);
    if (ids.length === 0) { m.preferredRecipeId = null; return null; }
    const cur = m.preferredRecipeId;
    let next: string | null;
    if (cur === null) next = ids[0]!;
    else if (!ids.includes(cur)) next = null;
    else {
      const i = ids.indexOf(cur);
      next = i < 0 || i >= ids.length - 1 ? null : ids[i + 1]!;
    }
    m.preferredRecipeId = next;
    return next;
  },

  step(ctx: StepContext): void {
    for (const m of ctx.state.machines) ProductionSystem.stepMachine(ctx, m);
  },

  stepMachine(ctx: StepContext, m: MachineState): void {
    const s = ctx.state;
    const station = ProductionSystem.stationDef(ctx, m.stationId);
    if (!ProductionSystem.isUnlocked(station, s)) {
      m.status = "LOCKED";
      return;
    }
    if (m.paused) {
      m.status = "PAUSED";
      return;
    }
    if (m.broken) {
      m.status = "NEEDS_REPAIR";
      return;
    }
    if (m.preferredRecipeId) {
      const allowed = ctx.content.machinesById.get(m.machineId)!.recipes;
      if (!allowed.includes(m.preferredRecipeId)) m.preferredRecipeId = null;
    }
    const batch = m.activeBatch;
    if (batch) {
      if (batch.remainingTicks > 0) batch.remainingTicks--;
      if (batch.remainingTicks > 0) {
        m.status = "PROCESSING";
        return;
      }
      const recipe = ctx.content.recipesById.get(batch.recipeId)!;
      if (!fits(ctx.content, m.output, recipe.outputs)) {
        m.status = "OUTPUT_FULL";
        return;
      }
      recipe.outputs.forEach((o) => m.output.add(o.item, o.quantity));
      m.activeBatch = null;
      ctx.emit({ type: "batch_completed", tick: s.tick, batchId: batch.id, stationId: m.stationId });
    }

    const ready = ProductionSystem.queuedReady(ctx.content, m);
    const startable = ready.find((r) => fits(ctx.content, m.output, r.outputs));
    if (!startable) {
      m.status = ready.length > 0 ? "OUTPUT_FULL" : "WAITING_FOR_INPUT";
      return;
    }
    startable.inputs.forEach((iq) => m.input.remove(iq.item, iq.quantity));
    const duration = ProductionSystem.durationForCtx(ctx, m, startable);
    const next = { id: s.newId("batch"), recipeId: startable.id, durationTicks: duration, remainingTicks: duration, consumed: startable.inputs.map((i) => ({ ...i })) };
    m.activeBatch = next;
    m.status = "PROCESSING";
    ctx.emit({ type: "batch_started", tick: s.tick, batchId: next.id, stationId: m.stationId, recipeId: startable.id });
  },

  statusText(m: MachineState, content: ContentPack, lockedReason?: string | null): string {
    switch (m.status) {
      case "WAITING_FOR_INPUT": return ProductionSystem.waitingText(m, content);
      case "PROCESSING": {
        const id = m.activeBatch?.recipeId;
        return id ? `Processing ${ProductionSystem.recipeLabel(id)}` : "Processing";
      }
      case "OUTPUT_FULL": return ProductionSystem.outputFullText(m, content);
      case "PAUSED": return "Paused";
      case "LOCKED": return lockedReason ?? "Locked — buy an upgrade";
      case "NEEDS_REPAIR": return "Needs repair";
    }
  },

  waitingText(m: MachineState, content: ContentPack): string {
    const preferred = m.preferredRecipeId ? content.recipesById.get(m.preferredRecipeId) : undefined;
    if (preferred) {
      const missing = preferred.inputs
        .filter((iq) => m.input.available(iq.item) < iq.quantity)
        .map((iq) => content.itemName(iq.item));
      return missing.length === 0
        ? `Waiting: ${ProductionSystem.recipeLabel(preferred.id)}`
        : `Needs ${missing.join(", ")} for ${ProductionSystem.recipeLabel(preferred.id)}`;
    }
    const names = [...new Set(
      ProductionSystem.machineRecipes(content, m.machineId).flatMap((r) => r.inputs.map((iq) => content.itemName(iq.item))),
    )];
    if (names.length === 1) return `Needs ${names[0]}`;
    return "Needs input";
  },

  outputFullText(m: MachineState, content: ContentPack): string {
    const recipe = m.activeBatch
      ? content.recipesById.get(m.activeBatch.recipeId)
      : ProductionSystem.queuedReady(content, m)[0];
    const products = recipe?.outputs.map((o) => content.itemName(o.item)).join(", ");
    return products ? `Output full — collect ${products}` : "Output full — collect products";
  },
};

