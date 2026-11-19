/**
 * Extracted Finish 6.0 Phase 4 — workers / automation AI.
 */
import type { ContentPack, CounterDef, HarborDef, WorkerDef } from "../content";
import { counterAccepts, queueSlot, rectCenterX, rectCenterZ } from "../content";
import { compareStrings, idiv, SafeMath, TICKS_PER_SECOND } from "../foundations";
import { Inventory, Transfers } from "../inventory";
import {
  CounterState,
  GameState,
  MachineState,
  Receipt,
  Stats,
  WorkerState,
} from "../state";
import { systemsBridge } from "./bridge";
import { StepContext } from "./context";
import { CustomerSystem } from "./customers";
import { FishingSystem, TrophySystem } from "./fishing";
import { MovementSystem, TransferSystem } from "./movement";
import { ProductionSystem } from "./production";
import { StaffTreesSystem } from "./staffTrees";
import { WorkerDecisionHooks } from "./workerDecisionHooks";

// ---------------------------------------------------------------- workers/Workers.kt

export type WorkerHireAvailability =
  | { kind: "purchasable" }
  | { kind: "maxed" }
  | { kind: "too_expensive"; missing: number }
  | { kind: "locked"; reason: string };

/**
 * Finish 3.0 Phase 10 — every content-defined worker role is hireable.
 * The old `"Coming soon"` allowlist lock is retired; requirements/cost/caps remain.
 */
const HIREABLE_ROLES = new Set([
  "fisher", "porter", "operator", "cashier", "supervisor",
  "ice_runner", "smoker_specialist", "greeter",
]);

