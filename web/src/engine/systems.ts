/**
 * Per-tick systems. Each function mirrors the Kotlin object of the same name in game-core;
 * keep them line-for-line comparable so fixture mismatches are easy to trace.
 */
import type { ContentPack, ContractTemplateDef, HarborDef, ItemQuantity, PointMm, PrestigeMilestoneDef, QuestDef, RecipeDef, RushWindowDef, UpgradeDef, UpgradeEffect, WorkerDef } from "./content";
import { counterAccepts, queueSlot, rectCenterX, rectCenterZ, rectContains } from "./content";
import { INPUT_SCALE, SafeMath, TICKS_PER_SECOND, compareStrings, idiv } from "./foundations";
import { Inventory, Transfers } from "./inventory";
import { ContractState, CounterState, CustomerState, FishingSpotState, GameState, MachineState, PlayerState, Receipt, Stats, WorkerState, type ContractOffer, type GameEvent, type HarborWorldStash } from "./state";

export class StepContext {
  readonly events: GameEvent[] = [];
  constructor(readonly content: ContentPack, readonly state: GameState) {}
  /** Resolved each access so travel_to_harbor takes effect mid-tick. */
  get harbor(): HarborDef { return this.content.harbor(this.state.harborId); }
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
        if (!ProductionSystem.isUnlocked(station, s)) break;
        const m = s.machines.find((mm) => mm.stationId === station.id)!;
        const accepted = new Set(ctx.content.machinesById.get(m.machineId)!.recipes
          .flatMap((rid) => ctx.content.recipesById.get(rid)!.inputs.map((iq) => iq.item)));
        transferred(p.bag, m.input, Transfers.moveFirstAccepted(p.bag, m.input, (it) => accepted.has(it)), Stats.MACHINE_INPUTS);
        break;
      }
      case "machine_output": {
        const station = ctx.harbor.stations.find((st) => st.outputZone === zone.id)!;
        if (!ProductionSystem.isUnlocked(station, s)) break;
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

    if (!FishingSystem.isUnlocked(spotDef, s)) {
      FishingSystem.clearCast(p);
      p.reelRequested = false;
      return;
    }

    if (p.fishingSpecies === null) {
      if (spot.stock <= 0) { p.reelRequested = false; return; }
      const candidates = spotDef.species.map((id) => ctx.content.speciesById.get(id)!)
        .filter((sp) => p.bag.roomFor(sp.id) >= 1);
      if (candidates.length === 0) { p.reelRequested = false; return; }
      const pick = candidates[s.rng.pickWeighted(candidates.map((c) => c.rarityWeight))]!;
      p.fishingSpecies = pick.id;
      p.fishingProgress = 0;
      p.fishingCatchTicks = FishingSystem.catchTicksFor(FishingSystem.effectiveCatchSpeed(s), pick.catchTicks);
      p.reelAttemptedThisCast = false;
    }

    const species = ctx.content.speciesById.get(p.fishingSpecies)!;
    const duration = p.fishingCatchTicks > 0
      ? p.fishingCatchTicks
      : FishingSystem.catchTicksFor(FishingSystem.effectiveCatchSpeed(s), species.catchTicks);
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

  isUnlocked(def: { requiresUpgrade?: string | null }, state: GameState): boolean {
    return !def.requiresUpgrade || state.ownedUpgrades.has(def.requiresUpgrade);
  },

  /** Player upgrades and prestige floors both apply (whichever is faster). */
  effectiveCatchSpeed(state: GameState): number {
    return Math.max(state.player.catchSpeedPermille, state.prestigeCatchSpeedPermille);
  },

  catchTicksFor(catchSpeedPermille: number, baseCatchTicks: number): number {
    return Math.max(1, idiv(baseCatchTicks * 1000, catchSpeedPermille));
  },

  inTimingWindow(progress: number, duration: number, startPermille: number, endPermille: number): boolean {
    if (duration <= 0) return false;
    const permille = idiv(progress * 1000, duration);
    return permille >= startPermille && permille < endPermille;
  },

  curveMultPermille(curve: readonly number[], stock: number, stockMax: number): number {
    if (curve.length < 2) throw new Error("regenCurvePermille needs >= 2 entries");
    if (stockMax <= 0) return curve[0]!;
    const stockC = Math.max(0, Math.min(stock, stockMax));
    const t = idiv(stockC * 1000, stockMax);
    const last = curve.length - 1;
    const scaled = t * last;
    const i0 = Math.max(0, Math.min(idiv(scaled, 1000), last - 1));
    const frac = scaled % 1000;
    const a = curve[i0]!;
    const b = curve[i0 + 1]!;
    return a + idiv((b - a) * frac, 1000);
  },

  regenTicksFor(
    def: { stockMax: number; regenTicks: number; regenCurvePermille: readonly number[] },
    stock: number,
    fishRegenPermille: number,
  ): number {
    const mult = FishingSystem.curveMultPermille(def.regenCurvePermille, stock, def.stockMax);
    const base = idiv(def.regenTicks * mult, 1000);
    return Math.max(1, idiv(base * 1000, fishRegenPermille));
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
      if (spot.stock === 0) {
        ctx.emit({ type: "fishing_spot_depleted", tick: s.tick, zoneId });
      }
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
      const needed = FishingSystem.regenTicksFor(def, spot.stock, ctx.state.player.fishRegenPermille);
      if (++spot.regenProgress >= needed) {
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
  isUnlocked(def: { requiresUpgrade?: string | null }, state: GameState): boolean {
    return !def.requiresUpgrade || state.ownedUpgrades.has(def.requiresUpgrade);
  },

  stationDef(ctx: StepContext, stationId: string) {
    return ctx.harbor.stations.find((st) => st.id === stationId)!;
  },

  durationFor(m: MachineState, recipe: RecipeDef): number {
    return m.recipeDurations.get(recipe.id) ?? recipe.durationTicks;
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
    const duration = ProductionSystem.durationFor(m, startable);
    const next = { id: s.newId("batch"), recipeId: startable.id, durationTicks: duration, remainingTicks: duration, consumed: startable.inputs.map((i) => ({ ...i })) };
    m.activeBatch = next;
    m.status = "PROCESSING";
    ctx.emit({ type: "batch_started", tick: s.tick, batchId: next.id, stationId: m.stationId, recipeId: startable.id });
  },

  statusText(m: MachineState, content: ContentPack, lockedReason?: string | null): string {
    if (m.status === "LOCKED") {
      return lockedReason ?? "Locked — buy an upgrade";
    }
    switch (m.status) {
      case "WAITING_FOR_INPUT": return ProductionSystem.waitingText(m, content);
      case "PROCESSING": {
        const id = m.activeBatch?.recipeId;
        return id ? `Processing ${ProductionSystem.recipeLabel(id)}` : "Processing";
      }
      case "OUTPUT_FULL": return ProductionSystem.outputFullText(m, content);
      case "PAUSED": return "Paused";
      case "LOCKED": return lockedReason ?? "Locked — buy an upgrade";
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

// ---------------------------------------------------------------- customers/CustomerSystem.kt

export const CustomerSystem = {
  step(ctx: StepContext): void {
    CustomerSystem.announceRushTransitions(ctx);
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

      const availableAccepted = CustomerSystem.acceptedAvailable(front, counter, def);
      const basketReady = front.reserved > 0 &&
        (front.reserved === front.wants || availableAccepted === 0);
      const served = s.player.zoneId === def.zone || CustomerSystem.cashierCovering(ctx, def.zone);
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

    for (const c of s.customers) if (c.walkTicksLeft > 0) c.walkTicksLeft--;
    const leaving: CustomerState[] = [];
    for (const c of s.customers) {
      if (!c.arrived) continue;
      const counter = s.counters.find((ct) => ct.counterId === c.counterId)!;
      const def = ctx.harbor.counters.find((d) => d.id === c.counterId)!;
      const type = ctx.content.customersById.get(c.typeId)!;
      c.patienceLeft -= CustomerSystem.patienceDrain(c, counter, def, type.unmetPatienceDrainPermille);
      if (c.patienceLeft <= 0) leaving.push(c);
    }
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
    const pref = front.preferredProductId;
    if (pref && def.products.includes(pref)) {
      const take = Math.min(need, counter.stock.available(pref));
      if (take > 0 && counter.stock.reserve(pref, take)) {
        front.addReservation(pref, take);
        need -= take;
        if (need === 0) return;
      }
    }
    for (const [itemId] of counter.stock.contents()) {
      if (!def.products.includes(itemId) || itemId === pref) continue;
      const take = Math.min(need, counter.stock.available(itemId));
      if (take > 0 && counter.stock.reserve(itemId, take)) {
        front.addReservation(itemId, take);
        need -= take;
        if (need === 0) return;
      }
    }
  },

  acceptedAvailable(front: CustomerState, counter: CounterState, def: { products: string[] }): number {
    if (front.wants - front.reserved <= 0) return 0;
    let n = 0;
    for (const [itemId] of counter.stock.contents()) {
      if (def.products.includes(itemId)) n += counter.stock.available(itemId);
    }
    return n;
  },

  patienceDrain(
    c: CustomerState,
    counter: CounterState,
    def: { products: string[] },
    unmetDrainPermille: number,
  ): number {
    const pref = c.preferredProductId;
    if (!pref) return 1;
    if (c.wants - c.reserved <= 0) return 1;
    const prefAvailable = def.products.includes(pref) ? counter.stock.available(pref) : 0;
    if (prefAvailable > 0) return 1;
    return Math.max(1, idiv(unmetDrainPermille, 1000));
  },

  releaseAll(c: CustomerState, counter: CounterState): void {
    for (const [itemId, qty] of c.reservedItems) counter.stock.releaseReservation(itemId, qty);
    c.clearReservations();
  },

  pay(ctx: StepContext, c: CustomerState, counter: CounterState): void {
    const s = ctx.state;
    const type = ctx.content.customersById.get(c.typeId)!;
    const items = [...c.reservedItems.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([item, quantity]) => ({ item, quantity }));
    let base = 0;
    for (const [itemId, qty] of c.reservedItems) {
      const price = ctx.content.productsById.get(itemId)!.unitPrice;
      base = SafeMath.add(base, SafeMath.multiply(price, qty));
    }
    const met = c.preferenceMet();
    let mult = type.priceMultPermille;
    if (!met) mult = idiv(mult * type.unmetPriceMultPermille, 1000);
    mult = idiv(mult * s.prestigePriceBonusPermille, 1000);
    const amount = idiv(base * mult, 1000);
    const saleId = s.newId("sale");
    s.coins = SafeMath.creditCoins(s.coins, amount);
    s.bumpStat(Stats.SALES);
    s.bumpStat(Stats.ITEMS_SOLD, c.reserved);
    s.bumpStat(Stats.REVENUE, amount);
    if (type.kind === "premium") s.bumpStat(Stats.PREMIUM_SALES);
    if (type.kind === "bulk") s.bumpStat(Stats.BULK_SALES);
    if (!met) s.bumpStat(Stats.UNMET_PREFERENCE_SALES);
    s.record({ id: saleId, type: "sale", coinDelta: amount, tick: s.tick, reference: c.id });
    for (const [itemId, qty] of c.reservedItems) counter.stock.takeReserved(itemId, qty);
    c.clearReservations();
    ctx.emit({
      type: "sale_committed", tick: s.tick, saleId, customerId: c.id, items, coins: amount,
      customerTypeId: type.id, priceMultPermille: mult, preferenceMet: met,
      preferredProductId: c.preferredProductId,
    });
  },

  /** ceil(straight-line distance / speed), integer only. */
  walkTicks(from: PointMm, to: PointMm, mmPerTick: number): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = SafeMath.isqrt(dx * dx + dz * dz);
    return idiv(dist + mmPerTick - 1, mmPerTick);
  },

  /** Approach polyline: entry → harbor waypoints → destination. */
  approachPath(harbor: HarborDef, destination: PointMm): PointMm[] {
    return [harbor.customerEntry, ...(harbor.customerPathWaypoints ?? []), destination];
  },

  pathWalkTicks(path: PointMm[], mmPerTick: number): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += CustomerSystem.walkTicks(path[i]!, path[i + 1]!, mmPerTick);
    }
    return total;
  },

  /** Point along [path] after [elapsedTicks] of [totalTicks] (distance-weighted). */
  pointAlongPath(path: PointMm[], elapsedTicks: number, totalTicks: number): { x: number; z: number } {
    if (path.length === 0) return { x: 0, z: 0 };
    if (totalTicks <= 0 || elapsedTicks >= totalTicks) {
      const last = path[path.length - 1]!;
      return { x: last.x, z: last.z };
    }
    if (elapsedTicks <= 0) {
      const first = path[0]!;
      return { x: first.x, z: first.z };
    }
    const lengths: number[] = [];
    let totalLen = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!, b = path[i + 1]!;
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = SafeMath.isqrt(dx * dx + dz * dz);
      lengths.push(len);
      totalLen += len;
    }
    if (totalLen <= 0) {
      const last = path[path.length - 1]!;
      return { x: last.x, z: last.z };
    }
    let target = idiv(elapsedTicks * totalLen, totalTicks);
    for (let i = 0; i < lengths.length; i++) {
      const len = lengths[i]!;
      if (target <= len) {
        const a = path[i]!, b = path[i + 1]!;
        if (len === 0) return { x: a.x, z: a.z };
        return {
          x: a.x + idiv((b.x - a.x) * target, len),
          z: a.z + idiv((b.z - a.z) * target, len),
        };
      }
      target -= len;
    }
    const last = path[path.length - 1]!;
    return { x: last.x, z: last.z };
  },

  spawn(ctx: StepContext): void {
    const s = ctx.state;
    const interval = CustomerSystem.spawnIntervalTicks(ctx.harbor, s.tick);
    if (++s.customerSpawnProgress < interval) return;
    s.customerSpawnProgress = 0;
    const rush = CustomerSystem.activeRush(ctx.harbor, s.tick);
    const counterDef = ctx.harbor.counters.find((d) =>
      s.customers.filter((c) => c.counterId === d.id).length < CustomerSystem.effectiveMaxQueue(d, rush));
    if (!counterDef) return;
    const types = ctx.content.customers;
    const type = types[s.rng.pickWeighted(types.map((t) => t.spawnWeight))]!;
    const wants = s.rng.nextInRange(type.basketMin, type.basketMax);
    let preferred: string | null = null;
    if (type.preferredProducts.length > 0) {
      const pick = type.preferredProducts[s.rng.pickWeighted(type.preferredProducts.map((p) => p.weight))]!;
      preferred = counterDef.products.includes(pick.item) ? pick.item : null;
    }
    const slot = queueSlot(counterDef, s.customers.filter((x) => x.counterId === counterDef.id).length);
    const path = CustomerSystem.approachPath(ctx.harbor, slot);
    const c = new CustomerState(
      s.newId("customer"), type.id, counterDef.id, wants, type.patienceTicks,
      CustomerSystem.pathWalkTicks(path, ctx.harbor.customerWalkMmPerTick),
      preferred,
    );
    s.customers.push(c);
    ctx.emit({ type: "customer_arrived", tick: s.tick, customerId: c.id, counterId: counterDef.id });
  },

  /** True when a cashier is on duty at [counterZoneId] (arrived, not walking). */
  cashierCovering(ctx: StepContext, counterZoneId: string): boolean {
    return ctx.state.workers.some((w) => {
      const role = ctx.content.workersById.get(w.roleId)?.role;
      return role === "cashier" &&
        !w.busyWalking &&
        w.phase === "WORK" &&
        w.taskZoneId === counterZoneId;
    });
  },

  activeRush(harbor: HarborDef, tick: number): RushWindowDef | null {
    if (!harbor.rushes?.length || tick <= 0) return null;
    for (const r of harbor.rushes) {
      const phase = tick % r.periodTicks;
      if (phase >= r.startTick && phase < r.startTick + r.durationTicks) return r;
    }
    return null;
  },

  spawnIntervalTicks(harbor: HarborDef, tick: number): number {
    const rush = CustomerSystem.activeRush(harbor, tick);
    if (!rush) return harbor.customerSpawnTicks;
    return Math.max(1, idiv(harbor.customerSpawnTicks * 1000, rush.spawnSpeedPermille));
  },

  effectiveMaxQueue(def: { maxQueue: number }, rush: RushWindowDef | null): number {
    return def.maxQueue + (rush?.queueBonus ?? 0);
  },

  ticksRemaining(rush: RushWindowDef, tick: number): number {
    const phase = tick % rush.periodTicks;
    return Math.max(0, rush.startTick + rush.durationTicks - phase);
  },

  announceRushTransitions(ctx: StepContext): void {
    const s = ctx.state;
    const cur = CustomerSystem.activeRush(ctx.harbor, s.tick);
    const prev = s.tick <= 1 ? null : CustomerSystem.activeRush(ctx.harbor, s.tick - 1);
    if (prev?.id === cur?.id) return;
    if (prev) ctx.emit({ type: "rush_ended", tick: s.tick, rushId: prev.id, name: prev.name });
    if (cur) ctx.emit({ type: "rush_started", tick: s.tick, rushId: cur.id, name: cur.name });
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
    } else if (effect.kind === "catch_speed") {
      s.player.catchSpeedPermille = Math.max(s.player.catchSpeedPermille, effect.speedPermille);
    } else if (effect.kind === "fish_regen") {
      s.player.fishRegenPermille = Math.max(s.player.fishRegenPermille, effect.speedPermille);
    } else if (effect.kind === "worker_move_speed") {
      s.workerMoveSpeedPermille = Math.max(s.workerMoveSpeedPermille, effect.speedPermille);
    } else if (effect.kind === "worker_carry") {
      s.workerCarryCapacityFloor = Math.max(s.workerCarryCapacityFloor, effect.capacityUnits);
      for (const w of s.workers) {
        w.bag.capacityUnits = Math.max(w.bag.capacityUnits, s.workerCarryCapacityFloor);
      }
    } else if (effect.kind === "worker_catch_speed") {
      s.workerCatchSpeedPermille = Math.max(s.workerCatchSpeedPermille, effect.speedPermille);
    } else if (effect.kind === "worker_wage") {
      s.workerWagePerWorkerPerHour = Math.max(s.workerWagePerWorkerPerHour, effect.coinsPerWorkerPerHour);
    } else if (effect.kind === "maintenance_discount") {
      s.maintenanceDiscountPerStation = Math.max(s.maintenanceDiscountPerStation, effect.coinsOffPerStation);
    } else if (effect.kind === "bag_spoil_resist") {
      s.bagSpoilPeriodMultPermille = Math.max(s.bagSpoilPeriodMultPermille, effect.periodMultPermille);
    } else if (effect.kind === "counter_spoil_resist") {
      s.counterSpoilPeriodMultPermille = Math.max(s.counterSpoilPeriodMultPermille, effect.periodMultPermille);
    }
    // unlock_fishing_spot / unlock_machine are gated by ownedUpgrades in FishingSystem / ProductionSystem
  },
};

