/**
 * Versioned, checksummed snapshots. Mirrors game-core persistence/SnapshotCodec.kt and is
 * byte-compatible with it: same key order, compact JSON, CRC-32 of the state JSON. Either
 * client can load the other's saves (checked by shared/fixtures/snapshot-*.json).
 */
import type { ContentPack } from "./content";
import { MAX_SAFE_INTEGER, SCHEMA_VERSION, compareStrings, sortedKeys } from "./foundations";
import { Inventory } from "./inventory";
import {
  ContractState, CounterState, CustomerState, FishingSpotState, GameState, MachineState, WorkerState,
  type HarborWorldStash, type MachineStatus, type Receipt, type WorkerTaskPhase,
} from "./state";
import { FishingSystem, PrestigeSystem, TrophySystem, UpgradeSystem, WorkerSystem } from "./systems";

export class SnapshotError extends Error {}

/** Written by a newer app. Callers must keep the save untouched. */
export class NewerSaveError extends SnapshotError {
  constructor(readonly schemaVersion: number) {
    super(`Save schema ${schemaVersion} is newer than this app supports (${SCHEMA_VERSION}). Update the app; the save was not changed.`);
  }
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const sortedRecord = (m: ReadonlyMap<string, number>): Record<string, number> => {
  const o: Record<string, number> = {};
  for (const k of sortedKeys(m)) o[k] = m.get(k)!;
  return o;
};
const entriesRecord = (entries: [string, number][]): Record<string, number> => Object.fromEntries(entries);

const inv = (i: Inventory) => ({ quantities: entriesRecord(i.contents()), reserved: entriesRecord(i.reservations()) });
const receipt = (r: Receipt) => ({ id: r.id, type: r.type, coinDelta: r.coinDelta, tick: r.tick, reference: r.reference });

export function encodeSnapshot(content: ContentPack, s: GameState, savedAtEpochMs: number | null = null): string {
  const p = s.player;
  const receipts: Record<string, Json> = {};
  for (const k of sortedKeys(s.purchaseReceipts)) receipts[k] = receipt(s.purchaseReceipts.get(k)!);

  const state = {
    harborId: s.harborId,
    tick: s.tick,
    coins: s.coins,
    rngState: s.rng.state,
    nextSerial: s.nextSerial,
    tutorialIndex: s.tutorialIndex,
    customerSpawnProgress: s.customerSpawnProgress,
    player: {
      x: p.x, z: p.z, facingX: p.facingX, facingZ: p.facingZ,
      zoneId: p.zoneId,
      transferCooldown: p.transferCooldown,
      fishingSpecies: p.fishingSpecies,
      fishingProgress: p.fishingProgress,
      fishingCatchTicks: p.fishingCatchTicks,
      reelAttemptedThisCast: p.reelAttemptedThisCast,
      preferredBaitId: p.preferredBaitId,
      activeBaitId: p.activeBaitId,
      bag: inv(p.bag),
    },
    fishingSpots: s.fishingSpots.map((f) => ({ zoneId: f.zoneId, stock: f.stock, regenProgress: f.regenProgress })),
    machines: s.machines.map((m) => ({
      stationId: m.stationId,
      paused: m.paused,
      status: m.status,
      preferredRecipeId: m.preferredRecipeId,
      broken: m.broken,
      slowUntilTick: m.slowUntilTick,
      input: inv(m.input),
      output: inv(m.output),
      activeBatch: m.activeBatch
        ? {
          id: m.activeBatch.id, recipeId: m.activeBatch.recipeId,
          durationTicks: m.activeBatch.durationTicks, remainingTicks: m.activeBatch.remainingTicks,
          consumed: m.activeBatch.consumed.map((c) => ({ item: c.item, quantity: c.quantity })),
        }
        : null,
    })),
    counters: s.counters.map((c) => ({ counterId: c.counterId, checkoutProgress: c.checkoutProgress, stock: inv(c.stock) })),
    customers: s.customers.map((c) => ({
      id: c.id, typeId: c.typeId, counterId: c.counterId, wants: c.wants, patienceLeft: c.patienceLeft,
      reservedItems: Object.fromEntries([...c.reservedItems.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
      walkTicksTotal: c.walkTicksTotal, walkTicksLeft: c.walkTicksLeft,
      preferredProductId: c.preferredProductId,
    })),
    workers: s.workers.map((w) => ({
      id: w.id, roleId: w.roleId, x: w.x, z: w.z,
      bag: inv(w.bag),
      walkTicksTotal: w.walkTicksTotal, walkTicksLeft: w.walkTicksLeft,
      walkFromX: w.walkFromX, walkFromZ: w.walkFromZ,
      walkToX: w.walkToX, walkToZ: w.walkToZ,
      transferCooldown: w.transferCooldown,
      phase: w.phase,
      taskId: w.taskId,
      taskZoneId: w.taskZoneId,
      taskSourceInvId: w.taskSourceInvId,
      taskDestInvId: w.taskDestInvId,
      taskItemId: w.taskItemId,
      taskQuantity: w.taskQuantity,
      leaseExpiresAt: w.leaseExpiresAt,
      fishingSpecies: w.fishingSpecies,
      fishingProgress: w.fishingProgress,
      fishingCatchTicks: w.fishingCatchTicks,
      xp: w.xp,
      level: w.level,
      traits: [...w.traits],
      onShift: w.onShift,
      equipment: encodeEquipment(w.equipment),
    })),
    contractBoardRefreshAt: s.contractBoardRefreshAt,
    contractOffers: s.contractOffers.map((o) => ({
      id: o.id, templateId: o.templateId, itemId: o.itemId,
      quantity: o.quantity, durationTicks: o.durationTicks,
      payout: o.payout, penalty: o.penalty,
    })),
    activeContracts: s.activeContracts.map((c) => ({
      id: c.id, templateId: c.templateId, itemId: c.itemId,
      quantity: c.quantity, delivered: c.delivered,
      deadlineTick: c.deadlineTick, payout: c.payout, penalty: c.penalty,
    })),
    ownedUpgrades: [...s.ownedUpgrades].sort(compareStrings),
    completedQuests: [...s.completedQuests].sort(compareStrings),
    completedPrestige: [...s.completedPrestige].sort(compareStrings),
    unlockedCosmetics: [...s.unlockedCosmetics].sort(compareStrings),
    ownedDecor: [...s.ownedDecor].sort(compareStrings),
    fullHarborUnlock: s.fullHarborUnlock,
    loanOwed: s.loanOwed,
    loanDueTick: s.loanDueTick,
    coinGoal: s.coinGoal,
    coinGoalCelebrated: s.coinGoalCelebrated,
    speciesCatches: (() => {
      const o: Record<string, number> = {};
      for (const id of sortedKeys(s.speciesCatches)) {
        const count = s.speciesCatches.get(id)!;
        if (count > 0) o[id] = count;
      }
      return o;
    })(),
    trophies: (() => {
      const o: Record<string, Json> = {};
      for (const id of sortedKeys(s.trophies)) {
        const rec = s.trophies.get(id)!;
        o[id] = { sizePermille: rec.sizePermille, valueCoins: rec.valueCoins, tick: rec.tick };
      }
      return o;
    })(),
    stats: sortedRecord(s.stats),
    purchaseReceipts: receipts,
    ledger: s.ledger.map(receipt),
    harborStashes: (() => {
      const o: Record<string, Json> = {};
      for (const id of sortedKeys(s.harborStashes)) o[id] = encodeStash(s.harborStashes.get(id)!);
      return o;
    })(),
  };
  const stateJson = JSON.stringify(state);
  // Splice the already-serialised state in so the checksum covers exactly those bytes.
  // Omitting savedAt keeps fixture/parity encodes byte-identical to prior versions.
  const savedAt = savedAtEpochMs === undefined || savedAtEpochMs === null
    ? ""
    : `,"savedAtEpochMs":${savedAtEpochMs}`;
  return `{"schemaVersion":${SCHEMA_VERSION},"contentVersion":${JSON.stringify(content.contentVersion)},"checksum":"${crc32Hex(stateJson)}"${savedAt},"state":${stateJson}}`;
}

export interface DecodedSnapshot {
  state: GameState;
  /** Wall-clock millis when this snapshot was written, or null for legacy saves. */
  savedAtEpochMs: number | null;
}

export function decodeSnapshot(content: ContentPack, text: string): GameState {
  return decodeSnapshotEnvelope(content, text).state;
}

export function decodeSnapshotEnvelope(content: ContentPack, text: string): DecodedSnapshot {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    throw new SnapshotError("Save is not valid JSON");
  }
  const env = new Reader(root, "$");
  const version = env.get("schemaVersion").int();
  if (version > SCHEMA_VERSION) throw new NewerSaveError(version);
  if (version < 1) throw new SnapshotError(`Unsupported save schema ${version}`);
  const stateValue = (root as Record<string, unknown>)["state"];
  if (typeof stateValue !== "object" || stateValue === null) throw new SnapshotError("Missing state");
  // Re-serialising parsed JSON reproduces the original compact bytes (same key order, integers only).
  if (env.get("checksum").string() !== crc32Hex(JSON.stringify(stateValue))) {
    throw new SnapshotError("Checksum mismatch: save is corrupt");
  }
  const savedAtNode = env.optional("savedAtEpochMs");
  const savedAtEpochMs = savedAtNode ? savedAtNode.int(0) : null;
  return { state: readState(content, new Reader(stateValue, "$.state"), version), savedAtEpochMs };
}

/**
 * Migrations are applied while reading: [version] is the save's schema.
 *  - v1 -> v2: customers had no walking state; they were already queued (walk 0).
 *  - v2 -> v3: customers.reserved (int, single SKU) becomes reservedItems map.
 *  - v3 -> v4: player mid-cast fishingCatchTicks + reelAttemptedThisCast.
 *  - v4 -> v5: machines.preferredRecipeId (null = Auto).
 *  - v5 -> v6: customers.preferredProductId.
 *  - v6 -> v7: workers list.
 *  - v7 -> v8: contract board offers + active deliveries.
 *  - v8 -> v9: parked harbor worlds (harborStashes).
 *  - v9 -> v10: completedPrestige + unlockedCosmetics.
 *  - v10 -> v11: player preferredBaitId + activeBaitId.
 *  - v11 -> v12: trophies map (museum personal bests).
 *  - v12 -> v13: worker xp / level / traits (Phase 16).
 *  - v13 -> v14: worker onShift (Phase 17).
 *  - v14 -> v15: worker equipment loadouts (Phase 19).
 *  - v15 -> v16: ownedDecor (Phase 23 shop cosmetics).
 *  - v16 -> v17: machine broken + slowUntilTick (Phase 25 wear).
 *  - v17 -> v18: loanOwed / loanDueTick / coinGoal / coinGoalCelebrated (Phase 26 bank).
 *  - v18 -> v19: speciesCatches map (Phase 27 telemetry v2).
 *  - v19 -> v20: fullHarborUnlock (Phase 23 one-time IAP entitlement).
 */
function readState(content: ContentPack, n: Reader, version: number): GameState {
  const harborId = n.get("harborId").string();
  if (!content.harborsById.has(harborId)) throw new SnapshotError(`Unknown harbor ${harborId}`);
  const s = GameState.newGame(content, harborId, 0);
  s.rng.state = n.get("rngState").int();
  s.tick = n.get("tick").int(0);
  s.coins = Math.min(n.get("coins").int(0), MAX_SAFE_INTEGER);
  s.nextSerial = n.get("nextSerial").int(1);
  s.tutorialIndex = n.get("tutorialIndex").int(0);
  s.customerSpawnProgress = n.get("customerSpawnProgress").int(0);

  const p = n.get("player");
  s.player.x = p.get("x").int();
  s.player.z = p.get("z").int();
  s.player.facingX = p.get("facingX").int();
  s.player.facingZ = p.get("facingZ").int();
  s.player.zoneId = p.optional("zoneId")?.string() ?? null;
  s.player.transferCooldown = p.get("transferCooldown").int(0);
  const species = p.optional("fishingSpecies")?.string() ?? null;
  s.player.fishingSpecies = species !== null && content.speciesById.has(species) ? species : null;
  s.player.fishingProgress = p.get("fishingProgress").int(0);
  if (version >= 4) {
    s.player.fishingCatchTicks = p.get("fishingCatchTicks").int(0);
    s.player.reelAttemptedThisCast = p.get("reelAttemptedThisCast").bool();
  } else if (s.player.fishingSpecies) {
    const sp = content.speciesById.get(s.player.fishingSpecies)!;
    s.player.fishingCatchTicks = FishingSystem.catchTicksFor(s.player.catchSpeedPermille, sp.catchTicks);
    s.player.reelAttemptedThisCast = false;
  }
  if (version >= 11) {
    const preferred = p.optional("preferredBaitId")?.string() ?? null;
    s.player.preferredBaitId = preferred && content.baitById.has(preferred) ? preferred : null;
    const active = p.optional("activeBaitId")?.string() ?? null;
    s.player.activeBaitId = active && content.baitById.has(active) ? active : null;
  }
  readInv(p.get("bag"), s.player.bag);

  for (const f of n.get("fishingSpots").list()) {
    const spot = s.fishingSpots.find((x) => x.zoneId === f.get("zoneId").string());
    if (!spot) continue;
    spot.stock = f.get("stock").int(0);
    spot.regenProgress = f.get("regenProgress").int(0);
  }
  for (const mn of n.get("machines").list()) {
    const m = s.machines.find((x) => x.stationId === mn.get("stationId").string());
    if (!m) continue;
    m.paused = mn.get("paused").bool();
    const status = mn.get("status").string();
    m.status = (["WAITING_FOR_INPUT", "PROCESSING", "OUTPUT_FULL", "PAUSED", "LOCKED", "NEEDS_REPAIR"] as const)
      .includes(status as MachineStatus)
      ? (status as MachineStatus) : "WAITING_FOR_INPUT";
    if (version >= 5) {
      const pref = mn.optional("preferredRecipeId")?.string() ?? null;
      const allowed = content.machinesById.get(m.machineId)?.recipes ?? [];
      m.preferredRecipeId = pref && allowed.includes(pref) ? pref : null;
    }
    if (version >= 17) {
      m.broken = mn.optional("broken")?.bool() ?? false;
      m.slowUntilTick = mn.optional("slowUntilTick")?.int(0) ?? 0;
    }
    readInv(mn.get("input"), m.input);
    readInv(mn.get("output"), m.output);
    const b = mn.optional("activeBatch");
    m.activeBatch = b
      ? {
        id: b.get("id").string(), recipeId: b.get("recipeId").string(),
        durationTicks: b.get("durationTicks").int(1), remainingTicks: b.get("remainingTicks").int(0),
        consumed: b.get("consumed").list().map((c) => ({ item: c.get("item").string(), quantity: c.get("quantity").int(1) })),
      }
      : null;
  }
  for (const cn of n.get("counters").list()) {
    const c = s.counters.find((x) => x.counterId === cn.get("counterId").string());
    if (!c) continue;
    c.checkoutProgress = cn.get("checkoutProgress").int(0);
    readInv(cn.get("stock"), c.stock);
  }
  for (const cn of n.get("customers").list()) {
    const walkTotal = version >= 2 ? cn.get("walkTicksTotal").int(0) : 0;
    const counterId = cn.get("counterId").string();
    const preferred = version >= 6
      ? (() => {
        const raw = cn.optional("preferredProductId")?.string() ?? null;
        return raw && content.productsById.has(raw) ? raw : null;
      })()
      : null;
    const c = new CustomerState(cn.get("id").string(), cn.get("typeId").string(), counterId,
      cn.get("wants").int(1), cn.get("patienceLeft").int(), walkTotal, preferred);
    if (version >= 3) {
      for (const [item, v] of cn.get("reservedItems").entries()) {
        const qty = v.int(1);
        if (qty > 0) c.addReservation(item, qty);
      }
    } else {
      const reserved = cn.get("reserved").int(0);
      if (reserved > 0) {
        const product = content.harborsById.get(harborId)!.counters.find((d) => d.id === counterId)?.products[0];
        if (product) c.addReservation(product, reserved);
      }
    }
    c.walkTicksLeft = version >= 2 ? Math.min(cn.get("walkTicksLeft").int(0), walkTotal) : 0;
    s.customers.push(c);
  }
  if (version >= 7) {
    const phases: readonly WorkerTaskPhase[] = ["NONE", "WALK_TO_WORK", "WORK", "PICKUP", "WALK_TO_DROP", "DROP"];
    for (const wn of n.get("workers").list()) {
      const roleId = wn.get("roleId").string();
      const def = content.workersById.get(roleId);
      if (!def) continue;
      const id = wn.get("id").string();
      const w = new WorkerState(
        id, roleId, wn.get("x").int(), wn.get("z").int(),
        new Inventory(`inv.${id}.bag`, def.carryCapacityUnits, content.carryUnits),
      );
      readInv(wn.get("bag"), w.bag);
      w.walkTicksTotal = wn.get("walkTicksTotal").int(0);
      w.walkTicksLeft = Math.min(wn.get("walkTicksLeft").int(0), w.walkTicksTotal);
      w.walkFromX = wn.get("walkFromX").int();
      w.walkFromZ = wn.get("walkFromZ").int();
      w.walkToX = wn.get("walkToX").int();
      w.walkToZ = wn.get("walkToZ").int();
      w.transferCooldown = wn.get("transferCooldown").int(0);
      const phase = wn.get("phase").string();
      w.phase = (phases as readonly string[]).includes(phase) ? phase as WorkerTaskPhase : "NONE";
      w.taskId = wn.optional("taskId")?.string() ?? null;
      w.taskZoneId = wn.optional("taskZoneId")?.string() ?? null;
      w.taskSourceInvId = wn.optional("taskSourceInvId")?.string() ?? null;
      w.taskDestInvId = wn.optional("taskDestInvId")?.string() ?? null;
      w.taskItemId = wn.optional("taskItemId")?.string() ?? null;
      w.taskQuantity = wn.get("taskQuantity").int(0);
      w.leaseExpiresAt = wn.get("leaseExpiresAt").int(0);
      const species = wn.optional("fishingSpecies")?.string() ?? null;
      w.fishingSpecies = species !== null && content.speciesById.has(species) ? species : null;
      w.fishingProgress = wn.get("fishingProgress").int(0);
      w.fishingCatchTicks = wn.get("fishingCatchTicks").int(0);
      if (version >= 13) {
        w.xp = wn.get("xp").int(0);
        w.level = Math.min(Math.max(wn.get("level").int(1), 1), content.staffProgression.maxLevel);
        for (const t of wn.get("traits").list()) {
          const tid = t.string();
          if (content.workerTraitsById.has(tid)) w.traits.push(tid);
        }
      } else {
        w.xp = 0;
        w.level = 1;
      }
      w.onShift = version >= 14 ? wn.get("onShift").bool() : true;
      if (version >= 15) readWorkerEquipment(content, wn, w);
      s.workers.push(w);
    }
  }
  if (version >= 8) {
    s.contractBoardRefreshAt = n.get("contractBoardRefreshAt").int(0);
    for (const on of n.get("contractOffers").list()) {
      const templateId = on.get("templateId").string();
      if (!content.contractTemplatesById.has(templateId)) continue;
      s.contractOffers.push({
        id: on.get("id").string(),
        templateId,
        itemId: on.get("itemId").string(),
        quantity: on.get("quantity").int(1),
        durationTicks: on.get("durationTicks").int(1),
        payout: on.get("payout").int(0),
        penalty: on.get("penalty").int(0),
      });
    }
    for (const cn of n.get("activeContracts").list()) {
      const templateId = cn.get("templateId").string();
      if (!content.contractTemplatesById.has(templateId)) continue;
      const qty = cn.get("quantity").int(1);
      s.activeContracts.push(new ContractState(
        cn.get("id").string(),
        templateId,
        cn.get("itemId").string(),
        qty,
        Math.min(cn.get("delivered").int(0), qty),
        cn.get("deadlineTick").int(0),
        cn.get("payout").int(0),
        cn.get("penalty").int(0),
      ));
    }
  }
  n.get("ownedUpgrades").list().map((x) => x.string()).filter((u) => content.upgradesById.has(u)).forEach((u) => s.ownedUpgrades.add(u));
  n.get("completedQuests").list().forEach((x) => s.completedQuests.add(x.string()));
  if (version >= 10) {
    n.get("completedPrestige").list().map((x) => x.string())
      .filter((id) => content.prestigeMilestonesById.has(id))
      .forEach((id) => s.completedPrestige.add(id));
    n.get("unlockedCosmetics").list().forEach((x) => s.unlockedCosmetics.add(x.string()));
  }
  if (version >= 16) {
    n.get("ownedDecor").list().map((x) => x.string()).filter((id) => content.decorById.has(id))
      .forEach((id) => s.ownedDecor.add(id));
  }
  if (version >= 20) {
    s.fullHarborUnlock = n.optional("fullHarborUnlock")?.bool() ?? false;
  }
  if (version >= 18) {
    s.loanOwed = n.optional("loanOwed")?.int(0) ?? 0;
    s.loanDueTick = n.optional("loanDueTick")?.int(0) ?? 0;
    s.coinGoal = n.optional("coinGoal")?.int(0) ?? 0;
    s.coinGoalCelebrated = n.optional("coinGoalCelebrated")?.bool() ?? false;
    if (s.loanOwed <= 0) {
      s.loanOwed = 0;
      s.loanDueTick = 0;
    }
    if (s.coinGoal <= 0) {
      s.coinGoal = 0;
      s.coinGoalCelebrated = false;
    } else if (!content.bank.goalPresets.includes(s.coinGoal)) {
      s.coinGoal = 0;
      s.coinGoalCelebrated = false;
    }
  }
  if (version >= 19) {
    const catchesNode = n.optional("speciesCatches");
    if (catchesNode) {
      for (const [speciesId, node] of catchesNode.entries()) {
        if (!content.speciesById.has(speciesId)) continue;
        const count = node.int(0);
        if (count > 0) s.speciesCatches.set(speciesId, count);
      }
    }
  }
  if (version >= 12) {
    const trophiesNode = n.optional("trophies");
    if (trophiesNode) {
      for (const [speciesId, node] of trophiesNode.entries()) {
        if (!content.speciesById.has(speciesId)) continue;
        s.trophies.set(speciesId, {
          sizePermille: node.get("sizePermille").int(1),
          valueCoins: node.get("valueCoins").int(0),
          tick: node.get("tick").int(0),
        });
      }
    }
  }
  for (const [k, v] of n.get("stats").entries()) s.stats.set(k, v.int());
  for (const [k, v] of n.get("purchaseReceipts").entries()) s.purchaseReceipts.set(k, readReceipt(v));
  n.get("ledger").list().forEach((r) => s.ledger.push(readReceipt(r)));

  if (version >= 9) {
    for (const [stashHarborId, node] of n.get("harborStashes").entries()) {
      if (!content.harborsById.has(stashHarborId) || stashHarborId === harborId) continue;
      s.harborStashes.set(stashHarborId, readStash(content, stashHarborId, node, version));
    }
  }

  // Rebuild derived limits from content + owned upgrades / prestige (idempotent effects).
  for (const u of s.ownedUpgrades) UpgradeSystem.applyEffect(s, content.upgradesById.get(u)!.effect);
  for (const id of s.completedPrestige) {
    PrestigeSystem.applyReward(s, content.prestigeMilestonesById.get(id)!);
  }
  if (version >= 12) TrophySystem.rebuildSetStats(content, s);
  pruneWorkerEquipment(content, s, s.workers);
  for (const stash of s.harborStashes.values()) pruneWorkerEquipment(content, s, stash.workers);
  if (version < 15) {
    WorkerSystem.migrateLegacyGlobalGear(content, s);
    for (const stash of s.harborStashes.values()) autoEquipOwnedGear(content, s, stash.workers);
  }
  for (const w of s.workers) {
    const def = content.workersById.get(w.roleId);
    if (!def) continue;
    w.level = Math.min(
      Math.max(WorkerSystem.levelForXp(content, w.xp), 1),
      content.staffProgression.maxLevel,
    );
    w.bag.capacityUnits = WorkerSystem.carryCapacity(content, s, def, w);
  }
  for (const stash of s.harborStashes.values()) {
    for (const w of stash.workers) {
      const def = content.workersById.get(w.roleId);
      if (!def) continue;
      w.level = Math.min(
        Math.max(WorkerSystem.levelForXp(content, w.xp), 1),
        content.staffProgression.maxLevel,
      );
      w.bag.capacityUnits = WorkerSystem.carryCapacity(content, s, def, w);
    }
  }
  return s;
}

function encodeEquipment(equipment: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of Object.keys(equipment).sort(compareStrings)) o[k] = equipment[k]!;
  return o;
}

function readWorkerEquipment(content: ContentPack, wn: Reader, w: WorkerState): void {
  const eq = wn.optional("equipment");
  if (!eq) return;
  for (const [slotId, node] of eq.entries()) {
    const upgradeId = node.string();
    const slot = content.staffProgression.loadouts.slots.find((x) => x.id === slotId);
    if (slot && slot.upgradeIds.includes(upgradeId)) w.equipment[slotId] = upgradeId;
  }
}

function pruneWorkerEquipment(content: ContentPack, s: GameState, workers: WorkerState[]): void {
  const seen = new Set<string>();
  for (const w of workers) {
    for (const [slotId, upgradeId] of Object.entries(w.equipment)) {
      const slot = content.staffProgression.loadouts.slots.find((x) => x.id === slotId);
      if (!slot || !slot.upgradeIds.includes(upgradeId) || !s.ownedUpgrades.has(upgradeId) || seen.has(upgradeId)) {
        delete w.equipment[slotId];
      } else {
        seen.add(upgradeId);
      }
    }
  }
}

function autoEquipOwnedGear(content: ContentPack, s: GameState, workers: WorkerState[]): void {
  const equipped = new Set<string>([
    ...s.workers.flatMap((w) => Object.values(w.equipment)),
    ...[...s.harborStashes.values()].flatMap((st) => st.workers.flatMap((w) => Object.values(w.equipment))),
  ]);
  const assignable = WorkerSystem.assignableUpgradeIds(content);
  for (const upgradeId of content.upgrades.map((u) => u.id).filter((id) => assignable.has(id) && s.ownedUpgrades.has(id))) {
    if (equipped.has(upgradeId)) continue;
    const slotId = WorkerSystem.loadoutSlotFor(content, upgradeId);
    if (!slotId) continue;
    const target = workers.find((w) => !(slotId in w.equipment));
    if (!target) continue;
    target.equipment[slotId] = upgradeId;
    equipped.add(upgradeId);
  }
}

function encodeStash(stash: HarborWorldStash): Json {
  return {
    fishingSpots: stash.fishingSpots.map((f) => ({ zoneId: f.zoneId, stock: f.stock, regenProgress: f.regenProgress })),
    machines: stash.machines.map((m) => ({
      stationId: m.stationId,
      paused: m.paused,
      status: m.status,
      preferredRecipeId: m.preferredRecipeId,
      broken: m.broken,
      slowUntilTick: m.slowUntilTick,
      input: inv(m.input),
      output: inv(m.output),
      activeBatch: m.activeBatch
        ? {
          id: m.activeBatch.id, recipeId: m.activeBatch.recipeId,
          durationTicks: m.activeBatch.durationTicks, remainingTicks: m.activeBatch.remainingTicks,
          consumed: m.activeBatch.consumed.map((c) => ({ item: c.item, quantity: c.quantity })),
        }
        : null,
    })),
    counters: stash.counters.map((c) => ({ counterId: c.counterId, checkoutProgress: c.checkoutProgress, stock: inv(c.stock) })),
    customers: stash.customers.map((c) => ({
      id: c.id, typeId: c.typeId, counterId: c.counterId, wants: c.wants, patienceLeft: c.patienceLeft,
      reservedItems: Object.fromEntries([...c.reservedItems.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
      walkTicksTotal: c.walkTicksTotal, walkTicksLeft: c.walkTicksLeft,
      preferredProductId: c.preferredProductId,
    })),
    workers: stash.workers.map((w) => ({
      id: w.id, roleId: w.roleId, x: w.x, z: w.z,
      bag: inv(w.bag),
      walkTicksTotal: w.walkTicksTotal, walkTicksLeft: w.walkTicksLeft,
      walkFromX: w.walkFromX, walkFromZ: w.walkFromZ,
      walkToX: w.walkToX, walkToZ: w.walkToZ,
      transferCooldown: w.transferCooldown,
      phase: w.phase,
      taskId: w.taskId,
      taskZoneId: w.taskZoneId,
      taskSourceInvId: w.taskSourceInvId,
      taskDestInvId: w.taskDestInvId,
      taskItemId: w.taskItemId,
      taskQuantity: w.taskQuantity,
      leaseExpiresAt: w.leaseExpiresAt,
      fishingSpecies: w.fishingSpecies,
      fishingProgress: w.fishingProgress,
      fishingCatchTicks: w.fishingCatchTicks,
      xp: w.xp,
      level: w.level,
      traits: [...w.traits],
      onShift: w.onShift,
      equipment: encodeEquipment(w.equipment),
    })),
    customerSpawnProgress: stash.customerSpawnProgress,
    playerX: stash.playerX,
    playerZ: stash.playerZ,
    playerFacingX: stash.playerFacingX,
    playerFacingZ: stash.playerFacingZ,
    playerZoneId: stash.playerZoneId,
  };
}

function readStash(content: ContentPack, harborId: string, n: Reader, version: number): HarborWorldStash {
  const harbor = content.harbor(harborId);
  const units = content.carryUnits;
  const fishingSpots = harbor.fishingSpots.map((f) => new FishingSpotState(f.zone, f.stockMax));
  for (const f of n.get("fishingSpots").list()) {
    const spot = fishingSpots.find((x) => x.zoneId === f.get("zoneId").string());
    if (!spot) continue;
    spot.stock = f.get("stock").int(0);
    spot.regenProgress = f.get("regenProgress").int(0);
  }
  const machines = harbor.stations.map((st) => {
    const def = content.machinesById.get(st.machine)!;
    return new MachineState(
      st.id, st.machine,
      new Inventory(`inv.${st.id}.input`, def.inputCapacityUnits, units),
      new Inventory(`inv.${st.id}.output`, def.outputCapacityUnits, units),
    );
  });
  for (const mn of n.get("machines").list()) {
    const m = machines.find((x) => x.stationId === mn.get("stationId").string());
    if (!m) continue;
    m.paused = mn.get("paused").bool();
    const status = mn.get("status").string();
    m.status = (["WAITING_FOR_INPUT", "PROCESSING", "OUTPUT_FULL", "PAUSED", "LOCKED", "NEEDS_REPAIR"] as const)
      .includes(status as MachineStatus)
      ? (status as MachineStatus) : "WAITING_FOR_INPUT";
    if (version >= 5) {
      const pref = mn.optional("preferredRecipeId")?.string() ?? null;
      const allowed = content.machinesById.get(m.machineId)?.recipes ?? [];
      m.preferredRecipeId = pref && allowed.includes(pref) ? pref : null;
    }
    if (version >= 17) {
      m.broken = mn.optional("broken")?.bool() ?? false;
      m.slowUntilTick = mn.optional("slowUntilTick")?.int(0) ?? 0;
    }
    readInv(mn.get("input"), m.input);
    readInv(mn.get("output"), m.output);
    const b = mn.optional("activeBatch");
    m.activeBatch = b
      ? {
        id: b.get("id").string(), recipeId: b.get("recipeId").string(),
        durationTicks: b.get("durationTicks").int(1), remainingTicks: b.get("remainingTicks").int(0),
        consumed: b.get("consumed").list().map((c) => ({ item: c.get("item").string(), quantity: c.get("quantity").int(1) })),
      }
      : null;
  }
  const counters = harbor.counters.map((c) => new CounterState(c.id, new Inventory(`inv.${c.id}`, c.capacityUnits, units)));
  for (const cn of n.get("counters").list()) {
    const c = counters.find((x) => x.counterId === cn.get("counterId").string());
    if (!c) continue;
    c.checkoutProgress = cn.get("checkoutProgress").int(0);
    readInv(cn.get("stock"), c.stock);
  }
  const customers: CustomerState[] = [];
  for (const cn of n.get("customers").list()) {
    const walkTotal = cn.get("walkTicksTotal").int(0);
    const counterId = cn.get("counterId").string();
    const rawPref = cn.optional("preferredProductId")?.string() ?? null;
    const preferred = rawPref && content.productsById.has(rawPref) ? rawPref : null;
    const c = new CustomerState(cn.get("id").string(), cn.get("typeId").string(), counterId,
      cn.get("wants").int(1), cn.get("patienceLeft").int(), walkTotal, preferred);
    for (const [item, v] of cn.get("reservedItems").entries()) {
      const qty = v.int(1);
      if (qty > 0) c.addReservation(item, qty);
    }
    c.walkTicksLeft = Math.min(cn.get("walkTicksLeft").int(0), walkTotal);
    customers.push(c);
  }
  const workers: WorkerState[] = [];
  const phases: readonly WorkerTaskPhase[] = ["NONE", "WALK_TO_WORK", "WORK", "PICKUP", "WALK_TO_DROP", "DROP"];
  for (const wn of n.get("workers").list()) {
    const roleId = wn.get("roleId").string();
    const def = content.workersById.get(roleId);
    if (!def) continue;
    const id = wn.get("id").string();
    const w = new WorkerState(
      id, roleId, wn.get("x").int(), wn.get("z").int(),
      new Inventory(`inv.${id}.bag`, def.carryCapacityUnits, content.carryUnits),
    );
    readInv(wn.get("bag"), w.bag);
    w.walkTicksTotal = wn.get("walkTicksTotal").int(0);
    w.walkTicksLeft = Math.min(wn.get("walkTicksLeft").int(0), w.walkTicksTotal);
    w.walkFromX = wn.get("walkFromX").int();
    w.walkFromZ = wn.get("walkFromZ").int();
    w.walkToX = wn.get("walkToX").int();
    w.walkToZ = wn.get("walkToZ").int();
    w.transferCooldown = wn.get("transferCooldown").int(0);
    const phase = wn.get("phase").string();
    w.phase = (phases as readonly string[]).includes(phase) ? phase as WorkerTaskPhase : "NONE";
    w.taskId = wn.optional("taskId")?.string() ?? null;
    w.taskZoneId = wn.optional("taskZoneId")?.string() ?? null;
    w.taskSourceInvId = wn.optional("taskSourceInvId")?.string() ?? null;
    w.taskDestInvId = wn.optional("taskDestInvId")?.string() ?? null;
    w.taskItemId = wn.optional("taskItemId")?.string() ?? null;
    w.taskQuantity = wn.get("taskQuantity").int(0);
    w.leaseExpiresAt = wn.get("leaseExpiresAt").int(0);
    const species = wn.optional("fishingSpecies")?.string() ?? null;
    w.fishingSpecies = species !== null && content.speciesById.has(species) ? species : null;
    w.fishingProgress = wn.get("fishingProgress").int(0);
    w.fishingCatchTicks = wn.get("fishingCatchTicks").int(0);
    if (version >= 13) {
      w.xp = wn.get("xp").int(0);
      w.level = Math.min(Math.max(wn.get("level").int(1), 1), content.staffProgression.maxLevel);
      for (const t of wn.get("traits").list()) {
        const tid = t.string();
        if (content.workerTraitsById.has(tid)) w.traits.push(tid);
      }
    }
    w.onShift = version >= 14 ? wn.get("onShift").bool() : true;
    if (version >= 15) readWorkerEquipment(content, wn, w);
    workers.push(w);
  }
  return {
    fishingSpots,
    machines,
    counters,
    customers,
    workers,
    customerSpawnProgress: n.get("customerSpawnProgress").int(0),
    playerX: n.get("playerX").int(),
    playerZ: n.get("playerZ").int(),
    playerFacingX: n.get("playerFacingX").int(),
    playerFacingZ: n.get("playerFacingZ").int(),
    playerZoneId: n.optional("playerZoneId")?.string() ?? null,
  };
}

function readInv(n: Reader, into: Inventory): void {
  const map = (key: string) => Object.fromEntries(n.get(key).entries().map(([k, v]) => [k, v.int(0)] as const));
  into.restore(map("quantities"), map("reserved"));
}

const readReceipt = (n: Reader): Receipt => ({
  id: n.get("id").string(), type: n.get("type").string(), coinDelta: n.get("coinDelta").int(),
  tick: n.get("tick").int(), reference: n.get("reference").string(),
});

/** Path-aware JSON reader with the same error style as the Kotlin Node helper. */
class Reader {
  constructor(private readonly v: unknown, readonly path: string) {}
  private fail(msg: string): never { throw new SnapshotError(`Malformed save: ${this.path}: ${msg}`); }
  private obj(): Record<string, unknown> {
    if (typeof this.v !== "object" || this.v === null || Array.isArray(this.v)) this.fail("expected an object");
    return this.v as Record<string, unknown>;
  }
  get(key: string): Reader {
    const o = this.obj();
    if (!(key in o)) this.fail(`missing required field '${key}'`);
    return new Reader(o[key], `${this.path}.${key}`);
  }
  optional(key: string): Reader | null {
    const val = this.obj()[key];
    return val === undefined || val === null ? null : new Reader(val, `${this.path}.${key}`);
  }
  string(): string {
    if (typeof this.v !== "string" || this.v.trim() === "") this.fail("expected a non-blank string");
    return this.v;
  }
  int(min = Number.MIN_SAFE_INTEGER): number {
    if (typeof this.v !== "number" || !Number.isSafeInteger(this.v)) this.fail("expected an integer");
    if (this.v < min) this.fail(`must be >= ${min} (was ${this.v})`);
    return this.v;
  }
  bool(): boolean {
    if (typeof this.v !== "boolean") this.fail("expected a boolean");
    return this.v;
  }
  list(): Reader[] {
    if (!Array.isArray(this.v)) this.fail("expected an array");
    return this.v.map((e, i) => new Reader(e, `${this.path}[${i}]`));
  }
  entries(): [string, Reader][] {
    return Object.entries(this.obj()).map(([k, val]) => [k, new Reader(val, `${this.path}.${k}`)]);
  }
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (same polynomial as java.util.zip.CRC32) over UTF-8 bytes, as 8 lowercase hex digits. */
export function crc32Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}