export const WorkerSystem = {
  step(ctx: StepContext): void {
    accrueWages(ctx);
    for (const w of ctx.state.workers) {
      if (!w.onShift) continue;
      advanceWalk(w);
      if (w.transferCooldown > 0) w.transferCooldown--;
    }
    expireLeases(ctx);
    const ordered = [...ctx.state.workers].sort((a, b) => compareStrings(a.id, b.id));
    for (const w of ordered) {
      if (!w.onShift || w.busyWalking) continue;
      const def = ctx.content.workersById.get(w.roleId);
      if (!def) continue;
      // Finish 5.0 Phase 20 — failure modes: recover from blocked idle.
      if (ctx.state.tick % 40 === 0) {
        const blocked = WorkerSystem.blockedReason(ctx.content, ctx.state, ctx.harbor, w);
        if (blocked) attemptFailureRecover(ctx, w, def, blocked);
      }
      if (def.role === "fisher") stepFisher(ctx, w, def);
      else if (def.role === "porter") stepPorter(ctx, w, def);
      else if (def.role === "operator") stepOperator(ctx, w, def);
      else if (def.role === "cashier") stepCashier(ctx, w, def);
      else if (def.role === "supervisor") stepSupervisor(ctx, w, def);
      else if (def.role === "ice_runner") stepIceRunner(ctx, w, def);
      else if (def.role === "smoker_specialist") stepSmokerSpecialist(ctx, w, def);
      else if (def.role === "greeter") stepGreeter(ctx, w, def);
    }
  },

  /** True when a supervisor has arrived at their post (on shift, not walking). */
  supervisorOnDuty(content: ContentPack, s: GameState): boolean {
    return s.workers.some((w) => {
      const role = content.workersById.get(w.roleId)?.role;
      return role === "supervisor" && w.onShift && !w.busyWalking && w.phase === "WORK";
    });
  },

  greeterOnDuty(content: ContentPack, s: GameState): boolean {
    return s.workers.some((w) => {
      const role = content.workersById.get(w.roleId)?.role;
      return role === "greeter" && w.onShift && !w.busyWalking && w.phase === "WORK";
    });
  },

  smokerSpecialistOnDuty(content: ContentPack, s: GameState, harbor: HarborDef): boolean {
    return s.workers.some((w) => {
      const role = content.workersById.get(w.roleId)?.role;
      if (role !== "smoker_specialist" || !w.onShift || w.busyWalking || w.phase !== "WORK") return false;
      const zoneId = w.taskZoneId;
      if (!zoneId) return false;
      return harbor.stations.some((st) =>
        st.machine.includes("smoker") && (st.inputZone === zoneId || st.outputZone === zoneId));
    });
  },

  /** Free standard-wage on-shift slots (base + supervisor bonus when posted). */
  freeOnShiftSlots(content: ContentPack, s: GameState): number {
    const shifts = content.staffProgression.shifts;
    let slots = shifts.baseOnShiftSlots;
    if (WorkerSystem.supervisorOnDuty(content, s)) slots += shifts.supervisorExtraSlots;
    return slots;
  },

  setShift(ctx: StepContext, workerId: string, onShift: boolean): void {
    const w = ctx.state.workers.find((x) => x.id === workerId);
    if (!w || w.onShift === onShift) return;
    w.onShift = onShift;
    if (!onShift) {
      abortHaul(ctx, w);
      w.walkTicksLeft = 0;
      w.walkTicksTotal = 0;
    }
    ctx.emit({ type: "worker_shift_changed", tick: ctx.state.tick, workerId: w.id, roleId: w.roleId, onShift });
  },

  /** Slot id for an assignable staff-gear upgrade, or null if not a loadout piece. */
  loadoutSlotFor(content: ContentPack, upgradeId: string): string | null {
    return content.staffProgression.loadouts.slots.find((s) => s.upgradeIds.includes(upgradeId))?.id ?? null;
  },

  assignableUpgradeIds(content: ContentPack): Set<string> {
    return new Set(content.staffProgression.loadouts.slots.flatMap((s) => s.upgradeIds));
  },

  /** Equip upgradeId onto workerId; moves it off any other worker first. */
  assignGear(ctx: StepContext, workerId: string, upgradeId: string): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w || !s.ownedUpgrades.has(upgradeId)) return;
    const slotId = WorkerSystem.loadoutSlotFor(ctx.content, upgradeId);
    if (!slotId) return;
    if (w.equipment[slotId] === upgradeId) return;
    for (const other of s.workers) {
      let changed = false;
      for (const [key, uid] of Object.entries(other.equipment)) {
        if (uid === upgradeId) {
          delete other.equipment[key];
          changed = true;
        }
      }
      if (other.id === w.id) {
        const prev = other.equipment[slotId];
        if (prev && prev !== upgradeId) {
          delete other.equipment[slotId];
          changed = true;
        }
      }
      if (changed && other.id !== w.id) refreshWorkerCarry(ctx.content, s, other);
    }
    w.equipment[slotId] = upgradeId;
    refreshWorkerCarry(ctx.content, s, w);
    ctx.emit({ type: "worker_gear_assigned", tick: s.tick, workerId: w.id, upgradeId, slotId });
  },

  unequipGear(ctx: StepContext, workerId: string, slotId: string): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) return;
    const upgradeId = w.equipment[slotId];
    if (!upgradeId) return;
    delete w.equipment[slotId];
    refreshWorkerCarry(ctx.content, s, w);
    ctx.emit({ type: "worker_gear_unequipped", tick: s.tick, workerId: w.id, upgradeId, slotId });
  },

  /**
   * Legacy saves applied staff boots/satchel/tackle as global floors. Phase 19 moves those
   * into per-worker equipment — auto-equip owned gear onto the first workers that can take it.
   */
  migrateLegacyGlobalGear(content: ContentPack, s: GameState): void {
    const assignable = WorkerSystem.assignableUpgradeIds(content);
    for (const upgradeId of content.upgrades.map((u) => u.id).filter((id) => assignable.has(id) && s.ownedUpgrades.has(id))) {
      if (s.workers.some((w) => Object.values(w.equipment).includes(upgradeId))) continue;
      const slotId = WorkerSystem.loadoutSlotFor(content, upgradeId);
      if (!slotId) continue;
      const target = s.workers.find((w) => !(slotId in w.equipment));
      if (!target) continue;
      target.equipment[slotId] = upgradeId;
    }
    s.workerMoveSpeedPermille = 1000;
    s.workerCatchSpeedPermille = 0;
    s.workerCarryCapacityFloor = 0;
  },

  gearBonuses(content: ContentPack, w: WorkerState): [number, number, number] {
    let move = 1000;
    let catchFloor = 0;
    let carryFloor = 0;
    for (const upgradeId of Object.values(w.equipment)) {
      const effect = content.upgradesById.get(upgradeId)?.effect;
      if (!effect) continue;
      if (effect.kind === "worker_move_speed") move = Math.trunc((move * effect.speedPermille) / 1000);
      else if (effect.kind === "worker_catch_speed") catchFloor = Math.max(catchFloor, effect.speedPermille);
      else if (effect.kind === "worker_carry") carryFloor = Math.max(carryFloor, effect.capacityUnits);
    }
    return [Math.max(1, move), catchFloor, carryFloor];
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
      new Inventory(`inv.${id}.bag`, def.carryCapacityUnits, ctx.content.carryUnits),
    );
    WorkerSystem.rollTraits(ctx, w);
    w.bag.capacityUnits = WorkerSystem.carryCapacity(ctx.content, s, def, w);
    s.workers.push(w);
    s.bumpStat(Stats.WORKERS_HIRED);
    const receipt: Receipt = { id: s.newId("hire"), type: "hire", coinDelta: -def.hireCost, tick: s.tick, reference: w.id };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "worker_hired", tick: s.tick, roleId, receipt, replayed: false });
  },

  /** Deterministic weighted trait picks without replacement. */
  rollTraits(ctx: StepContext, w: WorkerState): void {
    const prog = ctx.content.staffProgression;
    const pool = [...prog.traits];
    const n = Math.min(prog.traitsOnHire, pool.length);
    for (let i = 0; i < n; i++) {
      if (pool.length === 0) return;
      const pick = pool[ctx.state.rng.pickWeighted(pool.map((t) => t.weight))]!;
      w.traits.push(pick.id);
      for (let j = pool.length - 1; j >= 0; j--) {
        if (pool[j]!.id === pick.id) pool.splice(j, 1);
      }
    }
  },

  levelForXp(content: ContentPack, xp: number): number {
    const thresholds = content.staffProgression.xpThresholds;
    let level = 1;
    for (let i = 1; i < thresholds.length; i++) {
      if (xp >= thresholds[i]!) level = i + 1;
      else break;
    }
    return Math.min(Math.max(level, 1), content.staffProgression.maxLevel);
  },

  grantXp(ctx: StepContext, w: WorkerState, amount: number): void {
    if (amount <= 0) return;
    w.xp += amount;
    ctx.state.bumpStat(Stats.WORKER_XP, amount);
    const next = WorkerSystem.levelForXp(ctx.content, w.xp);
    if (next <= w.level) return;
    w.level = next;
    const def = ctx.content.workersById.get(w.roleId);
    if (!def) return;
    w.bag.capacityUnits = WorkerSystem.carryCapacity(ctx.content, ctx.state, def, w);
    ctx.state.bumpStat(Stats.WORKER_LEVEL_UPS);
    ctx.emit({ type: "worker_leveled_up", tick: ctx.state.tick, workerId: w.id, roleId: w.roleId, level: w.level });
  },

  /**
   * Why an on-shift worker is stuck idle (Phase 20). Null while walking, casting, or actively tasked.
   */
  blockedReason(content: ContentPack, s: GameState, harbor: HarborDef, w: WorkerState): string | null {
    if (!w.onShift) return "Off shift";
    if (w.busyWalking) return null;
    const def = content.workersById.get(w.roleId);
    if (!def) return null;
    if (w.phase !== "NONE" && w.phase !== "WORK") return null;
    if (w.phase === "WORK" && def.role !== "fisher") return null;
    if (def.role === "fisher" && w.fishingSpecies !== null) return null;
    if (def.role === "fisher") return fisherBlocked(content, s, harbor, w);
    if (def.role === "porter" || def.role === "ice_runner") return haulBlocked(content, s, harbor, true);
    if (def.role === "operator" || def.role === "smoker_specialist") return haulBlocked(content, s, harbor, false);
    return null;
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

  /** Finish 3.0 Phase 10 — count hire rows still showing the retired Coming soon lock. */
  countComingSoonReasons(content: ContentPack, s: GameState): number {
    return content.workers.reduce((n, def) => {
      const a = WorkerSystem.availability(content, s, def);
      return n + (a.kind === "locked" && a.reason === "Coming soon" ? 1 : 0);
    }, 0);
  },

  moveSpeed(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelMult = 1000 + prog.moveSpeedPermillePerLevel * Math.max(w.level - 1, 0);
    const [traitMove] = traitBonus(content, w);
    const [gearMove] = WorkerSystem.gearBonuses(content, w);
    let speed = def.moveSpeedMmPerTick;
    speed = Math.trunc((speed * gearMove) / 1000);
    speed = Math.trunc((speed * levelMult) / 1000);
    speed = Math.trunc((speed * traitMove) / 1000);
    speed = Math.trunc((speed * StaffTreesSystem.moveSpeedMultPermille(content, w)) / 1000);
    return Math.max(1, speed);
  },

  catchSpeed(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelMult = 1000 + prog.catchSpeedPermillePerLevel * Math.max(w.level - 1, 0);
    const [, traitCatch] = traitBonus(content, w);
    const [, gearCatch] = WorkerSystem.gearBonuses(content, w);
    let speed = Math.max(def.catchSpeedPermille, gearCatch);
    speed = Math.trunc((speed * levelMult) / 1000);
    speed = Math.trunc((speed * traitCatch) / 1000);
    speed = Math.trunc((speed * StaffTreesSystem.catchSpeedMultPermille(content, w)) / 1000);
    return Math.max(1, speed);
  },

  carryCapacity(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelBonus = prog.carryBonusEveryLevels <= 0
      ? 0
      : Math.trunc(Math.max(w.level - 1, 0) / prog.carryBonusEveryLevels);
    const [, , traitCarry] = traitBonus(content, w);
    const [, , gearCarry] = WorkerSystem.gearBonuses(content, w);
    return Math.max(def.carryCapacityUnits, gearCarry) + levelBonus + traitCarry
      + StaffTreesSystem.carryBonus(content, w);
  },

  transferInterval(content: ContentPack, def: WorkerDef, w: WorkerState): number {
    const mult = transferIntervalMult(content, w);
    return Math.max(1, Math.trunc((def.transferIntervalTicks * mult) / 1000));
  },

  walkTicks(fromX: number, fromZ: number, toX: number, toZ: number, mmPerTick: number): number {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = SafeMath.isqrt(dx * dx + dz * dz);
    if (dist === 0) return 0;
    return idiv(dist + mmPerTick - 1, mmPerTick);
  },
};

