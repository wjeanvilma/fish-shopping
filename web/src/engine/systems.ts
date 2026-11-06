/**
 * Per-tick systems. Each function mirrors the Kotlin object of the same name in game-core;
 * keep them line-for-line comparable so fixture mismatches are easy to trace.
 */
import type { ContentPack, HarborDef, ItemQuantity, PointMm, RecipeDef, UpgradeDef, UpgradeEffect } from "./content";
import { queueSlot, rectContains } from "./content";
import { INPUT_SCALE, SafeMath, idiv } from "./foundations";
import { Inventory, Transfers } from "./inventory";
import { CustomerState, GameState, MachineState, PlayerState, Receipt, Stats, type GameEvent } from "./state";

export class StepContext {
  readonly events: GameEvent[] = [];
  constructor(readonly content: ContentPack, readonly harbor: HarborDef, readonly state: GameState) {}
  emit(e: GameEvent): void { this.events.push(e); }
}

// ---------------------------------------------------------------- world/World.kt

export const PLAYER_RADIUS_MM = 300;

export function isOpen(h: HarborDef, x: number, z: number): boolean {
  return h.walkable.some((w) => rectContains(w, x, z)) &&
    !h.obstacles.some((o) =>
      x >= o.minX - PLAYER_RADIUS_MM && x < o.maxX + PLAYER_RADIUS_MM &&
      z >= o.minZ - PLAYER_RADIUS_MM && z < o.maxZ + PLAYER_RADIUS_MM);
}