export const ProgressionSystem = {
  step(ctx: StepContext): void {
    const s = ctx.state;
    for (const q of ctx.content.quests) {
      if (s.completedQuests.has(q.id)) continue;
      if (!ProgressionSystem.requirementsMet(s, q)) continue;
      if (s.stat(q.goal.stat) < q.goal.atLeast) continue;
      completeQuest(ctx, q);
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

  requirementsMet(s: GameState, q: QuestDef): boolean {
    return q.requires.every((r) => s.ownedUpgrades.has(r) || s.completedQuests.has(r));
  },

  missingRequirement(content: ContentPack, s: GameState, q: QuestDef): string | null {
    const missing = q.requires.find((r) => !s.ownedUpgrades.has(r) && !s.completedQuests.has(r));
    if (!missing) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },
};

function completeQuest(ctx: StepContext, q: QuestDef): void {
  const s = ctx.state;
  s.completedQuests.add(q.id);
  s.bumpStat(Stats.QUESTS_COMPLETED);
  const reward = q.reward;
  if (reward.coins > 0) {
    s.coins = SafeMath.creditCoins(s.coins, reward.coins);
    const receipt: Receipt = { id: s.newId("quest"), type: "quest_reward", coinDelta: reward.coins, tick: s.tick, reference: q.id };
    s.record(receipt);
  }
  for (const uid of reward.unlockUpgrades) {
    const u = ctx.content.upgradesById.get(uid);
    if (!u) continue;
    s.ownedUpgrades.add(uid);
    UpgradeSystem.applyEffect(s, u.effect);
  }
  ctx.emit({
    type: "quest_completed", tick: s.tick, questId: q.id,
    coinsRewarded: reward.coins, unlockUpgrades: [...reward.unlockUpgrades],
  });
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "quest" });
}