function traitBonus(content: ContentPack, w: WorkerState): [number, number, number] {
  let move = 1000;
  let catchSp = 1000;
  let carry = 0;
  for (const tid of w.traits) {
    const t = content.workerTraitsById.get(tid);
    if (!t) continue;
    move = Math.trunc((move * (t.moveSpeedPermille ?? 1000)) / 1000);
    catchSp = Math.trunc((catchSp * (t.catchSpeedPermille ?? 1000)) / 1000);
    carry += t.carryBonus ?? 0;
  }
  return [Math.max(1, move), Math.max(1, catchSp), carry];
}

function transferIntervalMult(content: ContentPack, w: WorkerState): number {
  let mult = 1000;
  for (const tid of w.traits) {
    const t = content.workerTraitsById.get(tid);
    if (!t) continue;
    mult = Math.trunc((mult * (t.transferIntervalMultPermille ?? 1000)) / 1000);
  }
  mult = Math.trunc((mult * StaffTreesSystem.transferIntervalMultPermille(content, w)) / 1000);
  return Math.max(1, mult);
}

function refreshWorkerCarry(content: ContentPack, s: GameState, w: WorkerState): void {
  const def = content.workersById.get(w.roleId);
  if (!def) return;
  w.bag.capacityUnits = WorkerSystem.carryCapacity(content, s, def, w);
}

function fisherBlocked(content: ContentPack, s: GameState, harbor: HarborDef, w: WorkerState): string | null {
  if (!w.bag.isEmpty()) {
    const canDrop = s.machines.some((m) => {
      const st = harbor.stations.find((x) => x.id === m.stationId);
      if (!st || !ProductionSystem.isUnlocked(st, s) || m.paused) return false;
      return [...w.bag.contents()].some(([item, qty]) => qty > 0 && m.input.roomFor(item) >= 1);
    });
    if (!canDrop) return "No path";
  }
  const unlocked = harbor.fishingSpots.filter((sp) => FishingSystem.isUnlocked(sp, s));
  if (unlocked.length === 0) return "No fishing spots";
  const stocked = unlocked.some((spot) => (s.fishingSpots.find((f) => f.zoneId === spot.zone)?.stock ?? 0) > 0);
  if (!stocked) return "Spots empty";
  if (w.bag.freeUnits() === 0) return "No path";
  return null;
}

function haulBlocked(content: ContentPack, s: GameState, harbor: HarborDef, counterHaul: boolean): string | null {
  const unlocked = s.machines.filter((m) => {
    const st = harbor.stations.find((x) => x.id === m.stationId);
    return !!st && ProductionSystem.isUnlocked(st, s) && !m.paused;
  });
  if (unlocked.some((m) => m.status === "OUTPUT_FULL")) return "Output full";
  const hasOutput = unlocked.some((m) => !m.output.isEmpty());
  if (counterHaul) {
    const counterRoom = s.counters.some((c) =>
      unlocked.some((m) => [...m.output.contents()].some(([item, qty]) => qty > 0 && c.stock.roomFor(item) >= 1)),
    );
    if (hasOutput && !counterRoom) return "No path";
    if (!hasOutput && unlocked.some((m) => m.status === "WAITING_FOR_INPUT")) return "No input";
    return null;
  }
  if (hasOutput) {
    const canFeed = unlocked.some((src) =>
      [...src.output.contents()].some(([item, qty]) =>
        qty > 0 && unlocked.some((dest) => dest.stationId !== src.stationId && dest.input.roomFor(item) >= 1),
      ),
    );
    if (!canFeed) return "No path";
  }
  if (!hasOutput && unlocked.some((m) => m.status === "WAITING_FOR_INPUT")) return "No input";
  return null;
}

