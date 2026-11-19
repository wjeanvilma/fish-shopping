/**
 * Extracted Finish 4.0 Phase 3 — customers / checkout / rushes.
 */
import type { ContentPack, CounterDef, HarborDef, PointMm, RushWindowDef } from "../content";
import { queueSlot } from "../content";
import { compareStrings, idiv, SafeMath } from "../foundations";
import { CounterState, CustomerState, GameState, Stats } from "../state";
import { systemsBridge } from "./bridge";
import { StepContext } from "./context";
import { FishingSystem } from "./fishing";
import { ReputationSystem } from "./progression";

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
      c.patienceLeft -= CustomerSystem.patienceDrain(ctx, c, counter, def, type.unmetPatienceDrainPermille);
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
    ctx: StepContext,
    c: CustomerState,
    counter: CounterState,
    def: { products: string[] },
    unmetDrainPermille: number,
  ): number {
    const pref = c.preferredProductId;
    let drain: number;
    if (!pref || c.wants - c.reserved <= 0) {
      drain = 1;
    } else {
      const prefAvailable = def.products.includes(pref) ? counter.stock.available(pref) : 0;
      drain = prefAvailable > 0 ? 1 : Math.max(1, idiv(unmetDrainPermille, 1000));
    }
    if (systemsBridge.workerGreeterOnDuty(ctx.content, ctx.state)) {
      const mult = ctx.content.staffProgression.roleBuffs.greeterPatienceDrainMultPermille;
      drain = Math.max(1, Math.trunc((drain * mult) / 1000));
    }
    return drain;
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
    const counterDef = ctx.harbor.counters.find((ct) => ct.id === counter.counterId)!;
    mult = idiv(mult * CustomerSystem.demandPriceMultPermille(ctx.content, s, ctx.harbor, counterDef, counter), 1000);
    mult = idiv(mult * s.prestigePriceBonusPermille, 1000);
    mult = idiv(mult * s.endgamePriceBonusPermille, 1000);
    const amount = idiv(base * mult, 1000);
    const saleId = s.newId("sale");
    s.coins = SafeMath.creditCoins(s.coins, amount);
    s.bumpStat(Stats.SALES);
    s.bumpStat(Stats.ITEMS_SOLD, c.reserved);
    s.bumpStat(Stats.REVENUE, amount);
    if (type.kind === "premium") s.bumpStat(Stats.PREMIUM_SALES);
    else if (type.kind === "bulk") s.bumpStat(Stats.BULK_SALES);
    else if (type.kind === "tourist") s.bumpStat(Stats.TOURIST_SALES);
    else if (type.kind === "wholesaler") s.bumpStat(Stats.WHOLESALER_SALES);
    else if (type.kind === "critic") s.bumpStat(Stats.CRITIC_SALES);
    else if (type.kind === "night_regular") s.bumpStat(Stats.NIGHT_SALES);
    if (!met) s.bumpStat(Stats.UNMET_PREFERENCE_SALES);
    systemsBridge.rivalNoteSaleOutcome(ctx, items);
    s.record({ id: saleId, type: "sale", coinDelta: amount, tick: s.tick, reference: c.id });
    for (const [itemId, qty] of c.reservedItems) counter.stock.takeReserved(itemId, qty);
    c.clearReservations();
    // Phase 16: on-duty cashier at this pad earns XP for the assist.
    const counterZone = ctx.harbor.counters.find((ct) => ct.id === counter.counterId)!.zone;
    const cashier = s.workers.find((w) => {
      const role = ctx.content.workersById.get(w.roleId)?.role;
      return role === "cashier" &&
        !w.busyWalking &&
        w.phase === "WORK" &&
        w.taskZoneId === counterZone;
    });
    if (cashier) systemsBridge.workerGrantXp(ctx, cashier, ctx.content.staffProgression.xpSaleAssisted);
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

  isUnlocked(def: { requiresUpgrade?: string | null }, state: GameState): boolean {
    return !def.requiresUpgrade || state.ownedUpgrades.has(def.requiresUpgrade);
  },

  spawn(ctx: StepContext): void {
    const s = ctx.state;
    const interval = CustomerSystem.spawnIntervalTicks(ctx.content, s, ctx.harbor);
    if (++s.customerSpawnProgress < interval) return;
    s.customerSpawnProgress = 0;
    const rush = CustomerSystem.activeRush(ctx.harbor, s.tick);
    const open = ctx.harbor.counters.filter((d) =>
      CustomerSystem.isUnlocked(d, s) &&
      s.customers.filter((c) => c.counterId === d.id).length < CustomerSystem.effectiveMaxQueue(d, rush));
    if (open.length === 0) return;
    const types = ctx.content.customers;
    const type = types[s.rng.pickWeighted(types.map((t) => CustomerSystem.effectiveSpawnWeight(ctx.content, s, ctx.harbor, t)))]!;
    const wants = s.rng.nextInRange(type.basketMin, type.basketMax);
    let preferredRoll: string | null = null;
    if (type.preferredProducts.length > 0) {
      const pick = type.preferredProducts[s.rng.pickWeighted(type.preferredProducts.map((p) => p.weight))]!;
      preferredRoll = pick.item;
    }
    const counterDef = CustomerSystem.pickCounter(open, type, preferredRoll, s);
    if (!counterDef) return;
    const preferred = preferredRoll && counterDef.products.includes(preferredRoll) ? preferredRoll : null;
    const slot = queueSlot(counterDef, s.customers.filter((x) => x.counterId === counterDef.id).length);
    const path = CustomerSystem.approachPath(ctx.harbor, slot);
    const patience = type.patienceTicks + systemsBridge.decorPatienceBonusTicks(ctx.content, s);
    const c = new CustomerState(
      s.newId("customer"), type.id, counterDef.id, wants, patience,
      CustomerSystem.pathWalkTicks(path, ctx.harbor.customerWalkMmPerTick),
      preferred,
    );
    s.customers.push(c);
    ctx.emit({ type: "customer_arrived", tick: s.tick, customerId: c.id, counterId: counterDef.id });
  },

  /**
   * Choose an open unlocked counter: wholesalers prefer wholesale pads;
   * others prefer a pad that can sell their preferred SKU; then least queue.
   */
  pickCounter(
    open: CounterDef[],
    type: { kind: string },
    preferred: string | null,
    state: GameState,
  ): CounterDef | undefined {
    if (open.length === 0) return undefined;
    const matching = preferred ? open.filter((d) => d.products.includes(preferred)) : [];
    const wholesale = open.filter((d) => (d.kind ?? "retail") === "wholesale");
    let pool: CounterDef[];
    if (type.kind === "wholesaler" && matching.some((d) => (d.kind ?? "retail") === "wholesale")) {
      pool = matching.filter((d) => (d.kind ?? "retail") === "wholesale");
    } else if (type.kind === "wholesaler" && wholesale.length > 0) {
      pool = wholesale;
    } else if (matching.length > 0) {
      pool = matching;
    } else {
      pool = open;
    }
    return [...pool].sort((a, b) => {
      const qa = state.customers.filter((c) => c.counterId === a.id).length;
      const qb = state.customers.filter((c) => c.counterId === b.id).length;
      if (qa !== qb) return qa - qb;
      return compareStrings(a.id, b.id);
    })[0];
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

  /**
   * Base spawn weight scaled by day-part (Phase 11), reputation kind bias (Phase 13),
   * harbor specialization (Phase 22), and festival-only gating (Finish 2.0 Phase 16).
   */
  effectiveSpawnWeight(
    content: ContentPack,
    state: GameState,
    harbor: HarborDef,
    type: {
      id?: string;
      kind: string;
      spawnWeight: number;
      dayPartSpawnMultPermille?: Record<string, number>;
      requiresSeasonalEvent?: string | null;
    },
  ): number {
    const event = systemsBridge.seasonalActive(content, state.tick);
    const req = type.requiresSeasonalEvent;
    if (req && event?.id !== req) return 0;
    const part = FishingSystem.dayPartAt(content, state.tick);
    const dayMult = type.dayPartSpawnMultPermille?.[part.id] ?? 1000;
    const repMult = ReputationSystem.kindSpawnMultPermille(content, state, type.kind);
    const harborMult = harbor.specialization?.kindSpawnMultPermille?.[type.kind] ?? 1000;
    let weight = type.spawnWeight;
    weight = idiv(weight * dayMult, 1000);
    weight = idiv(weight * repMult, 1000);
    weight = idiv(weight * harborMult, 1000);
    if (event && type.id && (event.festivalCustomerIds ?? []).includes(type.id)) {
      weight = idiv(weight * 2000, 1000);
    }
    return Math.max(1, weight);
  },

  /** Soft rush price tip while a rush window is active (Phase 12). */
  rushPriceMultPermille(harbor: HarborDef, tick: number): number {
    return CustomerSystem.activeRush(harbor, tick)?.priceMultPermille ?? 1000;
  },

  /**
   * Soft scarcity tip from counter fill ratio vs economy.scarcityPriceCurvePermille.
   * Empty shelves land in band 0; a full counter lands in the last band.
   */
  scarcityPriceMultPermille(content: ContentPack, def: CounterDef, counter: CounterState): number {
    const curve = content.economy.scarcityPriceCurvePermille;
    if (curve.length === 0 || def.capacityUnits <= 0) return 1000;
    const used = Math.min(Math.max(0, counter.stock.usedUnits()), def.capacityUnits);
    const band = Math.min(curve.length - 1, idiv(used * curve.length, def.capacityUnits));
    return curve[band]!;
  },

  /** Soft harbor-rating tip from prestige.ratingPriceMultPermille (Phase 12). */
  ratingPriceMultPermille(content: ContentPack, state: GameState): number {
    const table = content.prestige.ratingPriceMultPermille;
    if (table.length === 0) return 1000;
    const stars = Math.min(table.length - 1, Math.max(0, systemsBridge.prestigeHarborRating(content, state)));
    return table[stars]!;
  },

  /** Combined ephemeral demand multiplier (rush × scarcity × rating × festival × rivals). */
  demandPriceMultPermille(
    content: ContentPack,
    state: GameState,
    harbor: HarborDef,
    def: CounterDef,
    counter: CounterState,
  ): number {
    let mult = 1000;
    mult = idiv(mult * CustomerSystem.rushPriceMultPermille(harbor, state.tick), 1000);
    mult = idiv(mult * CustomerSystem.scarcityPriceMultPermille(content, def, counter), 1000);
    mult = idiv(mult * CustomerSystem.ratingPriceMultPermille(content, state), 1000);
    mult = idiv(mult * systemsBridge.seasonalPriceMultPermille(content, state.tick), 1000);
    mult = idiv(mult * systemsBridge.rivalSalePriceMultPermille(content, state, harbor.id, def, counter), 1000);
    return Math.max(1, mult);
  },

  activeRush(harbor: HarborDef, tick: number): RushWindowDef | null {
    if (!harbor.rushes?.length || tick <= 0) return null;
    for (const r of harbor.rushes) {
      const phase = tick % r.periodTicks;
      if (phase >= r.startTick && phase < r.startTick + r.durationTicks) return r;
    }
    return null;
  },

  spawnIntervalTicks(content: ContentPack, state: GameState, harbor: HarborDef): number {
    const rush = CustomerSystem.activeRush(harbor, state.tick);
    let ticks = !rush
      ? harbor.customerSpawnTicks
      : Math.max(1, idiv(harbor.customerSpawnTicks * 1000, rush.spawnSpeedPermille));
    const crowd = systemsBridge.weatherCustomerSpawnMultPermille(content, state);
    ticks = Math.max(1, idiv(ticks * 1000, crowd));
    const festival = systemsBridge.seasonalCustomerSpawnMultPermille(content, state.tick);
    ticks = Math.max(1, idiv(ticks * 1000, festival));
    const rivalCrowd = systemsBridge.rivalCustomerSpawnMultPermille(content, state, harbor.id);
    return Math.max(1, idiv(ticks * 1000, rivalCrowd));
  },

  effectiveMaxQueue(def: { maxQueue: number }, rush: RushWindowDef | null): number {
    return def.maxQueue + (rush?.queueBonus ?? 0);
  },

  /**
   * Finish 5.0 Phase 3 — queue fill across unlocked counters (0..1000+).
   * 1000 = at effective max queue capacity; higher when oversubscribed.
   */
  serviceQueuePressurePermille(content: ContentPack, state: GameState, harbor: HarborDef): number {
    const rush = CustomerSystem.activeRush(harbor, state.tick);
    let capacity = 0;
    let queued = 0;
    for (const def of harbor.counters) {
      if (!CustomerSystem.isUnlocked(def, state)) continue;
      capacity += CustomerSystem.effectiveMaxQueue(def, rush);
      queued += state.customers.filter((c) => c.counterId === def.id && c.arrived).length;
    }
    if (capacity <= 0) return 0;
    return idiv(queued * 1000, capacity);
  },

  /** Lowest patience among arrived customers; null when none waiting. */
  minPatienceTicksLeft(state: GameState): number | null {
    let min: number | null = null;
    for (const c of state.customers) {
      if (!c.arrived) continue;
      if (min === null || c.patienceLeft < min) min = c.patienceLeft;
    }
    return min;
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