/**
 * Prestige-lite (Phase 20): permanent milestone bonuses and cosmetics without wiping
 * the save. Effects are rebuilt from completedPrestige on load.
 */
export const PrestigeSystem = {
  boardUnlocked(content: ContentPack, s: GameState): boolean {
    return content.prestige.requires.every((it) =>
      s.ownedUpgrades.has(it) || s.completedQuests.has(it) || s.completedPrestige.has(it));
  },

  missingBoardRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.prestige.requires.find((it) =>
      !s.ownedUpgrades.has(it) && !s.completedQuests.has(it) && !s.completedPrestige.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? content.prestigeMilestonesById.get(missing)?.name
      ?? missing;
  },

  requirementsMet(s: GameState, m: PrestigeMilestoneDef): boolean {
    return m.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it) || s.completedPrestige.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState, m: PrestigeMilestoneDef): string | null {
    const missing = m.requires.find((it) =>
      !s.ownedUpgrades.has(it) && !s.completedQuests.has(it) && !s.completedPrestige.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? content.prestigeMilestonesById.get(missing)?.name
      ?? missing;
  },

  /** Harbor rating stars 0..5 from lifetime revenue vs content thresholds. */
  harborRating(content: ContentPack, s: GameState): number {
    const revenue = s.stat(Stats.REVENUE);
    let stars = 0;
    for (const threshold of content.prestige.ratingThresholds) {
      if (revenue >= threshold) stars++;
      else break;
    }
    return Math.max(0, Math.min(5, stars));
  },

  step(ctx: StepContext): void {
    if (!PrestigeSystem.boardUnlocked(ctx.content, ctx.state)) return;
    for (const m of ctx.content.prestige.milestones) {
      if (ctx.state.completedPrestige.has(m.id)) continue;
      if (!PrestigeSystem.requirementsMet(ctx.state, m)) continue;
      if (ctx.state.stat(m.goal.stat) < m.goal.atLeast) continue;
      completePrestige(ctx, m);
    }
  },

  applyReward(s: GameState, m: PrestigeMilestoneDef): void {
    const r = m.reward;
    if (r.catchSpeedPermille > 0) {
      s.prestigeCatchSpeedPermille = Math.max(s.prestigeCatchSpeedPermille, r.catchSpeedPermille);
    }
    if (r.priceBonusPermille > 0) {
      s.prestigePriceBonusPermille = Math.max(s.prestigePriceBonusPermille, r.priceBonusPermille);
    }
    if (r.cosmetic) s.unlockedCosmetics.add(r.cosmetic);
  },
};

function completePrestige(ctx: StepContext, m: PrestigeMilestoneDef): void {
  const s = ctx.state;
  s.completedPrestige.add(m.id);
  s.bumpStat(Stats.PRESTIGE_COMPLETED);
  const reward = m.reward;
  if (reward.coins > 0) {
    s.coins = SafeMath.creditCoins(s.coins, reward.coins);
    const receipt: Receipt = { id: s.newId("prestige"), type: "prestige_reward", coinDelta: reward.coins, tick: s.tick, reference: m.id };
    s.record(receipt);
  }
  PrestigeSystem.applyReward(s, m);
  ctx.emit({
    type: "prestige_unlocked",
    tick: s.tick,
    prestigeId: m.id,
    coinsRewarded: reward.coins,
    cosmetic: reward.cosmetic ?? null,
    catchSpeedPermille: reward.catchSpeedPermille,
    priceBonusPermille: reward.priceBonusPermille,
  });
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "prestige" });
}

// ---------------------------------------------------------------- contracts/Contracts.kt

/**
 * Timed delivery contracts (Phase 17).
 *
 * Board posts weighted offers after contracts.requires are met; accepting moves
 * an offer into active work. Deliver from the player bag; miss the deadline and pay
 * a penalty (capped by current coins).
 */
