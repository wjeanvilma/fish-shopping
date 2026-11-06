/**
 * Versioned, checksummed snapshots. Mirrors game-core persistence/SnapshotCodec.kt and is
 * byte-compatible with it: same key order, compact JSON, CRC-32 of the state JSON. Either
 * client can load the other's saves (checked by shared/fixtures/snapshot-*.json).
 */
import type { ContentPack } from "./content";
import { MAX_SAFE_INTEGER, SCHEMA_VERSION, compareStrings, sortedKeys } from "./foundations";
import type { Inventory } from "./inventory";
import { CustomerState, GameState, type MachineStatus, type Receipt } from "./state";
import { FishingSystem, UpgradeSystem } from "./systems";

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

export function encodeSnapshot(content: ContentPack, s: GameState): string {
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
      bag: inv(p.bag),
    },
    fishingSpots: s.fishingSpots.map((f) => ({ zoneId: f.zoneId, stock: f.stock, regenProgress: f.regenProgress })),
    machines: s.machines.map((m) => ({
      stationId: m.stationId,
      paused: m.paused,
      status: m.status,
      preferredRecipeId: m.preferredRecipeId,
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
    ownedUpgrades: [...s.ownedUpgrades].sort(compareStrings),
    completedQuests: [...s.completedQuests].sort(compareStrings),
    stats: sortedRecord(s.stats),
    purchaseReceipts: receipts,
    ledger: s.ledger.map(receipt),
  };
  const stateJson = JSON.stringify(state);
  // Splice the already-serialised state in so the checksum covers exactly those bytes.
  return `{"schemaVersion":${SCHEMA_VERSION},"contentVersion":${JSON.stringify(content.contentVersion)},"checksum":"${crc32Hex(stateJson)}","state":${stateJson}}`;
}

export function decodeSnapshot(content: ContentPack, text: string): GameState {
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
  return readState(content, new Reader(stateValue, "$.state"), version);
}

/**
 * Migrations are applied while reading: [version] is the save's schema.
 *  - v1 -> v2: customers had no walking state; they were already queued (walk 0).
 *  - v2 -> v3: customers.reserved (int, single SKU) becomes reservedItems map.
 *  - v3 -> v4: player mid-cast fishingCatchTicks + reelAttemptedThisCast.
 *  - v4 -> v5: machines.preferredRecipeId (null = Auto).
 *  - v5 -> v6: customers.preferredProductId.
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
    m.status = (["WAITING_FOR_INPUT", "PROCESSING", "OUTPUT_FULL", "PAUSED"] as const).includes(status as MachineStatus)
      ? (status as MachineStatus) : "WAITING_FOR_INPUT";
    if (version >= 5) {
      const pref = mn.optional("preferredRecipeId")?.string() ?? null;
      const allowed = content.machinesById.get(m.machineId)?.recipes ?? [];
      m.preferredRecipeId = pref && allowed.includes(pref) ? pref : null;
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
  n.get("ownedUpgrades").list().map((x) => x.string()).filter((u) => content.upgradesById.has(u)).forEach((u) => s.ownedUpgrades.add(u));
  n.get("completedQuests").list().forEach((x) => s.completedQuests.add(x.string()));
  for (const [k, v] of n.get("stats").entries()) s.stats.set(k, v.int());
  for (const [k, v] of n.get("purchaseReceipts").entries()) s.purchaseReceipts.set(k, readReceipt(v));
  n.get("ledger").list().forEach((r) => s.ledger.push(readReceipt(r)));

  for (const u of s.ownedUpgrades) UpgradeSystem.applyEffect(s, content.upgradesById.get(u)!.effect);
  return s;
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