export const MovementSystem = {
  step(ctx: StepContext): void {
    const p = ctx.state.player;
    let ix = p.inputX;
    let iz = p.inputZ;
    const len = SafeMath.isqrt(ix * ix + iz * iz);
    if (len === 0) return;
    if (len > INPUT_SCALE) {
      ix = idiv(ix * INPUT_SCALE, len);
      iz = idiv(iz * INPUT_SCALE, len);
    }
    const speed = ctx.content.player.moveSpeedMmPerTick;
    const dx = idiv(ix * speed, INPUT_SCALE);
    const dz = idiv(iz * speed, INPUT_SCALE);
    p.facingX = ix;
    p.facingZ = iz;
    const h = ctx.harbor;
    if (isOpen(h, p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
    else if (isOpen(h, p.x + dx, p.z)) p.x += dx;
    else if (isOpen(h, p.x, p.z + dz)) p.z += dz;
  },

  updateZone(ctx: StepContext): void {
    const p = ctx.state.player;
    const zone = ctx.harbor.zones.find((z) => rectContains(z, p.x, p.z))?.id ?? null;
    if (zone !== p.zoneId) {
      p.zoneId = zone;
      p.transferCooldown = 0;
      ctx.emit({ type: "zone_entered", tick: ctx.state.tick, zoneId: zone });
    }
  },
};

export const TransferSystem = {
  step(ctx: StepContext): void {
    const s = ctx.state;
    const p = s.player;
    if (p.transferCooldown > 0) {
      p.transferCooldown--;
      return;
    }
    const zone = p.zoneId ? ctx.harbor.zones.find((z) => z.id === p.zoneId) : undefined;
    if (!zone) return;
    let moved = false;
    const transferred = (from: Inventory, to: Inventory, item: string | null, stat: string) => {
      if (item === null) return;
      s.bumpStat(stat);
      ctx.emit({ type: "items_transferred", tick: s.tick, from: from.id, to: to.id, itemId: item, count: 1 });
      moved = true;
    };
    switch (zone.kind) {
      case "machine_input": {
        const station = ctx.harbor.stations.find((st) => st.inputZone === zone.id)!;
        const m = s.machines.find((mm) => mm.stationId === station.id)!;
        const accepted = new Set(ctx.content.machinesById.get(m.machineId)!.recipes
          .flatMap((rid) => ctx.content.recipesById.get(rid)!.inputs.map((iq) => iq.item)));
        transferred(p.bag, m.input, Transfers.moveFirstAccepted(p.bag, m.input, (it) => accepted.has(it)), Stats.MACHINE_INPUTS);
        break;
      }
      case "machine_output": {
        const station = ctx.harbor.stations.find((st) => st.outputZone === zone.id)!;
        const m = s.machines.find((mm) => mm.stationId === station.id)!;
        transferred(m.output, p.bag, Transfers.moveFirstAccepted(m.output, p.bag, () => true), Stats.OUTPUTS_COLLECTED);
        break;
      }
      case "counter": {
        const counter = s.counters.find((c) => ctx.harbor.counters.find((d) => d.id === c.counterId)!.zone === zone.id)!;
        const def = ctx.harbor.counters.find((d) => d.id === counter.counterId)!;
        transferred(p.bag, counter.stock, Transfers.moveFirstAccepted(p.bag, counter.stock, (it) => def.products.includes(it)), Stats.COUNTER_STOCKED);
        break;
      }
      case "fishing":
        break;
    }
    if (moved) p.transferCooldown = ctx.content.player.transferIntervalTicks - 1;
  },
};

// ---------------------------------------------------------------- fishing/FishingSystem.kt

export const FishingSystem = {
  step(ctx: StepContext): void {
    FishingSystem.regenerate(ctx);
    const s = ctx.state;
    const p = s.player;
    const zone = p.zoneId ? ctx.harbor.zones.find((z) => z.id === p.zoneId) : undefined;
    if (!zone || zone.kind !== "fishing") {
      FishingSystem.clearCast(p);
      p.reelRequested = false;
      return;
    }
    const spotDef = ctx.harbor.fishingSpots.find((f) => f.zone === zone.id)!;
    const spot = s.fishingSpots.find((f) => f.zoneId === zone.id)!;

    if (p.fishingSpecies === null) {
      if (spot.stock <= 0) { p.reelRequested = false; return; }
      const candidates = spotDef.species.map((id) => ctx.content.speciesById.get(id)!)
        .filter((sp) => p.bag.roomFor(sp.id) >= 1);
      if (candidates.length === 0) { p.reelRequested = false; return; }
      const pick = candidates[s.rng.pickWeighted(candidates.map((c) => c.rarityWeight))]!;
      p.fishingSpecies = pick.id;
      p.fishingProgress = 0;
      p.fishingCatchTicks = FishingSystem.catchTicksFor(p.catchSpeedPermille, pick.catchTicks);
      p.reelAttemptedThisCast = false;
    }

    const species = ctx.content.speciesById.get(p.fishingSpecies)!;
    const duration = p.fishingCatchTicks > 0
      ? p.fishingCatchTicks
      : FishingSystem.catchTicksFor(p.catchSpeedPermille, species.catchTicks);
    p.fishingCatchTicks = duration;

    let timingBonus = false;
    if (p.reelRequested) {
      p.reelRequested = false;
      if (!p.reelAttemptedThisCast) {
        p.reelAttemptedThisCast = true;
        if (FishingSystem.inTimingWindow(
          p.fishingProgress, duration,
          ctx.content.player.timingWindowStartPermille,
          ctx.content.player.timingWindowEndPermille,
        )) {
          timingBonus = true;
          p.fishingProgress = duration;
        }
      }
    }

    if (!timingBonus) p.fishingProgress++;
    if (p.fishingProgress < duration) return;

    FishingSystem.commitCatch(ctx, zone.id, spot.zoneId, species.id, timingBonus);
    FishingSystem.clearCast(p);
  },

  catchTicksFor(catchSpeedPermille: number, baseCatchTicks: number): number {
    return Math.max(1, idiv(baseCatchTicks * 1000, catchSpeedPermille));
  },

  inTimingWindow(progress: number, duration: number, startPermille: number, endPermille: number): boolean {
    if (duration <= 0) return false;
    const permille = idiv(progress * 1000, duration);
    return permille >= startPermille && permille < endPermille;
  },

  commitCatch(ctx: StepContext, zoneId: string, spotZoneId: string, rolledSpeciesId: string, timingBonus: boolean): void {
    const s = ctx.state;
    const p = s.player;
    const spot = s.fishingSpots.find((f) => f.zoneId === spotZoneId)!;
    const rolled = ctx.content.speciesById.get(rolledSpeciesId)!;
    let finalId = rolledSpeciesId;
    let rare = false;
    const ru = rolled.rareUpgrade;
    if (ru && s.rng.nextBelow(1000) < ru.chancePermille) {
      finalId = ru.to;
      rare = true;
    }
    const finalSpecies = ctx.content.speciesById.get(finalId)!;
    if (p.bag.roomFor(finalSpecies.id) >= 1 && spot.stock > 0) {
      p.bag.add(finalSpecies.id, 1);
      spot.stock--;
      s.bumpStat(Stats.FISH_CAUGHT);
      if (rare) s.bumpStat(Stats.RARE_CATCHES);
      let bonusCoins = 0;
      if (timingBonus) {
        bonusCoins = finalSpecies.baseValue;
        s.coins = SafeMath.creditCoins(s.coins, bonusCoins);
        s.bumpStat(Stats.TIMING_BONUSES);
        s.bumpStat(Stats.REVENUE, bonusCoins);
        s.record({ id: s.newId("tip"), type: "timing_bonus", coinDelta: bonusCoins, tick: s.tick, reference: finalSpecies.id });
      }
      ctx.emit({
        type: "fish_caught", tick: s.tick, speciesId: finalSpecies.id, zoneId,
        timingBonus, rareUpgrade: rare,
      });
    }
  },

  clearCast(p: PlayerState): void {
    p.fishingSpecies = null;
    p.fishingProgress = 0;
    p.fishingCatchTicks = 0;
    p.reelAttemptedThisCast = false;
  },

  regenerate(ctx: StepContext): void {
    for (const spot of ctx.state.fishingSpots) {
      const def = ctx.harbor.fishingSpots.find((f) => f.zone === spot.zoneId)!;
      if (spot.stock >= def.stockMax) {
        spot.regenProgress = 0;
        continue;
      }
      if (++spot.regenProgress >= def.regenTicks) {
        spot.stock++;
        spot.regenProgress = 0;
      }
    }
  },
};

// ---------------------------------------------------------------- production/ProductionSystem.kt

const fits = (content: ContentPack, inv: Inventory, items: readonly ItemQuantity[]) =>
  items.reduce((sum, iq) => sum + content.carryUnits(iq.item) * iq.quantity, 0) <= inv.freeUnits();

export const ProductionSystem = {
  durationFor(m: MachineState, recipe: RecipeDef): number {
    return m.recipeDurations.get(recipe.id) ?? recipe.durationTicks;
  },

  step(ctx: StepContext): void {
    for (const m of ctx.state.machines) ProductionSystem.stepMachine(ctx, m);
  },

  stepMachine(ctx: StepContext, m: MachineState): void {
    const s = ctx.state;
    if (m.paused) {
      m.status = "PAUSED";
      return;
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

    const recipes = ctx.content.machinesById.get(m.machineId)!.recipes.map((id) => ctx.content.recipesById.get(id)!);
    const ready = recipes.filter((r) => r.inputs.every((iq) => m.input.available(iq.item) >= iq.quantity));
    const startable = ready.find((r) => fits(ctx.content, m.output, r.outputs));
    if (!startable) {
      m.status = ready.length > 0 ? "OUTPUT_FULL" : "WAITING_FOR_INPUT";
      return;
    }
    startable.inputs.forEach((iq) => m.input.remove(iq.item, iq.quantity));
    const duration = ProductionSystem.durationFor(m, startable);
    const next = { id: s.newId("batch"), recipeId: startable.id, durationTicks: duration, remainingTicks: duration, consumed: startable.inputs.map((i) => ({ ...i })) };
    m.activeBatch = next;
    m.status = "PROCESSING";
    ctx.emit({ type: "batch_started", tick: s.tick, batchId: next.id, stationId: m.stationId, recipeId: startable.id });
  },

  statusText(m: MachineState): string {
    switch (m.status) {
      case "WAITING_FOR_INPUT": return "Needs fish";
      case "PROCESSING": return "Processing";
      case "OUTPUT_FULL": return "Output full - collect portions";
      case "PAUSED": return "Paused";
    }
  },
};

// ---------------------------------------------------------------- customers/CustomerSystem.kt

export const CustomerSystem = {
  step(ctx: StepContext): void {
    CustomerSystem.spawn(ctx);
    const s = ctx.state;
    for (const counter of s.counters) {
      const def = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
      const front = s.customers.find((c) => c.counterId === counter.counterId && c.arrived);
      if (!front) {
        counter.checkoutProgress = 0;
        continue;
      }
      CustomerSystem.reserveTowardBasket(front, counter, def);

      const availableAccepted = CustomerSystem.acceptedAvailable(counter, def);
      const basketReady = front.reserved > 0 &&
        (front.reserved === front.wants || availableAccepted === 0);
      const served = s.player.zoneId === def.zone;
      if (basketReady && served) {
        if (++counter.checkoutProgress >= def.checkoutTicks) {
          CustomerSystem.pay(ctx, front, counter);
          s.customers.splice(s.customers.indexOf(front), 1);
          counter.checkoutProgress = 0;
          ctx.emit({ type: "customer_left", tick: s.tick, customerId: front.id, paid: true });
        }
      } else {
        counter.checkoutProgress = 0;
      }
    }

    // Walkers advance; queued customers lose patience (same order as Kotlin).
    for (const c of s.customers) if (c.walkTicksLeft > 0) c.walkTicksLeft--;
    const leaving = s.customers.filter((c) => c.arrived && --c.patienceLeft <= 0);
    for (const c of leaving) {
      const counter = s.counters.find((ct) => ct.counterId === c.counterId)!;
      CustomerSystem.releaseAll(c, counter);
      if (s.customers.find((x) => x.counterId === c.counterId && x.arrived) === c) counter.checkoutProgress = 0;
      s.customers.splice(s.customers.indexOf(c), 1);
      s.bumpStat(Stats.LOST_CUSTOMERS);
      ctx.emit({ type: "customer_left", tick: s.tick, customerId: c.id, paid: false });
    }
  },

  reserveTowardBasket(front: CustomerState, counter: CounterState, def: { products: string[] }): void {
    let need = front.wants - front.reserved;
    if (need <= 0) return;
    for (const [itemId] of counter.stock.contents()) {
      if (!def.products.includes(itemId)) continue;
      const take = Math.min(need, counter.stock.available(itemId));
      if (take > 0 && counter.stock.reserve(itemId, take)) {
        front.addReservation(itemId, take);
        need -= take;
        if (need === 0) return;
      }
    }
  },

  acceptedAvailable(counter: CounterState, def: { products: string[] }): number {
    let n = 0;
    for (const [itemId] of counter.stock.contents()) {
      if (def.products.includes(itemId)) n += counter.stock.available(itemId);
    }
    return n;
  },

  releaseAll(c: CustomerState, counter: CounterState): void {
    for (const [itemId, qty] of c.reservedItems) counter.stock.releaseReservation(itemId, qty);
    c.clearReservations();
  },

  pay(ctx: StepContext, c: CustomerState, counter: CounterState): void {
    const s = ctx.state;
    const items = [...c.reservedItems.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([item, quantity]) => ({ item, quantity }));
    let amount = 0;
    for (const [itemId, qty] of c.reservedItems) {
      const price = ctx.content.productsById.get(itemId)!.unitPrice;
      amount = SafeMath.add(amount, SafeMath.multiply(price, qty));
    }
    const saleId = s.newId("sale");
    s.coins = SafeMath.creditCoins(s.coins, amount);
    s.bumpStat(Stats.SALES);
    s.bumpStat(Stats.ITEMS_SOLD, c.reserved);
    s.bumpStat(Stats.REVENUE, amount);
    s.record({ id: saleId, type: "sale", coinDelta: amount, tick: s.tick, reference: c.id });
    for (const [itemId, qty] of c.reservedItems) counter.stock.takeReserved(itemId, qty);
    c.clearReservations();
    ctx.emit({ type: "sale_committed", tick: s.tick, saleId, customerId: c.id, items, coins: amount });
  },

  /** ceil(straight-line distance / speed), integer only. */
  walkTicks(from: PointMm, to: PointMm, mmPerTick: number): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = SafeMath.isqrt(dx * dx + dz * dz);
    return idiv(dist + mmPerTick - 1, mmPerTick);
  },

  spawn(ctx: StepContext): void {
    const s = ctx.state;
    if (++s.customerSpawnProgress < ctx.harbor.customerSpawnTicks) return;
    s.customerSpawnProgress = 0;
    const counterDef = ctx.harbor.counters.find((d) => s.customers.filter((c) => c.counterId === d.id).length < d.maxQueue);
    if (!counterDef) return;
    const types = ctx.content.customers;
    const type = types[s.rng.pickWeighted(types.map((t) => t.spawnWeight))]!;
    const wants = s.rng.nextInRange(type.basketMin, type.basketMax);
    const slot = queueSlot(counterDef, s.customers.filter((x) => x.counterId === counterDef.id).length);
    const c = new CustomerState(s.newId("customer"), type.id, counterDef.id, wants, type.patienceTicks,
      CustomerSystem.walkTicks(ctx.harbor.customerEntry, slot, ctx.harbor.customerWalkMmPerTick));
    s.customers.push(c);
    ctx.emit({ type: "customer_arrived", tick: s.tick, customerId: c.id, counterId: counterDef.id });
  },
};

// ---------------------------------------------------------------- progression/Progression.kt

export type Availability =
  | { kind: "owned" }
  | { kind: "locked"; reason: string }
  | { kind: "too_expensive"; missing: number }
  | { kind: "purchasable" };

export const UpgradeSystem = {
  availability(content: ContentPack, s: GameState, u: UpgradeDef): Availability {
    if (s.ownedUpgrades.has(u.id)) return { kind: "owned" };
    const missing = u.requires.find((r) => !s.ownedUpgrades.has(r) && !s.completedQuests.has(r));
    if (missing !== undefined) {
      const name = content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
      return { kind: "locked", reason: `Requires: ${name}` };
    }
    if (s.coins < u.cost) return { kind: "too_expensive", missing: u.cost - s.coins };
    return { kind: "purchasable" };
  },

  purchase(ctx: StepContext, upgradeId: string, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({ type: "upgrade_purchased", tick: s.tick, upgradeId, receipt: prior, replayed: true });
      return;
    }
    const u = ctx.content.upgradesById.get(upgradeId);
    const reject = (reason: string) => ctx.emit({ type: "purchase_rejected", tick: s.tick, upgradeId, requestId, reason });
    if (!u) return reject("Unknown upgrade");
    const a = UpgradeSystem.availability(ctx.content, s, u);
    switch (a.kind) {
      case "owned": return reject("Already owned");
      case "locked": return reject(a.reason);
      case "too_expensive": return reject(`Need ${a.missing} more coins`);
      case "purchasable": {
        s.coins -= u.cost;
        s.ownedUpgrades.add(u.id);
        UpgradeSystem.applyEffect(s, u.effect);
        s.bumpStat(Stats.UPGRADES_BOUGHT);
        const receipt: Receipt = { id: s.newId("receipt"), type: "upgrade", coinDelta: -u.cost, tick: s.tick, reference: requestId };
        s.purchaseReceipts.set(requestId, receipt);
        s.record(receipt);
        ctx.emit({ type: "upgrade_purchased", tick: s.tick, upgradeId: u.id, receipt, replayed: false });
        ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
      }
    }
  },

  applyEffect(s: GameState, effect: UpgradeEffect): void {
    if (effect.kind === "carry_capacity") {
      s.player.bag.capacityUnits = Math.max(s.player.bag.capacityUnits, effect.capacityUnits);
    } else if (effect.kind === "recipe_duration") {
      for (const m of s.machines) {
        if (m.machineId !== effect.machine) continue;
        const current = m.recipeDurations.get(effect.recipe);
        if (current === undefined || effect.durationTicks < current) m.recipeDurations.set(effect.recipe, effect.durationTicks);
      }
    } else {
      s.player.catchSpeedPermille = Math.max(s.player.catchSpeedPermille, effect.speedPermille);
    }
  },
};

export const ProgressionSystem = {
  step(ctx: StepContext): void {
    const s = ctx.state;
    for (const q of ctx.content.quests) {
      if (!s.completedQuests.has(q.id) && s.stat(q.goal.stat) >= q.goal.atLeast) {
        s.completedQuests.add(q.id);
        ctx.emit({ type: "quest_completed", tick: s.tick, questId: q.id });
      }
    }
    const step = ctx.content.tutorial[s.tutorialIndex];
    if (!step) return;
    const t = step.advanceOn;
    const done = t.kind === "enter_zone" ? s.player.zoneId === t.zone : s.stat(t.stat) >= t.atLeast;
    if (done) {
      s.tutorialIndex++;
      ctx.emit({ type: "tutorial_advanced", tick: s.tick, stepIndex: s.tutorialIndex });
    }
  },
};

/** workers/Workers.kt: not implemented yet (phase 3). */
export const WorkerSystem = {
  step(_ctx: StepContext): void {},
};

// ---------------------------------------------------------------- inventory/InvariantChecker.kt

export function invariantProblems(content: ContentPack, s: GameState): string[] {
  const p: string[] = [];
  const inventories = [s.player.bag, ...s.machines.flatMap((m) => [m.input, m.output]), ...s.counters.map((c) => c.stock)];
  for (const inv of inventories) {
    p.push(...inv.invariantProblems());
    for (const [item] of inv.contents()) if (!content.isKnownItem(item)) p.push(`${inv.id}: unknown item ${item}`);
  }
  if (s.coins < 0) p.push(`Negative coins ${s.coins}`);
  if (!Number.isSafeInteger(s.coins)) p.push("Coins outside safe range");
  for (const c of s.counters) {
    const claimedByItem = new Map<string, number>();
    for (const cust of s.customers.filter((x) => x.counterId === c.counterId)) {
      for (const [item, qty] of cust.reservedItems) {
        claimedByItem.set(item, (claimedByItem.get(item) ?? 0) + qty);
      }
    }
    for (const [item, qty] of c.stock.reservations()) {
      if (claimedByItem.get(item) !== qty) {
        p.push(`${c.counterId}: ${qty} reserved ${item} but customers claim ${claimedByItem.get(item) ?? 0}`);
      }
    }
    for (const [item, qty] of claimedByItem) {
      if (c.stock.reservedQuantity(item) !== qty) {
        p.push(`${c.counterId}: customers claim ${qty} ${item} but stock has ${c.stock.reservedQuantity(item)} reserved`);
      }
    }
  }
  for (const m of s.machines) {
    const b = m.activeBatch;
    if (b && !content.recipesById.has(b.recipeId)) p.push(`${m.stationId}: batch with unknown recipe ${b.recipeId}`);
    if (b && b.remainingTicks < 0) p.push(`${m.stationId}: negative remaining ticks`);
  }
  for (const u of s.ownedUpgrades) if (!content.upgradesById.has(u)) p.push(`Unknown owned upgrade ${u}`);
  return p;
}