export const ContractSystem = {
  step(ctx: StepContext): void {
    expireDeadlines(ctx);
    maybeRefreshBoard(ctx);
  },

  boardUnlocked(content: ContentPack, s: GameState): boolean {
    return content.contracts.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingBoardRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.contracts.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  accept(ctx: StepContext, offerId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({ type: "contract_accepted", tick: s.tick, contractId: existing.reference, offerId, receipt: existing, replayed: true });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "contract_rejected", tick: s.tick, referenceId: offerId, requestId, reason });
    };
    if (!ContractSystem.boardUnlocked(ctx.content, s)) {
      reject(`Requires: ${ContractSystem.missingBoardRequirement(ctx.content, s)}`);
      return;
    }
    const offer = s.contractOffers.find((it) => it.id === offerId);
    if (!offer) {
      reject("Offer no longer available");
      return;
    }
    if (s.activeContracts.length >= ctx.content.contracts.maxActive) {
      reject(`Max ${ctx.content.contracts.maxActive} active contracts`);
      return;
    }
    for (let i = s.contractOffers.length - 1; i >= 0; i--) {
      if (s.contractOffers[i]!.id === offerId) s.contractOffers.splice(i, 1);
    }
    const contract = new ContractState(
      s.newId("job"),
      offer.templateId,
      offer.itemId,
      offer.quantity,
      0,
      s.tick + offer.durationTicks,
      offer.payout,
      offer.penalty,
    );
    s.activeContracts.push(contract);
    const receipt: Receipt = { id: s.newId("contract"), type: "contract_accept", coinDelta: 0, tick: s.tick, reference: contract.id };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "contract_accepted", tick: s.tick, contractId: contract.id, offerId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
  },

  deliver(ctx: StepContext, contractId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({
        type: "contract_delivered", tick: s.tick, contractId, count: 0,
        completed: existing.type === "contract_payout", receipt: existing, replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "contract_rejected", tick: s.tick, referenceId: contractId, requestId, reason });
    };
    const idx = s.activeContracts.findIndex((it) => it.id === contractId);
    if (idx < 0) {
      reject("Unknown contract");
      return;
    }
    const c = s.activeContracts[idx]!;
    const need = c.quantity - c.delivered;
    if (need <= 0) {
      reject("Already complete");
      return;
    }
    const have = s.player.bag.available(c.itemId);
    if (have <= 0) {
      reject(`Need ${ctx.content.itemName(c.itemId)} in your bag`);
      return;
    }
    const take = Math.min(need, have);
    s.player.bag.remove(c.itemId, take);
    c.delivered += take;
    s.bumpStat(Stats.CONTRACT_ITEMS_DELIVERED, take);
    if (c.delivered >= c.quantity) {
      s.activeContracts.splice(idx, 1);
      s.coins = SafeMath.creditCoins(s.coins, c.payout);
      s.bumpStat(Stats.CONTRACTS_COMPLETED);
      s.bumpStat(Stats.CONTRACT_REVENUE, c.payout);
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_payout", coinDelta: c.payout, tick: s.tick, reference: c.id };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "contract_delivered", tick: s.tick, contractId: c.id, count: take, completed: true, receipt, replayed: false });
      ctx.emit({ type: "contract_completed", tick: s.tick, contractId: c.id, templateId: c.templateId, payout: c.payout });
      ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
    } else {
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_deliver", coinDelta: 0, tick: s.tick, reference: `${contractId}:${take}` };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "contract_delivered", tick: s.tick, contractId: c.id, count: take, completed: false, receipt, replayed: false });
    }
  },
};

function expireDeadlines(ctx: StepContext): void {
  const s = ctx.state;
  const expired = s.activeContracts.filter((c) => s.tick >= c.deadlineTick);
  if (expired.length === 0) return;
  const drop = new Set(expired);
  for (let i = s.activeContracts.length - 1; i >= 0; i--) {
    if (drop.has(s.activeContracts[i]!)) s.activeContracts.splice(i, 1);
  }
  for (const c of expired) {
    const paid = Math.min(c.penalty, s.coins);
    if (paid > 0) {
      s.coins -= paid;
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_penalty", coinDelta: -paid, tick: s.tick, reference: c.id };
      s.record(receipt);
    }
    s.bumpStat(Stats.CONTRACTS_FAILED);
    ctx.emit({ type: "contract_failed", tick: s.tick, contractId: c.id, templateId: c.templateId, penaltyPaid: paid });
  }
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
}

function maybeRefreshBoard(ctx: StepContext): void {
  const s = ctx.state;
  if (!ContractSystem.boardUnlocked(ctx.content, s)) {
    s.contractOffers.length = 0;
    s.contractBoardRefreshAt = 0;
    return;
  }
  if (s.contractBoardRefreshAt === 0) {
    refreshOffers(ctx);
    return;
  }
  if (s.tick < s.contractBoardRefreshAt) return;
  refreshOffers(ctx);
}

function refreshOffers(ctx: StepContext): void {
  const s = ctx.state;
  const def = ctx.content.contracts;
  s.contractOffers.length = 0;
  const pool = [...def.templates];
  const slots = Math.min(def.boardSlots, pool.length);
  for (let n = 0; n < slots; n++) {
    if (pool.length === 0) continue;
    const idx = s.rng.pickWeighted(pool.map((t) => t.weight));
    const t = pool.splice(idx, 1)[0]!;
    s.contractOffers.push(offerFrom(s, t));
  }
  s.contractBoardRefreshAt = s.tick + def.refreshPeriodTicks;
  ctx.emit({ type: "contract_board_refreshed", tick: s.tick, offerIds: s.contractOffers.map((o) => o.id) });
}

// ---------------------------------------------------------------- economy/Economy.kt

/**
 * Soft economy sinks (Phase 19): station upkeep and counter/bag spoilage after
 * economy.requires are met. Accrual is ephemeral (not persisted), like wages.
 */