/** Phase 20: rush idle ticker alerts for stations stuck waiting for input / output full. */
export const AutomationSystem = {
  step(ctx: StepContext): void {
    const rush = CustomerSystem.activeRush(ctx.harbor, ctx.state.tick);
    const alerts = ctx.content.automationAlerts;
    for (const m of ctx.state.machines) {
      const stDef = ctx.harbor.stations.find((x) => x.id === m.stationId);
      if (!stDef || !ProductionSystem.isUnlocked(stDef, ctx.state)) {
        m.idleTicks = 0;
        continue;
      }
      const idle = !m.paused && (m.status === "WAITING_FOR_INPUT" || m.status === "OUTPUT_FULL");
      if (!rush || !idle) {
        m.idleTicks = 0;
        continue;
      }
      m.idleTicks++;
      if (m.idleTicks < alerts.machineIdleTicksDuringRush) continue;
      const since = ctx.state.tick - m.lastIdleAlertTick;
      if (m.lastIdleAlertTick > 0 && since < alerts.alertCooldownTicks) continue;
      m.lastIdleAlertTick = ctx.state.tick;
      m.idleTicks = 0;
      const reason = m.status === "OUTPUT_FULL" ? "Output full" : "No input";
      ctx.emit({
        type: "machine_idle_alert",
        tick: ctx.state.tick,
        stationId: m.stationId,
        machineId: m.machineId,
        reason,
      });
    }
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
  const onShift = s.workers.filter((w) => w.onShift);
  if (rate <= 0 || onShift.length === 0) return;
  s.workerWageAccrualTicks++;
  const hourTicks = 3600 * TICKS_PER_SECOND;
  if (s.workerWageAccrualTicks < hourTicks) return;
  s.workerWageAccrualTicks = 0;
  const n = onShift.length;
  const free = WorkerSystem.freeOnShiftSlots(ctx.content, s);
  const otMult = ctx.content.staffProgression.shifts.overtimeWagePermille;
  let standard = 0;
  let overtime = 0;
  onShift.forEach((w, index) => {
    const base = Math.trunc((rate * StaffTreesSystem.wageMultPermille(ctx.content, w)) / 1000);
    if (index < free) standard += base;
    else overtime += Math.trunc((base * otMult) / 1000);
  });
  const cost = standard + overtime;
  const paid = Math.min(cost, s.coins);
  if (paid <= 0) return;
  s.coins -= paid;
  s.bumpStat(Stats.WAGES_PAID, paid);
  const overtimePaid = Math.min(overtime, paid);
  if (overtimePaid > 0) s.bumpStat(Stats.OVERTIME_WAGES, overtimePaid);
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

/** Finish 4.0 Phase 19 — trophy_cast treats rarityWeight ≤ this as rare. */
const TROPHY_CAST_RARE_WEIGHT_MAX = 20;

function assignFisher(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findMachineInputForBag(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.machine.input.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const spot = findFishableSpot(ctx, w);
  if (!spot) return;
  const zone = zonePoint(ctx.harbor, spot.zoneId);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
        startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
    // Finish 4.0 Phase 19 — trophy_cast biases weighted pick toward rare species.
    const trophyCast = StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.fisher.trophy_cast";
    const pick = candidates[ctx.state.rng.pickWeighted(
      candidates.map((c) => {
        const base = systemsBridge.seasonalScaledWeight(
          c.rarityWeight, ctx.content, ctx.state.tick, c.id, ctx.state.harborId,
        );
        return trophyCast ? Math.max(1, 120 - Math.min(119, base)) : base;
      }),
    )]!;
    w.fishingSpecies = pick.id;
    w.fishingProgress = 0;
    w.fishingCatchTicks = FishingSystem.catchTicksFor(WorkerSystem.catchSpeed(ctx.content, ctx.state, def, w), pick.catchTicks);
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
    ctx.state.recordSpeciesCatch(species.id);
    WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpFishCaught);
    // Finish 4.0 Phase 19 — trophy_cast rare landings.
    if (
      StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.fisher.trophy_cast" &&
      species.rarityWeight <= TROPHY_CAST_RARE_WEIGHT_MAX
    ) {
      ctx.state.bumpStat(Stats.FISHER_TROPHY_CASTS);
    }
    const { sizePermille, valueCoins, personalBest } = TrophySystem.record(ctx, species.id);
    ctx.emit({
      type: "fish_caught", tick: ctx.state.tick, speciesId: species.id, zoneId,
      timingBonus: false, rareUpgrade: false, sizePermille, valueCoins, personalBest,
    });
    if (spot.stock === 0) ctx.emit({ type: "fishing_spot_depleted", tick: ctx.state.tick, zoneId });
  }
  clearCast(w);
  if (w.bag.freeUnits() === 0 || spot.stock <= 0) {
    const dest = findMachineInputForBag(ctx, w);
    if (dest) {
      startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
    WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved);
    ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: w.bag.id, to: machine.input.id, itemId: moved, count: 1 });
    w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
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
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
  w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
  ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED);
  ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
  ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: source.id, to: w.bag.id, itemId, count: 1 });

  // Finish 4.0 Phase 19 — dock_relay chains another haul before dropping.
  if (StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.porter.dock_relay") {
    const next = findHaul(ctx, w);
    if (next && w.bag.roomFor(next.itemId) >= 1 && next.source.reserve(next.itemId, 1)) {
      w.phase = "WALK_TO_WORK";
      w.taskSourceInvId = next.source.id;
      w.taskDestInvId = next.dest.id;
      w.taskItemId = next.itemId;
      w.taskQuantity = 1;
      w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
      w.taskZoneId = next.sourceZoneId;
      startWalk(w, next.sourceX, next.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
      ctx.state.bumpStat(Stats.PORTER_RELAY_PICKUPS);
      return;
    }
  }

  const dest = findCounterDrop(ctx, w);
  if (!dest) {
    w.phase = "NONE";
    w.taskSourceInvId = null;
    w.taskItemId = null;
    w.leaseExpiresAt = 0;
    return;
  }
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
    WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved);
    ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: w.bag.id, to: counter.stock.id, itemId: moved, count: 1 });
    w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
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
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
  w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
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
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
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
    case "WORK": {
      // Re-route when another unlocked pad scores meaningfully higher (Phase 15).
      const best = bestCashierPost(ctx, w);
      if (best && best.zone !== w.taskZoneId) {
        const zone = zonePoint(ctx.harbor, best.zone);
        startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
        w.phase = "WALK_TO_WORK";
        w.taskZoneId = best.zone;
        w.taskId = ctx.state.newId("task");
      }
      break;
    }
    default:
      clearTask(w);
      break;
  }
}

