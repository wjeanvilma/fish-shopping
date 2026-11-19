/**
 * Extracted Finish 6.0 Phase 4 — economy spoil/wear + bank/loans.
 */
import type { ContentPack, HarborDef, ItemQuantity } from "../content";
import { bankProductById, bankProductRepayAmount, bankRepayAmount } from "../content";
import { compareStrings, idiv, SafeMath } from "../foundations";
import { Inventory } from "../inventory";
import { GameState, MachineState, Receipt, Stats } from "../state";
import { StepContext } from "./context";
import { ProductionSystem } from "./production";

export const EconomySystem = {
  unlocked(content: ContentPack, s: GameState): boolean {
    return content.economy.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.economy.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  wearUnlocked(content: ContentPack, s: GameState): boolean {
    return content.economy.wear.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  wearMissingRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.economy.wear.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  maintenanceCoinsPerStation(content: ContentPack, s: GameState, harbor: HarborDef): number {
    const harborDisc = harbor.specialization?.maintenanceDiscountPerStation ?? 0;
    return Math.max(
      0,
      content.economy.maintenanceCoinsPerStation - s.maintenanceDiscountPerStation - harborDisc,
    );
  },

  /**
   * Mean spoil tier of raw fish in the bag, as permille (tier×1000).
   * Empty bag → 2000 (neutral tier-2 baseline).
   */
  meanBagSpoilTierPermille(content: ContentPack, s: GameState): number {
    let weighted = 0;
    let units = 0;
    for (const [id, qty] of s.player.bag.contents()) {
      if (!content.speciesById.has(id) || qty <= 0) continue;
      weighted += EconomySystem.spoilTier(content, id) * qty;
      units += qty;
    }
    if (units <= 0) return 2000;
    return idiv(weighted * 1000, units);
  },

  /**
   * Finish 5.0 Phase 2 — bag spoil pressure from mean fish spoil tier.
   * 1000 = neutral (mean tier 2). Higher → shorter spoil period.
   */
  bagSpoilPressurePermille(content: ContentPack, s: GameState): number {
    const mean = EconomySystem.meanBagSpoilTierPermille(content, s);
    const delta = idiv(mean - 2000, 10);
    return Math.max(750, Math.min(1400, 1000 + delta));
  },

  bagFishSpoilPeriodTicks(content: ContentPack, s: GameState): number {
    const base = content.economy.bagFishSpoilPeriodTicks;
    const iced = idiv(SafeMath.multiply(base, s.bagSpoilPeriodMultPermille), 1000);
    const pressure = EconomySystem.bagSpoilPressurePermille(content, s);
    return Math.max(1, idiv(SafeMath.multiply(iced, 1000), pressure));
  },

  /** Ticks until the next bag fish spoil tick; null when spoilage inactive or bag empty of fish. */
  ticksUntilBagSpoil(content: ContentPack, s: GameState): number | null {
    if (!EconomySystem.unlocked(content, s)) return null;
    if (content.economy.bagFishSpoilUnits <= 0) return null;
    let fishUnits = 0;
    for (const [id, qty] of s.player.bag.contents()) {
      if (content.speciesById.has(id)) fishUnits += qty;
    }
    if (fishUnits <= 0) return null;
    const period = EconomySystem.bagFishSpoilPeriodTicks(content, s);
    return Math.max(0, period - s.bagSpoilAccrualTicks);
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

  isSlowed(m: MachineState, tick: number): boolean {
    return !m.broken && m.slowUntilTick > tick;
  },

  repairCost(content: ContentPack): number {
    return content.economy.wear.repairCoins;
  },

  needsRepair(m: MachineState, tick: number): boolean {
    return m.broken || EconomySystem.isSlowed(m, tick);
  },

  step(ctx: StepContext): void {
    if (!EconomySystem.unlocked(ctx.content, ctx.state)) return;
    accrueMaintenance(ctx);
    accrueCounterSpoil(ctx);
    accrueBagFishSpoil(ctx);
    accrueWear(ctx);
  },

  repair(ctx: StepContext, stationId: string, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      const machineId = s.machines.find((m) => m.stationId === stationId)?.machineId ?? "";
      ctx.emit({ type: "machine_repaired", tick: s.tick, stationId, machineId, receipt: prior, replayed: true });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "machine_repair_rejected", tick: s.tick, stationId, requestId, reason });
    };
    const m = s.machines.find((x) => x.stationId === stationId);
    if (!m) return reject("Unknown station");
    if (!EconomySystem.needsRepair(m, s.tick)) return reject("Nothing to repair");
    const cost = EconomySystem.repairCost(ctx.content);
    if (s.coins < cost) return reject(`Need ${cost - s.coins} more coins`);
    s.coins -= cost;
    m.broken = false;
    m.slowUntilTick = 0;
    s.bumpStat(Stats.MACHINES_REPAIRED);
    if (cost > 0) s.bumpStat(Stats.REPAIR_SPENT, cost);
    const receipt: Receipt = { id: s.newId("receipt"), type: "repair", coinDelta: -cost, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({ type: "machine_repaired", tick: s.tick, stationId: m.stationId, machineId: m.machineId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
  },
};

function accrueMaintenance(ctx: StepContext): void {
  const s = ctx.state;
  const eco = ctx.content.economy;
  const rate = EconomySystem.maintenanceCoinsPerStation(ctx.content, s, ctx.harbor);
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

function accrueWear(ctx: StepContext): void {
  if (!EconomySystem.wearUnlocked(ctx.content, ctx.state)) return;
  const s = ctx.state;
  const wear = ctx.content.economy.wear;
  if (wear.chancePermille <= 0) return;
  s.wearAccrualTicks++;
  if (s.wearAccrualTicks < wear.checkPeriodTicks) return;
  s.wearAccrualTicks = 0;
  const candidates = s.machines
    .filter((m) => {
      const st = ctx.harbor.stations.find((x) => x.id === m.stationId);
      if (!st) return false;
      return ProductionSystem.isUnlocked(st, s) && !m.broken && !EconomySystem.isSlowed(m, s.tick);
    })
    .sort((a, b) => compareStrings(a.stationId, b.stationId));
  if (candidates.length === 0) return;
  for (const m of candidates) {
    if (s.rng.nextBelow(1000) >= wear.chancePermille) continue;
    if (s.rng.nextBelow(1000) < wear.breakChancePermille) {
      m.broken = true;
      m.slowUntilTick = 0;
      s.bumpStat(Stats.MACHINES_BROKEN);
      ctx.emit({ type: "machine_broke", tick: s.tick, stationId: m.stationId, machineId: m.machineId });
    } else {
      m.slowUntilTick = s.tick + wear.slowDurationTicks;
      s.bumpStat(Stats.MACHINES_SLOWED);
      ctx.emit({
        type: "machine_slowed",
        tick: s.tick,
        stationId: m.stationId,
        machineId: m.machineId,
        untilTick: m.slowUntilTick,
      });
    }
  }
}

/**
 * Phase 26 pier bank: one short-term loan (interest baked into repay amount) and
 * player-set coin goals. Overdue loans auto-collect on a content period.
 */
export const BankSystem = {
  unlocked(content: ContentPack, s: GameState): boolean {
    return content.bank.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.bank.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? missing;
  },

  hasLoan(s: GameState): boolean {
    return s.loanOwed > 0;
  },

  overdue(s: GameState): boolean {
    return BankSystem.hasLoan(s) && s.tick >= s.loanDueTick;
  },

  ticksRemaining(s: GameState): number {
    if (!BankSystem.hasLoan(s)) return 0;
    return Math.max(0, Math.trunc(s.loanDueTick - s.tick));
  },

  repayAmount(content: ContentPack): number {
    return bankRepayAmount(content.bank);
  },

  productUnlocked(
    content: ContentPack,
    s: GameState,
    product: { requires?: string[] },
  ): boolean {
    return (product.requires ?? []).every(
      (it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it),
    );
  },

  productMissingRequirement(
    content: ContentPack,
    s: GameState,
    product: { requires?: string[] },
  ): string | null {
    const missing = (product.requires ?? []).find(
      (it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it),
    );
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? missing;
  },

  step(ctx: StepContext): void {
    BankSystem.checkCoinGoal(ctx);
    BankSystem.collectOverdue(ctx);
  },

  takeLoan(ctx: StepContext, requestId: string, productId: string | null = null): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({
        type: "loan_taken",
        tick: s.tick,
        principal: prior.coinDelta,
        owed: s.loanOwed,
        dueTick: s.loanDueTick,
        receipt: prior,
        replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "loan_rejected", tick: s.tick, requestId, reason });
    };
    if (!BankSystem.unlocked(ctx.content, s)) {
      reject(`Requires: ${BankSystem.missingRequirement(ctx.content, s)}`);
      return;
    }
    if (BankSystem.hasLoan(s)) {
      reject("Loan already outstanding");
      return;
    }
    const product = bankProductById(ctx.content.bank, productId);
    if (!product) {
      reject("Unknown loan product");
      return;
    }
    if (!BankSystem.productUnlocked(ctx.content, s, product)) {
      reject(`Requires: ${BankSystem.productMissingRequirement(ctx.content, s, product)}`);
      return;
    }
    const principal = product.principal;
    const owed = bankProductRepayAmount(product);
    s.coins = SafeMath.add(s.coins, principal);
    s.loanOwed = owed;
    s.loanDueTick = s.tick + product.termTicks;
    s.loanCollectionAccrualTicks = 0;
    s.bumpStat(Stats.LOANS_TAKEN);
    const interest = owed - principal;
    if (interest > 0) s.bumpStat(Stats.LOAN_INTEREST_ACCRUED, interest);
    const receipt: Receipt = { id: s.newId("receipt"), type: "loan", coinDelta: principal, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({
      type: "loan_taken",
      tick: s.tick,
      principal,
      owed,
      dueTick: s.loanDueTick,
      receipt,
      replayed: false,
    });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
  },

  repayLoan(ctx: StepContext, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({
        type: "loan_repaid",
        tick: s.tick,
        paid: -prior.coinDelta,
        remaining: s.loanOwed,
        receipt: prior,
        replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "loan_rejected", tick: s.tick, requestId, reason });
    };
    if (!BankSystem.hasLoan(s)) {
      reject("No loan to repay");
      return;
    }
    if (s.coins <= 0) {
      reject("Need coins to repay");
      return;
    }
    const paid = Math.min(s.loanOwed, s.coins);
    s.coins -= paid;
    s.loanOwed -= paid;
    if (s.loanOwed <= 0) {
      s.loanOwed = 0;
      s.loanDueTick = 0;
      s.loanCollectionAccrualTicks = 0;
    }
    s.bumpStat(Stats.LOAN_REPAID, paid);
    const receipt: Receipt = { id: s.newId("receipt"), type: "loan_repay", coinDelta: -paid, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({
      type: "loan_repaid",
      tick: s.tick,
      paid,
      remaining: s.loanOwed,
      receipt,
      replayed: false,
    });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
  },

  setCoinGoal(ctx: StepContext, amount: number): void {
    const s = ctx.state;
    if (amount < 0) return;
    if (amount !== 0 && !ctx.content.bank.goalPresets.includes(amount)) return;
    const target = amount;
    s.coinGoal = target;
    const alreadyMet = target > 0 && s.coins >= target;
    s.coinGoalCelebrated = alreadyMet;
    ctx.emit({ type: "coin_goal_set", tick: s.tick, amount: target });
    if (alreadyMet) {
      s.bumpStat(Stats.COIN_GOALS_REACHED);
      ctx.emit({ type: "coin_goal_reached", tick: s.tick, amount: target, coins: s.coins });
    }
  },

  checkCoinGoal(ctx: StepContext): void {
    const s = ctx.state;
    if (s.coinGoal <= 0 || s.coinGoalCelebrated) return;
    if (s.coins < s.coinGoal) return;
    s.coinGoalCelebrated = true;
    s.bumpStat(Stats.COIN_GOALS_REACHED);
    ctx.emit({ type: "coin_goal_reached", tick: s.tick, amount: s.coinGoal, coins: s.coins });
  },

  collectOverdue(ctx: StepContext): void {
    const s = ctx.state;
    if (!BankSystem.overdue(s)) {
      s.loanCollectionAccrualTicks = 0;
      return;
    }
    const period = ctx.content.bank.collectionPeriodTicks;
    s.loanCollectionAccrualTicks++;
    if (s.loanCollectionAccrualTicks < period) return;
    s.loanCollectionAccrualTicks = 0;
    if (s.coins <= 0 || s.loanOwed <= 0) return;
    const seized = Math.min(s.loanOwed, s.coins);
    s.coins -= seized;
    s.loanOwed -= seized;
    s.bumpStat(Stats.LOAN_COLLECTED, seized);
    if (s.loanOwed <= 0) {
      s.loanOwed = 0;
      s.loanDueTick = 0;
    }
    const receipt: Receipt = { id: s.newId("receipt"), type: "loan_collect", coinDelta: -seized, tick: s.tick, reference: "overdue" };
    s.record(receipt);
    ctx.emit({ type: "loan_collected", tick: s.tick, seized, remaining: s.loanOwed });
  },
};

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