export const EconomySystem = {
  unlocked(content: ContentPack, s: GameState): boolean {
    return content.economy.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.economy.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  maintenanceCoinsPerStation(content: ContentPack, s: GameState): number {
    return Math.max(0, content.economy.maintenanceCoinsPerStation - s.maintenanceDiscountPerStation);
  },

  bagFishSpoilPeriodTicks(content: ContentPack, s: GameState): number {
    const base = content.economy.bagFishSpoilPeriodTicks;
    const scaled = idiv(SafeMath.multiply(base, s.bagSpoilPeriodMultPermille), 1000);
    return Math.max(1, scaled);
  },

  counterSpoilPeriodTicks(content: ContentPack, s: GameState): number {
    const base = content.economy.counterSpoilPeriodTicks;
    const scaled = idiv(SafeMath.multiply(base, s.counterSpoilPeriodMultPermille), 1000);
    return Math.max(1, scaled);
  },

  spoilTier(content: ContentPack, itemId: string): number {
    return content.productsById.get(itemId)?.spoilTier
      ?? content.speciesById.get(itemId)?.spoilTier
      ?? 2;
  },

  step(ctx: StepContext): void {
    if (!EconomySystem.unlocked(ctx.content, ctx.state)) return;
    accrueMaintenance(ctx);
    accrueCounterSpoil(ctx);
    accrueBagFishSpoil(ctx);
  },
};

function accrueMaintenance(ctx: StepContext): void {
  const s = ctx.state;
  const eco = ctx.content.economy;
  const rate = EconomySystem.maintenanceCoinsPerStation(ctx.content, s);
  if (rate <= 0 || eco.maintenancePeriodTicks <= 0) return;
  s.maintenanceAccrualTicks++;
  if (s.maintenanceAccrualTicks < eco.maintenancePeriodTicks) return;
  s.maintenanceAccrualTicks = 0;
  const stations = ctx.harbor.stations.filter((st) => ProductionSystem.isUnlocked(st, s)).length;
  if (stations <= 0) return;
  const cost = rate * stations;
  const paid = Math.min(cost, s.coins);
  if (paid <= 0) return;
  s.coins -= paid;
  s.bumpStat(Stats.MAINTENANCE_PAID, paid);
  const receipt: Receipt = { id: s.newId("maint"), type: "maintenance", coinDelta: -paid, tick: s.tick, reference: `stations:${stations}` };
  s.record(receipt);
  ctx.emit({ type: "maintenance_paid", tick: s.tick, stations, coins: paid });
}

function accrueCounterSpoil(ctx: StepContext): void {
  const s = ctx.state;
  const eco = ctx.content.economy;
  if (eco.counterSpoilUnits <= 0) return;
  s.counterSpoilAccrualTicks++;
  const period = EconomySystem.counterSpoilPeriodTicks(ctx.content, s);
  if (s.counterSpoilAccrualTicks < period) return;
  s.counterSpoilAccrualTicks = 0;
  const lost: ItemQuantity[] = [];
  let remaining = eco.counterSpoilUnits;
  const counters = [...s.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  for (const counter of counters) {
    if (remaining <= 0) break;
    remaining = removeSpoilUnits(counter.stock, remaining, true, ctx.content, lost);
  }
  if (lost.length === 0) return;
  const total = lost.reduce((sum, it) => sum + it.quantity, 0);
  s.bumpStat(Stats.ITEMS_SPOILED, total);
  ctx.emit({ type: "items_spoiled", tick: s.tick, location: "counter", items: [...lost] });
}

function accrueBagFishSpoil(ctx: StepContext): void {
  const s = ctx.state;
  const eco = ctx.content.economy;
  if (eco.bagFishSpoilUnits <= 0) return;
  s.bagSpoilAccrualTicks++;
  const period = EconomySystem.bagFishSpoilPeriodTicks(ctx.content, s);
  if (s.bagSpoilAccrualTicks < period) return;
  s.bagSpoilAccrualTicks = 0;
  const lost: ItemQuantity[] = [];
  removeSpoilUnits(s.player.bag, eco.bagFishSpoilUnits, false, ctx.content, lost);
  if (lost.length === 0) return;
  const total = lost.reduce((sum, it) => sum + it.quantity, 0);
  s.bumpStat(Stats.ITEMS_SPOILED, total);
  ctx.emit({ type: "items_spoiled", tick: s.tick, location: "bag", items: [...lost] });
}

/**
 * Removes up to [units] from [inv]. When [preferProducts] is true, only products;
 * otherwise only species (raw fish). Higher spoil tiers first, then sorted ids.
 */
function removeSpoilUnits(
  inv: Inventory,
  units: number,
  preferProducts: boolean,
  content: ContentPack,
  into: ItemQuantity[],
): number {
  let left = units;
  // Higher spoilTier first (fragile), then stable id order for parity.
  const ids = inv.contents()
    .map(([id]) => id)
    .filter((id) => (preferProducts ? content.productsById.has(id) : content.speciesById.has(id)))
    .sort((a, b) => {
      const tierCmp = EconomySystem.spoilTier(content, b) - EconomySystem.spoilTier(content, a);
      return tierCmp !== 0 ? tierCmp : compareStrings(a, b);
    });
  for (const id of ids) {
    if (left <= 0) break;
    const have = inv.available(id);
    if (have <= 0) continue;
    const take = Math.min(have, left);
    inv.remove(id, take);
    into.push({ item: id, quantity: take });
    left -= take;
  }
  return left;
}

function offerFrom(s: GameState, t: ContractTemplateDef): ContractOffer {
  return {
    id: s.newId("offer"),
    templateId: t.id,
    itemId: t.item,
    quantity: t.quantity,
    durationTicks: t.durationTicks,
    payout: t.payout,
    penalty: t.penalty,
  };
}

// ---------------------------------------------------------------- world/HarborTravel.kt

/**
 * Harbor map travel. Unlocks via HarborDef.requires; each visit stashes the
 * left-behind layout so machines, stock, customers, and staff resume on return.
 */
export const HarborTravelSystem = {
  unlocked(content: ContentPack, s: GameState, def: HarborDef): boolean {
    return def.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState, def: HarborDef): string | null {
    const missing = def.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  travel(ctx: StepContext, harborId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({
        type: "harbor_traveled", tick: s.tick, fromHarborId: existing.reference, toHarborId: harborId,
        receipt: existing, replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "travel_rejected", tick: s.tick, harborId, requestId, reason });
    };
    if (!ctx.content.harborsById.has(harborId)) {
      reject("Unknown harbor");
      return;
    }
    if (harborId === s.harborId) {
      reject("Already here");
      return;
    }
    const target = ctx.content.harbor(harborId);
    if (!HarborTravelSystem.unlocked(ctx.content, s, target)) {
      reject(`Requires: ${HarborTravelSystem.missingRequirement(ctx.content, s, target)}`);
      return;
    }

    const fromId = s.harborId;
    s.harborStashes.set(fromId, HarborTravelSystem.capture(s));
    const parked = s.harborStashes.get(harborId) ?? null;
    if (parked) s.harborStashes.delete(harborId);
    s.harborId = harborId;
    if (parked) HarborTravelSystem.restore(s, parked);
    else HarborTravelSystem.installFresh(ctx.content, s, target);
    clearTransientPlayer(s);

    const receipt: Receipt = { id: s.newId("travel"), type: "harbor_travel", coinDelta: 0, tick: s.tick, reference: harborId };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    s.bumpStat(Stats.HARBORS_TRAVELED);
    ctx.emit({ type: "harbor_traveled", tick: s.tick, fromHarborId: fromId, toHarborId: harborId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "travel" });
  },

  capture(s: GameState): HarborWorldStash {
    return {
      fishingSpots: s.fishingSpots,
      machines: s.machines,
      counters: s.counters,
      customers: s.customers.slice(),
      workers: s.workers.slice(),
      customerSpawnProgress: s.customerSpawnProgress,
      playerX: s.player.x,
      playerZ: s.player.z,
      playerFacingX: s.player.facingX,
      playerFacingZ: s.player.facingZ,
      playerZoneId: s.player.zoneId,
    };
  },

  restore(s: GameState, stash: HarborWorldStash): void {
    s.fishingSpots = stash.fishingSpots;
    s.machines = stash.machines;
    s.counters = stash.counters;
    s.customers.length = 0;
    s.customers.push(...stash.customers);
    s.workers.length = 0;
    s.workers.push(...stash.workers);
    s.customerSpawnProgress = stash.customerSpawnProgress;
    s.player.x = stash.playerX;
    s.player.z = stash.playerZ;
    s.player.facingX = stash.playerFacingX;
    s.player.facingZ = stash.playerFacingZ;
    s.player.zoneId = stash.playerZoneId;
  },

  installFresh(content: ContentPack, s: GameState, harbor: HarborDef): void {
    const units = content.carryUnits;
    s.fishingSpots = harbor.fishingSpots.map((f) => new FishingSpotState(f.zone, f.stockMax));
    s.machines = harbor.stations.map((st) => {
      const def = content.machinesById.get(st.machine)!;
      return new MachineState(
        st.id, st.machine,
        new Inventory(`inv.${st.id}.input`, def.inputCapacityUnits, units),
        new Inventory(`inv.${st.id}.output`, def.outputCapacityUnits, units),
      );
    });
    s.counters = harbor.counters.map((c) => new CounterState(c.id, new Inventory(`inv.${c.id}`, c.capacityUnits, units)));
    s.customers.length = 0;
    s.workers.length = 0;
    s.customerSpawnProgress = 0;
    s.player.x = harbor.playerSpawn.x;
    s.player.z = harbor.playerSpawn.z;
    s.player.zoneId = null;
  },
};

function clearTransientPlayer(s: GameState): void {
  const p = s.player;
  p.inputX = 0;
  p.inputZ = 0;
  p.transferCooldown = 0;
  p.fishingSpecies = null;
  p.fishingProgress = 0;
  p.fishingCatchTicks = 0;
  p.reelAttemptedThisCast = false;
  p.reelRequested = false;
}

// ---------------------------------------------------------------- workers/Workers.kt

export type WorkerHireAvailability =
  | { kind: "purchasable" }
  | { kind: "maxed" }
  | { kind: "too_expensive"; missing: number }
  | { kind: "locked"; reason: string };

const HIREABLE_ROLES = new Set(["fisher", "porter", "operator", "cashier", "supervisor"]);

export const WorkerSystem = {
  step(ctx: StepContext): void {
    accrueWages(ctx);
    for (const w of ctx.state.workers) {
      advanceWalk(w);
      if (w.transferCooldown > 0) w.transferCooldown--;
    }
    expireLeases(ctx);
    const ordered = [...ctx.state.workers].sort((a, b) => compareStrings(a.id, b.id));
    for (const w of ordered) {
      if (w.busyWalking) continue;
      const def = ctx.content.workersById.get(w.roleId);
      if (!def) continue;
      if (def.role === "fisher") stepFisher(ctx, w, def);
      else if (def.role === "porter") stepPorter(ctx, w, def);
      else if (def.role === "operator") stepOperator(ctx, w, def);
      else if (def.role === "cashier") stepCashier(ctx, w, def);
      else if (def.role === "supervisor") stepSupervisor(ctx, w, def);
    }
  },

  /** True when a supervisor has arrived at their post (not walking). */
  supervisorOnDuty(content: ContentPack, s: GameState): boolean {
    return s.workers.some((w) => {
      const role = content.workersById.get(w.roleId)?.role;
      return role === "supervisor" && !w.busyWalking && w.phase === "WORK";
    });
  },

  hire(ctx: StepContext, roleId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({ type: "worker_hired", tick: s.tick, roleId, receipt: existing, replayed: true });
      return;
    }
    const def = ctx.content.workersById.get(roleId);
    const reject = (reason: string) => ctx.emit({ type: "hire_rejected", tick: s.tick, roleId, requestId, reason });
    if (!def) return reject("Unknown worker");
    if (!HIREABLE_ROLES.has(def.role)) return reject("Role not hireable yet");
    const missing = missingRequirement(ctx.content, s, def);
    if (missing) return reject(`Requires: ${missing}`);
    const hired = s.workers.filter((w) => w.roleId === roleId).length;
    if (hired >= def.maxHired) return reject(`Max ${def.name}s hired`);
    if (s.coins < def.hireCost) return reject(`Need ${def.hireCost - s.coins} more coins`);
    s.coins -= def.hireCost;
    const spawn = ctx.harbor.customerEntry;
    const id = s.newId("worker");
    const w = new WorkerState(
      id, def.id, spawn.x, spawn.z,
      new Inventory(`inv.${id}.bag`, WorkerSystem.carryCapacity(s, def), ctx.content.carryUnits),
    );
    s.workers.push(w);
    s.bumpStat(Stats.WORKERS_HIRED);
    const receipt: Receipt = { id: s.newId("hire"), type: "hire", coinDelta: -def.hireCost, tick: s.tick, reference: w.id };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "worker_hired", tick: s.tick, roleId, receipt, replayed: false });
  },

  availability(content: ContentPack, s: GameState, def: WorkerDef): WorkerHireAvailability {
    if (!HIREABLE_ROLES.has(def.role)) return { kind: "locked", reason: "Coming soon" };
    const missing = missingRequirement(content, s, def);
    if (missing) return { kind: "locked", reason: `Requires: ${missing}` };
    const hired = s.workers.filter((w) => w.roleId === def.id).length;
    if (hired >= def.maxHired) return { kind: "maxed" };
    if (s.coins < def.hireCost) return { kind: "too_expensive", missing: def.hireCost - s.coins };
    return { kind: "purchasable" };
  },

  moveSpeed(s: GameState, def: WorkerDef): number {
    return Math.max(1, Math.trunc((def.moveSpeedMmPerTick * s.workerMoveSpeedPermille) / 1000));
  },

  catchSpeed(s: GameState, def: WorkerDef): number {
    return Math.max(def.catchSpeedPermille, s.workerCatchSpeedPermille);
  },

  carryCapacity(s: GameState, def: WorkerDef): number {
    return Math.max(def.carryCapacityUnits, s.workerCarryCapacityFloor);
  },

  walkTicks(fromX: number, fromZ: number, toX: number, toZ: number, mmPerTick: number): number {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = SafeMath.isqrt(dx * dx + dz * dz);
    if (dist === 0) return 0;
    return idiv(dist + mmPerTick - 1, mmPerTick);
  },
};