function assignCashier(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const cdef = bestCashierPost(ctx, w);
  if (!cdef) return;
  const zone = zonePoint(ctx.harbor, cdef.zone);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = cdef.zone;
  w.taskId = ctx.state.newId("task");
  // Finish 4.0 Phase 19 — quick_till posts to the longest/impatient queue.
  if (StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.cashier.quick_till") {
    ctx.state.bumpStat(Stats.CASHIER_QUICK_TILLS);
  }
}

/** Score unlocked counters with routing weights; prefer uncovered busy pads (Phase 15). */
function bestCashierPost(ctx: StepContext, w: WorkerState): CounterDef | undefined {
  const covered = new Set(
    ctx.state.workers
      .filter((other) =>
        other.id !== w.id &&
        ctx.content.workersById.get(other.roleId)?.role === "cashier" &&
        (other.phase === "WORK" || other.phase === "WALK_TO_WORK"))
      .map((other) => other.taskZoneId)
      .filter((z): z is string => z !== null),
  );
  const quickTill = StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.cashier.quick_till";
  let best: CounterDef | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  let considered = 0;
  for (const cdef of [...ctx.harbor.counters].sort((a, b) => compareStrings(a.id, b.id))) {
    if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue;
    const counter = ctx.state.counters.find((c) => c.counterId === cdef.id)!;
    const zone = zonePoint(ctx.harbor, cdef.zone);
    const queued = ctx.state.customers.filter((c) => c.counterId === cdef.id && c.arrived);
    const waiting = queued.length;
    const impatient = queued.filter((c) => c.patienceLeft > 0 && c.patienceLeft <= 40).length;
    const urgency = waiting * 25 + (counter.stock.usedUnits() === 0 ? 0 : 10);
    const distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
    const distance = Math.max(0, 200 - distTicks);
    const demand = waiting * 20 + (counter.stock.usedUnits() === 0 ? 40 : 0);
    let score = scorePost(ctx, urgency, distance, demand);
    // Finish 4.0 Phase 19 — quick_till_queue prefers longest / impatient lines.
    if (quickTill) score += waiting * 40 + impatient * 25;
    if (covered.has(cdef.zone)) score -= 10_000;
    considered++;
    if (!best || score > bestScore || (score === bestScore && compareStrings(cdef.id, best.id) < 0)) {
      best = cdef;
      bestScore = score;
    }
  }
  WorkerDecisionHooks.record({
    workerId: w.id,
    role: "cashier",
    kind: "post",
    reason: !best ? "none_available" : quickTill ? "quick_till_queue" : "best_score",
    score: best ? bestScore : null,
    candidatesConsidered: considered,
    tick: ctx.state.tick,
  });
  return best;
}

function scorePost(ctx: StepContext, urgency: number, distance: number, demand: number): number {
  const routing = ctx.content.routing;
  let demW = routing.demandWeight;
  if (WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)) {
    demW = Math.trunc((demW * routing.supervisorDemandBoostPermille) / 1000);
  }
  return routing.urgencyWeight * urgency + routing.distanceWeight * distance + demW * demand;
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
      supervisorPatrol(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const post = bestSupervisorPost(ctx, w);
  if (!post) return;
  startWalk(w, post.x, post.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = post.zoneId;
  w.taskId = ctx.state.newId("task");
}

/** Finish 3.0 Phase 11 / Finish 5.0 Phase 20 — re-post toward busiest counter / distressed station. */
function supervisorPatrol(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const branchId = StaffTreesSystem.branchOf(ctx.content, w)?.id;
  const rushMarshal = branchId === "branch.supervisor.rush_marshal";
  const floorLead = branchId === "branch.supervisor.floor_lead" || rushMarshal;
  const inRush = CustomerSystem.activeRush(ctx.harbor, ctx.state.tick) != null;
  const interval = rushMarshal && inRush ? 40 : floorLead ? 60 : 90;
  if (ctx.state.tick % interval !== 0) return;
  const post = bestSupervisorPost(ctx, w);
  if (!post || post.zoneId === w.taskZoneId) return;
  startWalk(w, post.x, post.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = post.zoneId;
  w.taskId = ctx.state.newId("task");
  ctx.state.bumpStat(Stats.SUPERVISOR_PATROLS);
  if (rushMarshal) {
    ctx.state.bumpStat(Stats.SUPERVISOR_RUSH_MARSHALS);
    WorkerDecisionHooks.record({
      workerId: w.id,
      role: "supervisor",
      kind: "patrol",
      reason: "rush_marshal_patrol",
      score: interval,
      candidatesConsidered: 1,
      tick: ctx.state.tick,
    });
  }
}

function bestSupervisorPost(ctx: StepContext, w: WorkerState): { x: number; z: number; zoneId: string } | null {
  const branchId = StaffTreesSystem.branchOf(ctx.content, w)?.id;
  const rushMarshal = branchId === "branch.supervisor.rush_marshal";
  const floorLead = branchId === "branch.supervisor.floor_lead" || rushMarshal;
  if (floorLead) {
    let best: { x: number; z: number; zoneId: string; score: number } | null = null;
    for (const m of ctx.state.machines) {
      const station = ctx.harbor.stations.find((s) => s.id === m.stationId);
      if (!station || !ProductionSystem.isUnlocked(station, ctx.state) || m.paused) continue;
      let score = 0;
      if (m.status === "OUTPUT_FULL") score += 80;
      if (m.status === "WAITING_FOR_INPUT") score += 60;
      if (m.broken) score += rushMarshal ? 80 : 40;
      if (score <= 0) continue;
      const zone = zonePoint(ctx.harbor, station.outputZone);
      const dist = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
      score += Math.max(0, 40 - Math.trunc(dist / 5));
      if (!best || score > best.score || (score === best.score && compareStrings(station.outputZone, best.zoneId) < 0)) {
        best = { x: zone.x, z: zone.z, zoneId: station.outputZone, score };
      }
    }
    if (best) return { x: best.x, z: best.z, zoneId: best.zoneId };
  }
  const cdef = bestCashierPost(ctx, w);
  if (!cdef) return null;
  const zone = zonePoint(ctx.harbor, cdef.zone);
  return { x: zone.x, z: zone.z, zoneId: cdef.zone };
}

function stepIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE": assignIceRunner(ctx, w, def); break;
    case "WALK_TO_WORK": w.phase = "PICKUP"; break;
    case "PICKUP": pickupIceRunner(ctx, w, def); break;
    case "WALK_TO_DROP": w.phase = "DROP"; break;
    case "DROP": dropHaul(ctx, w, def); break;
    default: clearTask(w); break;
  }
}