function missingRequirement(content: ContentPack, s: GameState, def: WorkerDef): string | null {
  const missing = def.requires.find((r) => !s.ownedUpgrades.has(r) && !s.completedQuests.has(r));
  if (!missing) return null;
  return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
}

function accrueWages(ctx: StepContext): void {
  const s = ctx.state;
  const rate = s.workerWagePerWorkerPerHour;
  if (rate <= 0 || s.workers.length === 0) return;
  s.workerWageAccrualTicks++;
  const hourTicks = 3600 * TICKS_PER_SECOND;
  if (s.workerWageAccrualTicks < hourTicks) return;
  s.workerWageAccrualTicks = 0;
  const n = s.workers.length;
  const cost = rate * n;
  const paid = Math.min(cost, s.coins);
  if (paid <= 0) return;
  s.coins -= paid;
  s.bumpStat(Stats.WAGES_PAID, paid);
  const receipt: Receipt = { id: s.newId("wage"), type: "wage", coinDelta: -paid, tick: s.tick, reference: `workers:${n}` };
  s.record(receipt);
  ctx.emit({ type: "wages_paid", tick: s.tick, workers: n, coins: paid });
}

function stepFisher(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignFisher(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      clearCast(w);
      break;
    case "WORK":
      fish(ctx, w, def);
      break;
    case "WALK_TO_DROP":
      w.phase = "DROP";
      break;
    case "DROP":
      dropToMachine(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignFisher(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findMachineInputForBag(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.state, def));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.machine.input.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const spot = findFishableSpot(ctx, w);
  if (!spot) return;
  const zone = zonePoint(ctx.harbor, spot.zoneId);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.state, def));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = spot.zoneId;
  w.taskId = ctx.state.newId("task");
}

function fish(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const zoneId = w.taskZoneId;
  if (zoneId === null) { clearTask(w); return; }
  const spotDef = ctx.harbor.fishingSpots.find((f) => f.zone === zoneId);
  if (!spotDef) { clearTask(w); return; }
  const spot = ctx.state.fishingSpots.find((f) => f.zoneId === zoneId)!;
  if (!FishingSystem.isUnlocked(spotDef, ctx.state) || spot.stock <= 0 || w.bag.freeUnits() === 0) {
    clearCast(w);
    if (!w.bag.isEmpty()) {
      const dest = findMachineInputForBag(ctx, w);
      if (dest) {
        startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.state, def));
        w.phase = "WALK_TO_DROP";
        w.taskDestInvId = dest.machine.input.id;
        w.taskZoneId = dest.zoneId;
        return;
      }
    }
    clearTask(w);
    return;
  }

  if (w.fishingSpecies === null) {
    const candidates = spotDef.species.map((id) => ctx.content.speciesById.get(id)!)
      .filter((sp) => w.bag.roomFor(sp.id) >= 1);
    if (candidates.length === 0) {
      clearTask(w);
      return;
    }
    const pick = candidates[ctx.state.rng.pickWeighted(candidates.map((c) => c.rarityWeight))]!;
    w.fishingSpecies = pick.id;
    w.fishingProgress = 0;
    w.fishingCatchTicks = FishingSystem.catchTicksFor(WorkerSystem.catchSpeed(ctx.state, def), pick.catchTicks);
  }

  const species = ctx.content.speciesById.get(w.fishingSpecies!)!;
  const duration = Math.max(1, w.fishingCatchTicks);
  w.fishingProgress++;
  if (w.fishingProgress < duration) return;

  if (w.bag.roomFor(species.id) >= 1 && spot.stock > 0) {
    w.bag.add(species.id, 1);
    spot.stock--;
    ctx.state.bumpStat(Stats.FISH_CAUGHT);
    ctx.state.bumpStat(Stats.WORKER_FISH_CAUGHT);
    ctx.emit({ type: "fish_caught", tick: ctx.state.tick, speciesId: species.id, zoneId, timingBonus: false, rareUpgrade: false });
    if (spot.stock === 0) ctx.emit({ type: "fishing_spot_depleted", tick: ctx.state.tick, zoneId });
  }
  clearCast(w);
  if (w.bag.freeUnits() === 0 || spot.stock <= 0) {
    const dest = findMachineInputForBag(ctx, w);
    if (dest) {
      startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.state, def));
      w.phase = "WALK_TO_DROP";
      w.taskDestInvId = dest.machine.input.id;
      w.taskZoneId = dest.zoneId;
    } else {
      clearTask(w);
    }
  }
}

function dropToMachine(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const destId = w.taskDestInvId;
  if (destId === null) { clearTask(w); return; }
  const machine = ctx.state.machines.find((m) => m.input.id === destId);
  if (!machine) { clearTask(w); return; }
  const accepted = acceptedInputs(ctx, machine.machineId);
  const moved = Transfers.moveFirstAccepted(w.bag, machine.input, (it) => accepted.has(it));
  if (moved !== null) {
    ctx.state.bumpStat(Stats.MACHINE_INPUTS);
    ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
    ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: w.bag.id, to: machine.input.id, itemId: moved, count: 1 });
    w.transferCooldown = def.transferIntervalTicks - 1;
  }
  if (w.bag.isEmpty() || moved === null) clearTask(w);
}

function stepPorter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignPorter(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "PICKUP";
      break;
    case "PICKUP":
      pickupHaul(ctx, w, def);
      break;
    case "WALK_TO_DROP":
      w.phase = "DROP";
      break;
    case "DROP":
      dropHaul(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignPorter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findCounterDrop(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.state, def));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.counter.stock.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const haul = findHaul(ctx, w);
  if (!haul) return;
  if (!haul.source.reserve(haul.itemId, 1)) return;
  w.taskId = ctx.state.newId("task");
  w.phase = "WALK_TO_WORK";
  w.taskSourceInvId = haul.source.id;
  w.taskDestInvId = haul.dest.id;
  w.taskItemId = haul.itemId;
  w.taskQuantity = 1;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
  w.taskZoneId = haul.sourceZoneId;
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.state, def));
}

function pickupHaul(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const sourceId = w.taskSourceInvId;
  const itemId = w.taskItemId;
  if (sourceId === null || itemId === null) { abortHaul(ctx, w); return; }
  const source = findInventory(ctx, sourceId);
  if (!source || source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
    abortHaul(ctx, w);
    return;
  }
  source.takeReserved(itemId, 1);
  w.bag.add(itemId, 1);
  w.transferCooldown = def.transferIntervalTicks - 1;
  ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED);
  ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
  ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: source.id, to: w.bag.id, itemId, count: 1 });
  const dest = findCounterDrop(ctx, w);
  if (!dest) {
    w.phase = "NONE";
    w.taskSourceInvId = null;
    w.taskItemId = null;
    w.leaseExpiresAt = 0;
    return;
  }
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.state, def));
  w.phase = "WALK_TO_DROP";
  w.taskDestInvId = dest.counter.stock.id;
  w.taskZoneId = dest.zoneId;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
}

function dropHaul(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const destId = w.taskDestInvId;
  if (destId === null) { clearTask(w); return; }
  const counter = ctx.state.counters.find((c) => c.stock.id === destId);
  if (!counter) { clearTask(w); return; }
  const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
  const moved = Transfers.moveFirstAccepted(w.bag, counter.stock, (it) => counterAccepts(cdef, it));
  if (moved !== null) {
    ctx.state.bumpStat(Stats.COUNTER_STOCKED);
    ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
    ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: w.bag.id, to: counter.stock.id, itemId: moved, count: 1 });
    w.transferCooldown = def.transferIntervalTicks - 1;
  }
  if (w.bag.isEmpty() || moved === null) clearTask(w);
}

function stepOperator(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignOperator(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "PICKUP";
      break;
    case "PICKUP":
      pickupMachineHaul(ctx, w, def);
      break;
    case "WALK_TO_DROP":
      w.phase = "DROP";
      break;
    case "DROP":
      dropToMachine(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignOperator(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findMachineInputForBag(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.state, def));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.machine.input.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const haul = findMachineHaul(ctx, w);
  if (!haul) return;
  if (!haul.source.reserve(haul.itemId, 1)) return;
  w.taskId = ctx.state.newId("task");
  w.phase = "WALK_TO_WORK";
  w.taskSourceInvId = haul.source.id;
  w.taskDestInvId = haul.dest.id;
  w.taskItemId = haul.itemId;
  w.taskQuantity = 1;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
  w.taskZoneId = haul.sourceZoneId;
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.state, def));
}

function pickupMachineHaul(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const sourceId = w.taskSourceInvId;
  const itemId = w.taskItemId;
  if (sourceId === null || itemId === null) { abortHaul(ctx, w); return; }
  const source = findInventory(ctx, sourceId);
  if (!source || source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
    abortHaul(ctx, w);
    return;
  }
  source.takeReserved(itemId, 1);
  w.bag.add(itemId, 1);
  w.transferCooldown = def.transferIntervalTicks - 1;
  ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED);
  ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
  ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: source.id, to: w.bag.id, itemId, count: 1 });
  const dest = findMachineInputForBag(ctx, w);
  if (!dest) {
    w.phase = "NONE";
    w.taskSourceInvId = null;
    w.taskItemId = null;
    w.leaseExpiresAt = 0;
    return;
  }
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.state, def));
  w.phase = "WALK_TO_DROP";
  w.taskDestInvId = dest.machine.input.id;
  w.taskZoneId = dest.zoneId;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
}

function stepCashier(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignCashier(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      break;
    case "WORK":
      break; // stay on duty at the counter
    default:
      clearTask(w);
      break;
  }
}

function assignCashier(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  const counter = counters[0];
  if (!counter) return;
  const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
  const zone = zonePoint(ctx.harbor, cdef.zone);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.state, def));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = cdef.zone;
  w.taskId = ctx.state.newId("task");
}

function stepSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignSupervisor(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      break;
    case "WORK":
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  const counter = counters[0];
  if (!counter) return;
  const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
  const zone = zonePoint(ctx.harbor, cdef.zone);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.state, def));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = cdef.zone;
  w.taskId = ctx.state.newId("task");
}

function expireLeases(ctx: StepContext): void {
  for (const w of ctx.state.workers) {
    if (w.leaseExpiresAt <= 0 || ctx.state.tick < w.leaseExpiresAt) continue;
    if (w.phase === "WALK_TO_WORK" || w.phase === "PICKUP") {
      const sourceId = w.taskSourceInvId;
      const itemId = w.taskItemId;
      if (sourceId !== null && itemId !== null) {
        const inv = findInventory(ctx, sourceId);
        if (inv && inv.reservedQuantity(itemId) > 0) inv.releaseReservation(itemId, 1);
      }
      ctx.state.bumpStat(Stats.LEASES_EXPIRED);
      ctx.emit({ type: "lease_expired", tick: ctx.state.tick, workerId: w.id, itemId, sourceInvId: sourceId });
      clearTask(w);
    } else {
      w.leaseExpiresAt = 0;
    }
  }
}

interface HaulOffer {
  source: Inventory;
  dest: Inventory;
  itemId: string;
  sourceX: number;
  sourceZ: number;
  sourceZoneId: string;
  score: number;
}

function findHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  const counter = ctx.state.counters[0];
  if (!counter) return null;
  const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
  const supervisor = WorkerSystem.supervisorOnDuty(ctx.content, ctx.state);
  let best: HaulOffer | null = null;
  for (const m of machinesByStation(ctx)) {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
    const zone = zonePoint(ctx.harbor, station.outputZone);
    for (const [itemId] of m.output.contents()) {
      if (!counterAccepts(cdef, itemId)) continue;
      if (m.output.available(itemId) < 1) continue;
      if (w.bag.roomFor(itemId) < 1) continue;
      if (!destHasRoom(ctx, counter.stock, itemId, w.id)) continue;
      if (!porterMayHaul(ctx, itemId, supervisor)) continue;
      const demand = counterDemand(ctx, counter, itemId);
      const score = scoreHaul(ctx, w, m.output, zone.x, zone.z, m.status === "OUTPUT_FULL" ? 50 : 0, demand);
      const offer: HaulOffer = {
        source: m.output, dest: counter.stock, itemId,
        sourceX: zone.x, sourceZ: zone.z, sourceZoneId: station.outputZone, score,
      };
      if (!best || betterHaul(offer, best)) best = offer;
    }
  }
  return best;
}

/** Intermediate haul: machine output → another machine's input (e.g. fillet → smoker). */
function findMachineHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  let best: HaulOffer | null = null;
  for (const src of machinesByStation(ctx)) {
    const srcStation = ctx.harbor.stations.find((s) => s.id === src.stationId)!;
    if (!ProductionSystem.isUnlocked(srcStation, ctx.state)) continue;
    const zone = zonePoint(ctx.harbor, srcStation.outputZone);
    for (const [itemId] of src.output.contents()) {
      if (src.output.available(itemId) < 1) continue;
      if (w.bag.roomFor(itemId) < 1) continue;
      for (const dst of machinesByStation(ctx)) {
        if (dst.stationId === src.stationId) continue;
        const dstStation = ctx.harbor.stations.find((s) => s.id === dst.stationId)!;
        if (!ProductionSystem.isUnlocked(dstStation, ctx.state)) continue;
        const accepted = acceptedInputs(ctx, dst.machineId);
        if (!accepted.has(itemId)) continue;
        if (!destHasRoom(ctx, dst.input, itemId, w.id)) continue;
        const demand = machineDemand(dst);
        const score = scoreHaul(ctx, w, src.output, zone.x, zone.z, src.status === "OUTPUT_FULL" ? 50 : 0, demand);
        const offer: HaulOffer = {
          source: src.output, dest: dst.input, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: srcStation.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) best = offer;
      }
    }
  }
  return best;
}

function findFishableSpot(ctx: StepContext, w: WorkerState) {
  let best: (typeof ctx.state.fishingSpots)[number] | null = null;
  let bestScore = -1;
  let bestZone = "";
  for (const spot of ctx.state.fishingSpots) {
    const def = ctx.harbor.fishingSpots.find((f) => f.zone === spot.zoneId)!;
    if (!FishingSystem.isUnlocked(def, ctx.state) || spot.stock <= 0) continue;
    if (!def.species.some((id) => w.bag.roomFor(id) >= 1)) continue;
    const zone = zonePoint(ctx.harbor, spot.zoneId);
    const distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
    const demand = def.species.filter((id) => w.bag.roomFor(id) >= 1 && machineHungryFor(ctx, id)).length;
    const score = spot.stock * 10 + demand * 40 + Math.max(0, 200 - distTicks);
    if (
      !best ||
      score > bestScore ||
      (score === bestScore && compareStrings(spot.zoneId, bestZone) > 0)
    ) {
      best = spot;
      bestScore = score;
      bestZone = spot.zoneId;
    }
  }
  return best;
}

function porterMayHaul(ctx: StepContext, itemId: string, supervisor: boolean): boolean {
  const machineWants = ctx.state.machines.some((m) => {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    return ProductionSystem.isUnlocked(station, ctx.state) &&
      acceptedInputs(ctx, m.machineId).has(itemId) && destHasRoom(ctx, m.input, itemId, "");
  });
  if (!machineWants) return true;
  if (!supervisor) return false;
  return counterDemandForItem(ctx, itemId) > 0;
}

function destHasRoom(ctx: StepContext, dest: Inventory, itemId: string, exceptWorkerId: string): boolean {
  return dest.roomFor(itemId) - pendingDestClaims(ctx, dest.id, itemId, exceptWorkerId) >= 1;
}