/** Finish 3.0 Phase 11 / Finish 6.0 Phase 16 — chill_haul / nest_chill chain fragile pickups. */
function pickupIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
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
  w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
  ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED);
  ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
  ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: source.id, to: w.bag.id, itemId, count: 1 });

  const branch = StaffTreesSystem.branchOf(ctx.content, w);
  const nestChill = branch?.id === "branch.ice_runner.nest_chill";
  const chillHaul = branch?.id === "branch.ice_runner.chill_haul" || nestChill;
  if (chillHaul) {
    const next = findIceHaul(ctx, w);
    if (next && w.bag.roomFor(next.itemId) >= 1 && next.source.reserve(next.itemId, 1)) {
      w.phase = "WALK_TO_WORK";
      w.taskSourceInvId = next.source.id;
      w.taskDestInvId = next.dest.id;
      w.taskItemId = next.itemId;
      w.taskQuantity = 1;
      w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
      w.taskZoneId = next.sourceZoneId;
      startWalk(w, next.sourceX, next.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
      ctx.state.bumpStat(Stats.ICE_RUNNER_MULTI_PICKUPS);
      if (nestChill) {
        ctx.state.bumpStat(Stats.ICE_RUNNER_NEST_CHILLS);
        WorkerDecisionHooks.record({
          workerId: w.id,
          role: "ice_runner",
          kind: "haul",
          reason: "nest_chill_chain",
          score: next.score,
          candidatesConsidered: 2,
          tick: ctx.state.tick,
        });
      }
      return;
    }
  }

  const dest = findCounterDrop(ctx, w);
  if (!dest) {
    w.phase = "NONE";
    w.taskSourceInvId = null;
    w.taskItemId = null;
    w.leaseExpiresAt = 0;
    return;
  }
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_DROP";
  w.taskDestInvId = dest.counter.stock.id;
  w.taskZoneId = dest.zoneId;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
}

function assignIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findCounterDrop(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.counter.stock.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const haul = findIceHaul(ctx, w);
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
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
}

function stepSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignSmokerSpecialist(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = w.taskSourceInvId !== null ? "PICKUP" : "WORK";
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
    case "WORK":
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const branchId = StaffTreesSystem.branchOf(ctx.content, w)?.id;
  const smokeQueue = branchId === "branch.smoker_specialist.smoke_queue";
  const kilnFocus =
    branchId === "branch.smoker_specialist.kiln_focus" || smokeQueue;
  if (!w.bag.isEmpty()) {
    const dest = findSmokerInputDrop(ctx, w) ?? (kilnFocus ? null : findMachineInputForBag(ctx, w));
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.machine.input.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    if (smokeQueue) ctx.state.bumpStat(Stats.SMOKER_QUEUE_FEEDS);
    return;
  }
  const haul = findSmokerHaul(ctx, w);
  if (haul) {
    if (!haul.source.reserve(haul.itemId, 1)) return;
    w.taskId = ctx.state.newId("task");
    w.phase = "WALK_TO_WORK";
    w.taskSourceInvId = haul.source.id;
    w.taskDestInvId = haul.dest.id;
    w.taskItemId = haul.itemId;
    w.taskQuantity = 1;
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
    w.taskZoneId = haul.sourceZoneId;
    startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    if (smokeQueue) {
      ctx.state.bumpStat(Stats.SMOKER_QUEUE_FEEDS);
      WorkerDecisionHooks.record({
        workerId: w.id,
        role: "smoker_specialist",
        kind: "haul",
        reason: "smoke_queue_feed",
        score: haul.score,
        candidatesConsidered: 1,
        tick: ctx.state.tick,
      });
    }
    return;
  }
  const post = smokerPost(ctx);
  if (!post) return;
  startWalk(w, post.x, post.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = post.zoneId;
  w.taskId = ctx.state.newId("task");
  w.taskSourceInvId = null;
  w.taskDestInvId = null;
  w.taskItemId = null;
}

function stepGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignGreeter(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      break;
    case "WORK":
      greeterWelcomePulse(ctx, w);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const entry = ctx.harbor.customerEntry;
  startWalk(w, entry.x, entry.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = "greeter.entry";
  w.taskId = ctx.state.newId("task");
}

/** Finish 3.0 Phase 11 / Finish 6.0 Phase 16 — welcome_desk / nest_host top-ups. */
function greeterWelcomePulse(ctx: StepContext, _w: WorkerState): void {
  const branch = StaffTreesSystem.branchOf(ctx.content, _w);
  const nestHost = branch?.id === "branch.greeter.nest_host";
  const desk = branch?.id === "branch.greeter.welcome_desk" || nestHost;
  const interval = nestHost ? 55 : desk ? 75 : 120;
  if (ctx.state.tick % interval !== 0) return;
  const boost = nestHost ? 70 : desk ? 55 : 35;
  const threshold = nestHost ? 125 : desk ? 110 : 90;
  let welcomed = 0;
  for (const c of ctx.state.customers) {
    if (!c.arrived || c.patienceLeft <= 0 || c.patienceLeft >= threshold) continue;
    c.patienceLeft += boost;
    welcomed++;
  }
  if (welcomed > 0) {
    ctx.state.bumpStat(Stats.GREETER_WELCOMES, welcomed);
    if (nestHost) {
      ctx.state.bumpStat(Stats.GREETER_NEST_HOSTS, welcomed);
      WorkerDecisionHooks.record({
        workerId: _w.id,
        role: "greeter",
        kind: "welcome",
        reason: "nest_host_welcome",
        score: interval,
        candidatesConsidered: welcomed,
        tick: ctx.state.tick,
      });
    }
  }
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

function isNestProduct(itemId: string): boolean {
  return itemId.includes("roast") || itemId.includes("ferment");
}

function findHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  const supervisor = WorkerSystem.supervisorOnDuty(ctx.content, ctx.state);
  const branchId = StaffTreesSystem.branchOf(ctx.content, w)?.id;
  const nestHaul = branchId === "branch.porter.nest_haul";
  const cargoSprint = branchId === "branch.porter.cargo_sprint" || nestHaul;
  let considered = 0;
  let best: HaulOffer | null = null;
  let bestFull = false;
  let bestNest = false;
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  for (const counter of counters) {
    const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
    if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue;
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
        const outputFull = m.status === "OUTPUT_FULL";
        const nestItem = isNestProduct(itemId);
        let urgency = outputFull ? 50 : 0;
        // Finish 4.0 Phase 19 — cargo_sprint_urgency clears jammed outputs first.
        if (cargoSprint && outputFull) urgency += 45;
        // Finish 6.0 Phase 16 — nest_haul_urgency prefers roast/ferment jammed lines.
        if (nestHaul && nestItem) urgency += 40;
        const score = scoreHaul(ctx, w, m.output, zone.x, zone.z, urgency, demand);
        considered++;
        const offer: HaulOffer = {
          source: m.output, dest: counter.stock, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: station.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) {
          best = offer;
          bestFull = outputFull;
          bestNest = nestItem;
        }
      }
    }
  }
  const reason = !best
    ? "none_available"
    : nestHaul && bestNest
      ? "nest_haul_urgency"
      : cargoSprint && bestFull
        ? "cargo_sprint_urgency"
        : branchId === "branch.porter.dock_relay"
          ? "dock_relay"
          : "best_score";
  if (reason === "nest_haul_urgency") ctx.state.bumpStat(Stats.PORTER_NEST_HAULS);
  WorkerDecisionHooks.record({
    workerId: w.id,
    role: "porter",
    kind: "haul",
    reason,
    score: best ? best.score : null,
    candidatesConsidered: considered,
    tick: ctx.state.tick,
  });
  return best;
}

function findIceHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  const supervisor = WorkerSystem.supervisorOnDuty(ctx.content, ctx.state);
  const buffs = ctx.content.staffProgression.roleBuffs;
  let best: HaulOffer | null = null;
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  for (const counter of counters) {
    const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
    if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue;
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
        let score = scoreHaul(ctx, w, m.output, zone.x, zone.z, m.status === "OUTPUT_FULL" ? 50 : 0, demand);
        score += icePreferBonus(ctx, itemId, buffs);
        const offer: HaulOffer = {
          source: m.output, dest: counter.stock, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: station.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) best = offer;
      }
    }
  }
  return best;
}

function icePreferBonus(
  ctx: StepContext,
  itemId: string,
  buffs: { iceRunnerFragileSpoilTierMin: number; iceRunnerSpoilScoreBonus: number },
): number {
  if (itemId === "product.ice_packed_crate") return buffs.iceRunnerSpoilScoreBonus;
  const tier = ctx.content.productsById.get(itemId)?.spoilTier
    ?? ctx.content.speciesById.get(itemId)?.spoilTier;
  if (tier === undefined) return 0;
  return tier >= buffs.iceRunnerFragileSpoilTierMin ? buffs.iceRunnerSpoilScoreBonus : 0;
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
        let score = scoreHaul(ctx, w, src.output, zone.x, zone.z, src.status === "OUTPUT_FULL" ? 50 : 0, demand);
        // Finish 3.0 Phase 11 / Finish 5.0 Phase 20 — pad_link / circuit_boss starving inputs.
        const opBranch = StaffTreesSystem.branchOf(ctx.content, w)?.id;
        const circuitBoss = opBranch === "branch.operator.circuit_boss";
        const padLink = opBranch === "branch.operator.pad_link" || circuitBoss;
        if (padLink && dst.status === "WAITING_FOR_INPUT") {
          score += circuitBoss ? 55 : 35;
        }
        if (circuitBoss && src.status === "OUTPUT_FULL" && dst.status === "WAITING_FOR_INPUT") {
          score += 40;
        }
        score += scheduleDaypartBoost(ctx, w, "operator");
        const offer: HaulOffer = {
          source: src.output, dest: dst.input, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: srcStation.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) best = offer;
      }
    }
  }
  if (
    best &&
    StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.operator.circuit_boss"
  ) {
    ctx.state.bumpStat(Stats.OPERATOR_CIRCUIT_LINKS);
    WorkerDecisionHooks.record({
      workerId: w.id,
      role: "operator",
      kind: "haul",
      reason: "circuit_boss_link",
      score: best.score,
      candidatesConsidered: 1,
      tick: ctx.state.tick,
    });
  }
  return best;
}