function pendingDestClaims(ctx: StepContext, destId: string, itemId: string, exceptWorkerId: string): number {
  let n = 0;
  for (const o of ctx.state.workers) {
    if (o.id === exceptWorkerId) continue;
    if (o.taskDestInvId !== destId) continue;
    if (o.phase === "WALK_TO_WORK" || o.phase === "PICKUP") {
      if (o.taskItemId === itemId) n += Math.max(1, o.taskQuantity);
    } else if (o.phase === "WALK_TO_DROP" || o.phase === "DROP" || o.phase === "NONE") {
      n += o.bag.quantity(itemId);
    }
  }
  return n;
}

function scoreHaul(
  ctx: StepContext,
  w: WorkerState,
  source: Inventory,
  sourceX: number,
  sourceZ: number,
  urgencyBonus: number,
  demand: number,
): number {
  const routing = ctx.content.routing;
  const fill = source.capacityUnits <= 0 ? 0
    : Math.min(100, Math.max(0, Math.trunc((source.usedUnits() * 100) / source.capacityUnits)));
  const urgency = fill + urgencyBonus;
  const distTicks = WorkerSystem.walkTicks(w.x, w.z, sourceX, sourceZ, 160);
  const distance = Math.max(0, 200 - distTicks);
  let demW = routing.demandWeight;
  if (WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)) {
    demW = Math.trunc((demW * routing.supervisorDemandBoostPermille) / 1000);
  }
  return routing.urgencyWeight * urgency + routing.distanceWeight * distance + demW * demand;
}

function betterHaul(a: HaulOffer, b: HaulOffer): boolean {
  if (a.score !== b.score) return a.score > b.score;
  const srcCmp = compareStrings(a.source.id, b.source.id);
  if (srcCmp !== 0) return srcCmp < 0;
  const destCmp = compareStrings(a.dest.id, b.dest.id);
  if (destCmp !== 0) return destCmp < 0;
  return compareStrings(a.itemId, b.itemId) < 0;
}

function counterDemand(ctx: StepContext, counter: CounterState, itemId: string): number {
  let d = 0;
  const waiting = ctx.state.customers.filter((c) => c.counterId === counter.counterId && c.arrived).length;
  d += waiting * 20;
  if (counter.stock.available(itemId) === 0) d += 40;
  d += ctx.state.customers.filter((c) =>
    c.counterId === counter.counterId && c.arrived && c.preferredProductId === itemId && !c.preferenceMet(),
  ).length * 30;
  return d;
}

function counterDemandForItem(ctx: StepContext, itemId: string): number {
  let best = 0;
  for (const c of ctx.state.counters) best = Math.max(best, counterDemand(ctx, c, itemId));
  return best;
}

function machineDemand(m: MachineState): number {
  let d = 0;
  if (m.status === "WAITING_FOR_INPUT") d += 40;
  if (m.input.isEmpty()) d += 20;
  return d;
}

function machineHungryFor(ctx: StepContext, itemId: string): boolean {
  return ctx.state.machines.some((m) => {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    return ProductionSystem.isUnlocked(station, ctx.state) &&
      acceptedInputs(ctx, m.machineId).has(itemId) && m.input.roomFor(itemId) >= 1;
  });
}

interface MachineDrop { machine: MachineState; x: number; z: number; zoneId: string }
interface CounterDrop { counter: CounterState; x: number; z: number; zoneId: string }

function findMachineInputForBag(ctx: StepContext, w: WorkerState): MachineDrop | null {
  for (const m of machinesByStation(ctx)) {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
    const accepted = acceptedInputs(ctx, m.machineId);
    const has = w.bag.contents().some(([item]) => accepted.has(item) && destHasRoom(ctx, m.input, item, w.id));
    if (!has) continue;
    const zone = zonePoint(ctx.harbor, station.inputZone);
    return { machine: m, x: zone.x, z: zone.z, zoneId: station.inputZone };
  }
  return null;
}

function findCounterDrop(ctx: StepContext, w: WorkerState): CounterDrop | null {
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  for (const c of counters) {
    const def = ctx.harbor.counters.find((d) => d.id === c.counterId)!;
    const has = w.bag.contents().some(([item]) => counterAccepts(def, item) && destHasRoom(ctx, c.stock, item, w.id));
    if (!has) continue;
    const zone = zonePoint(ctx.harbor, def.zone);
    return { counter: c, x: zone.x, z: zone.z, zoneId: def.zone };
  }
  return null;
}

function findInventory(ctx: StepContext, id: string): Inventory | null {
  for (const m of ctx.state.machines) {
    if (m.input.id === id) return m.input;
    if (m.output.id === id) return m.output;
  }
  for (const c of ctx.state.counters) if (c.stock.id === id) return c.stock;
  for (const w of ctx.state.workers) if (w.bag.id === id) return w.bag;
  if (ctx.state.player.bag.id === id) return ctx.state.player.bag;
  return null;
}

function abortHaul(ctx: StepContext, w: WorkerState): void {
  const sourceId = w.taskSourceInvId;
  const itemId = w.taskItemId;
  if (sourceId !== null && itemId !== null) {
    const inv = findInventory(ctx, sourceId);
    if (inv && inv.reservedQuantity(itemId) > 0) {
      inv.releaseReservation(itemId, Math.min(1, inv.reservedQuantity(itemId)));
    }
  }
  clearTask(w);
}

function clearTask(w: WorkerState): void {
  w.phase = "NONE";
  w.taskId = null;
  w.taskZoneId = null;
  w.taskSourceInvId = null;
  w.taskDestInvId = null;
  w.taskItemId = null;
  w.taskQuantity = 0;
  w.leaseExpiresAt = 0;
  clearCast(w);
}

function clearCast(w: WorkerState): void {
  w.fishingSpecies = null;
  w.fishingProgress = 0;
  w.fishingCatchTicks = 0;
}

function startWalk(w: WorkerState, toX: number, toZ: number, mmPerTick: number): void {
  w.walkFromX = w.x;
  w.walkFromZ = w.z;
  w.walkToX = toX;
  w.walkToZ = toZ;
  const ticks = WorkerSystem.walkTicks(w.x, w.z, toX, toZ, mmPerTick);
  w.walkTicksTotal = ticks;
  w.walkTicksLeft = ticks;
  if (ticks === 0) {
    w.x = toX;
    w.z = toZ;
  }
}

function advanceWalk(w: WorkerState): void {
  if (w.walkTicksLeft <= 0) return;
  w.walkTicksLeft--;
  const total = Math.max(1, w.walkTicksTotal);
  const elapsed = total - w.walkTicksLeft;
  w.x = w.walkFromX + idiv((w.walkToX - w.walkFromX) * elapsed, total);
  w.z = w.walkFromZ + idiv((w.walkToZ - w.walkFromZ) * elapsed, total);
  if (w.walkTicksLeft === 0) {
    w.x = w.walkToX;
    w.z = w.walkToZ;
  }
}

function machinesByStation(ctx: StepContext): MachineState[] {
  return [...ctx.state.machines].sort((a, b) => compareStrings(a.stationId, b.stationId));
}

function acceptedInputs(ctx: StepContext, machineId: string): Set<string> {
  const set = new Set<string>();
  const def = ctx.content.machinesById.get(machineId)!;
  for (const rid of def.recipes) {
    for (const iq of ctx.content.recipesById.get(rid)!.inputs) set.add(iq.item);
  }
  return set;
}

function zonePoint(harbor: HarborDef, zoneId: string): { x: number; z: number } {
  const zone = harbor.zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error(`Unknown zone ${zoneId}`);
  return { x: rectCenterX(zone), z: rectCenterZ(zone) };
}

// ---------------------------------------------------------------- inventory/InvariantChecker.kt

export function invariantProblems(content: ContentPack, s: GameState): string[] {
  const p: string[] = [];
  const inventories = [
    s.player.bag,
    ...s.machines.flatMap((m) => [m.input, m.output]),
    ...s.counters.map((c) => c.stock),
    ...s.workers.map((w) => w.bag),
  ];
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
    const claimedByItem = new Map<string, number>();
    for (const w of s.workers) {
      if (w.taskSourceInvId !== m.output.id) continue;
      const item = w.taskItemId;
      if (item === null) continue;
      if (w.phase !== "WALK_TO_WORK" && w.phase !== "PICKUP") continue;
      claimedByItem.set(item, (claimedByItem.get(item) ?? 0) + Math.max(1, w.taskQuantity));
    }
    for (const [item, qty] of m.output.reservations()) {
      if (claimedByItem.get(item) !== qty) {
        p.push(`${m.stationId}.output: ${qty} reserved ${item} but workers claim ${claimedByItem.get(item) ?? 0}`);
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