function findFishableSpot(ctx: StepContext, w: WorkerState) {
  const branchId = StaffTreesSystem.branchOf(ctx.content, w)?.id;
  const trophyCast = branchId === "branch.fisher.trophy_cast";
  const linePro = branchId === "branch.fisher.line_pro";
  let best: (typeof ctx.state.fishingSpots)[number] | null = null;
  let bestScore = -1;
  let bestZone = "";
  let considered = 0;
  for (const spot of ctx.state.fishingSpots) {
    const def = ctx.harbor.fishingSpots.find((f) => f.zone === spot.zoneId)!;
    if (!FishingSystem.isUnlocked(def, ctx.state) || spot.stock <= 0) continue;
    if (!def.species.some((id) => w.bag.roomFor(id) >= 1)) continue;
    const zone = zonePoint(ctx.harbor, spot.zoneId);
    const distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
    const demand = def.species.filter((id) => w.bag.roomFor(id) >= 1 && machineHungryFor(ctx, id)).length;
    let score = spot.stock * 10 + demand * 40 + Math.max(0, 200 - distTicks);
    // Finish 4.0 Phase 19 — line_pro_stock / trophy_cast_bias spot scoring.
    if (linePro) score += spot.stock * 15;
    if (trophyCast) {
      const rareBias = def.species.filter((id) => {
        if (w.bag.roomFor(id) < 1) return false;
        return (ctx.content.speciesById.get(id)?.rarityWeight ?? 100) <= TROPHY_CAST_RARE_WEIGHT_MAX;
      }).length;
      score += rareBias * 55;
    }
    const schedBoost = scheduleDaypartBoost(ctx, w, "fisher");
    score += schedBoost;
    considered++;
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
  const nestEmberBoosted =
    StaffTreesSystem.scheduleOf(ctx.content, w)?.id === "schedule.nest_ember" &&
    scheduleDaypartBoost(ctx, w, "fisher") > 0;
  const schedBoosted = scheduleDaypartBoost(ctx, w, "fisher") > 0;
  WorkerDecisionHooks.record({
    workerId: w.id,
    role: "fisher",
    kind: "spot",
    reason: !best
      ? "none_available"
      : nestEmberBoosted
        ? "schedule_nest_ember_boost"
        : schedBoosted
        ? "schedule_daypart_boost"
        : trophyCast
          ? "trophy_cast_bias"
          : linePro
            ? "line_pro_stock"
            : "best_score",
    score: best ? bestScore : null,
    candidatesConsidered: considered,
    tick: ctx.state.tick,
  });
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
  for (const c of ctx.state.counters) {
    const def = ctx.harbor.counters.find((d) => d.id === c.counterId)!;
    if (!CustomerSystem.isUnlocked(def, ctx.state)) continue;
    best = Math.max(best, counterDemand(ctx, c, itemId));
  }
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

function findSmokerInputDrop(ctx: StepContext, w: WorkerState): MachineDrop | null {
  for (const m of machinesByStation(ctx)) {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    if (!station.machine.includes("smoker")) continue;
    if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
    const accepted = acceptedInputs(ctx, m.machineId);
    const has = w.bag.contents().some(([item]) => accepted.has(item) && destHasRoom(ctx, m.input, item, w.id));
    if (!has) continue;
    const zone = zonePoint(ctx.harbor, station.inputZone);
    return { machine: m, x: zone.x, z: zone.z, zoneId: station.inputZone };
  }
  return null;
}

function findSmokerHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
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
        const involvesSmoker = srcStation.machine.includes("smoker") || dstStation.machine.includes("smoker");
        if (!involvesSmoker) continue;
        const accepted = acceptedInputs(ctx, dst.machineId);
        if (!accepted.has(itemId)) continue;
        if (!destHasRoom(ctx, dst.input, itemId, w.id)) continue;
        const demand = machineDemand(dst);
        let score =
          scoreHaul(ctx, w, src.output, zone.x, zone.z, src.status === "OUTPUT_FULL" ? 50 : 0, demand) + 60;
        const smokeQueue =
          StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.smoker_specialist.smoke_queue";
        if (smokeQueue) {
          if (dst.status === "WAITING_FOR_INPUT") score += 45;
          if (src.status === "OUTPUT_FULL") score += 35;
        }
        score += scheduleDaypartBoost(ctx, w, "smoker_specialist");
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

function smokerPost(ctx: StepContext): MachineDrop | null {
  for (const m of machinesByStation(ctx)) {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    if (!station.machine.includes("smoker")) continue;
    if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
    const zone = zonePoint(ctx.harbor, station.inputZone);
    return { machine: m, x: zone.x, z: zone.z, zoneId: station.inputZone };
  }
  return null;
}

function findCounterDrop(ctx: StepContext, w: WorkerState): CounterDrop | null {
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  let best: CounterDrop | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const c of counters) {
    const def = ctx.harbor.counters.find((d) => d.id === c.counterId)!;
    if (!CustomerSystem.isUnlocked(def, ctx.state)) continue;
    const item = w.bag.contents()
      .map(([id]) => id)
      .filter((id) => counterAccepts(def, id) && destHasRoom(ctx, c.stock, id, w.id))
      .sort(compareStrings)[0];
    if (!item) continue;
    const zone = zonePoint(ctx.harbor, def.zone);
    const demand = counterDemand(ctx, c, item);
    if (!best || demand > bestScore || (demand === bestScore && compareStrings(c.counterId, best.counter.counterId) < 0)) {
      best = { counter: c, x: zone.x, z: zone.z, zoneId: def.zone };
      bestScore = demand;
    }
  }
  return best;
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

/**
 * Finish 5.0 Phase 20 / Finish 6.0 Phase 16 — schedule-aware day-part scoring boost.
 * dawn_crew favors fishers at dawn/day; night_watch favors cashiers/greeters at dusk/night;
 * peak_tide boosts haulers during day/dusk; nest_ember boosts nest circuit roles at dawn/day.
 * decision-traces-staff-ai-4 / WorkerDecisionHooks.lastForWorker / nest_decision_fixture
 */
function scheduleDaypartBoost(ctx: StepContext, w: WorkerState, role: string): number {
  const schedule = StaffTreesSystem.scheduleOf(ctx.content, w);
  if (!schedule) return 0;
  const part = FishingSystem.dayPartAt(ctx.content, ctx.state.tick).id;
  if (!schedule.dayParts.includes(part)) return 0;
  let boost = 0;
  if (schedule.id === "schedule.dawn_crew" && (role === "fisher" || role === "porter")) boost = 25;
  else if (schedule.id === "schedule.night_watch" && (role === "cashier" || role === "greeter")) boost = 28;
  else if (schedule.id === "schedule.peak_tide") boost = 22;
  else if (
    schedule.id === "schedule.nest_ember" &&
    (role === "porter" || role === "ice_runner" || role === "operator" || role === "fisher")
  ) {
    boost = 26;
  } else if (schedule.dayParts.includes(part)) boost = 12;
  if (boost > 0) ctx.state.bumpStat(Stats.SCHEDULE_TASK_BOOSTS);
  return boost;
}

/** Finish 5.0 Phase 20 — clear stuck idle / dump bag when blockedReason fires. */
function attemptFailureRecover(
  ctx: StepContext,
  w: WorkerState,
  _def: WorkerDef,
  reason: string,
): void {
  if (!w.bag.isEmpty() && (reason === "No path" || reason === "Output full" || reason === "Spots empty")) {
    const dump = findMachineInputForBag(ctx, w);
    if (dump) {
      startWalk(w, dump.x, dump.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, _def, w));
      w.phase = "WALK_TO_DROP";
      w.taskDestInvId = dump.machine.input.id;
      w.taskZoneId = dump.zoneId;
      w.taskId = ctx.state.newId("task");
      ctx.state.bumpStat(Stats.WORKER_FAILURE_RECOVERIES);
      WorkerDecisionHooks.record({
        workerId: w.id,
        role: _def.role,
        kind: "recover",
        reason: "failure_recover",
        score: null,
        candidatesConsidered: 1,
        tick: ctx.state.tick,
      });
      return;
    }
  }
  abortHaul(ctx, w);
  clearTask(w);
  ctx.state.bumpStat(Stats.WORKER_FAILURE_RECOVERIES);
  WorkerDecisionHooks.record({
    workerId: w.id,
    role: _def.role,
    kind: "recover",
    reason: "failure_recover",
    score: null,
    candidatesConsidered: 0,
    tick: ctx.state.tick,
  });
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

