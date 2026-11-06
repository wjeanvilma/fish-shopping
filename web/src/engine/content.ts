/**
 * Content model, loader and cross-reference validator. Mirrors game-core content/.
 * Structure is checked with the shared JSON Schema (blueprint: "JSON Schema validation
 * at content import"); cross-references with the same rules as ContentValidator.kt.
 */
import Ajv2020 from "ajv/dist/2020";
import schema from "../../../shared/schema/content-pack.schema.json";
import { SafeMath, TICKS_PER_SECOND } from "./foundations";

export interface PlayerDef {
  startCoins: number;
  startCarryCapacityUnits: number;
  moveSpeedMmPerTick: number;
  transferIntervalTicks: number;
  startCatchSpeedPermille: number;
  startFishRegenPermille: number;
  timingWindowStartPermille: number;
  timingWindowEndPermille: number;
}
export interface RareUpgradeDef { to: string; chancePermille: number }
export interface SpeciesDef {
  id: string; name: string; carryUnits: number; catchTicks: number; baseValue: number; rarityWeight: number;
  asset?: string | null; rareUpgrade?: RareUpgradeDef | null;
}
export interface ProductDef { id: string; name: string; carryUnits: number; unitPrice: number; asset?: string | null }
export interface ItemQuantity { item: string; quantity: number }
export interface RecipeDef { id: string; machine: string; inputs: ItemQuantity[]; outputs: ItemQuantity[]; durationTicks: number }
export interface MachineDef { id: string; name: string; recipes: string[]; inputCapacityUnits: number; outputCapacityUnits: number }
export type UpgradeEffect =
  | { kind: "carry_capacity"; capacityUnits: number }
  | { kind: "recipe_duration"; machine: string; recipe: string; durationTicks: number }
  | { kind: "catch_speed"; speedPermille: number }
  | { kind: "fish_regen"; speedPermille: number }
  | { kind: "unlock_fishing_spot"; zone: string };
export interface UpgradeDef { id: string; name: string; description: string; cost: number; requires: string[]; effect: UpgradeEffect }
export interface StatGoal { stat: string; atLeast: number }
export interface QuestDef { id: string; name: string; goal: StatGoal }
export type CustomerKind = "standard" | "premium" | "bulk";
export interface ProductWeight { item: string; weight: number }
export interface CustomerDef {
  id: string;
  name: string;
  kind: CustomerKind;
  basketMin: number;
  basketMax: number;
  patienceTicks: number;
  spawnWeight: number;
  priceMultPermille: number;
  preferredProducts: ProductWeight[];
  unmetPriceMultPermille: number;
  unmetPatienceDrainPermille: number;
}
export type TutorialTrigger = { kind: "enter_zone"; zone: string } | ({ kind: "stat" } & StatGoal);
export interface TutorialStepDef { id: string; text: string; advanceOn: TutorialTrigger }
export interface RectMm { id: string; minX: number; minZ: number; maxX: number; maxZ: number }
export type ZoneKind = "fishing" | "machine_input" | "machine_output" | "counter";
export interface ZoneDef extends RectMm { kind: ZoneKind }
export interface FishingSpotDef {
  zone: string;
  species: string[];
  stockMax: number;
  regenTicks: number;
  regenCurvePermille: number[];
  requiresUpgrade?: string | null;
}
export interface StationDef { id: string; machine: string; inputZone: string; outputZone: string }
export interface PointMm { x: number; z: number }
export interface CounterDef {
  id: string;
  /** Products this counter accepts for stocking and sale (content order). */
  products: string[];
  capacityUnits: number; zone: string; checkoutTicks: number; maxQueue: number;
  /** Queue slot i is queueAnchor + i * queueStep. */
  queueAnchor: PointMm; queueStep: PointMm;
}
export const counterAccepts = (c: CounterDef, itemId: string): boolean => c.products.includes(itemId);
export const queueSlot = (c: CounterDef, i: number): PointMm =>
  ({ x: c.queueAnchor.x + i * c.queueStep.x, z: c.queueAnchor.z + i * c.queueStep.z });
/** Periodic rush; active when (tick % periodTicks) is in [startTick, startTick + durationTicks). */
export interface RushWindowDef {
  id: string;
  name: string;
  periodTicks: number;
  startTick: number;
  durationTicks: number;
  spawnSpeedPermille: number;
  queueBonus: number;
}
export interface HarborDef {
  id: string;
  name: string;
  playerSpawn: PointMm;
  walkable: RectMm[];
  obstacles: RectMm[];
  zones: ZoneDef[];
  fishingSpots: FishingSpotDef[];
  stations: StationDef[];
  counters: CounterDef[];
  customerSpawnTicks: number;
  customerEntry: PointMm;
  customerWalkMmPerTick: number;
  /** Intermediate approach points (entry → waypoints → queue). Empty = straight line. */
  customerPathWaypoints: PointMm[];
  rushes: RushWindowDef[];
}

export interface RawContentPack {
  contentVersion: string;
  ticksPerSecond: number;
  player: PlayerDef;
  species: SpeciesDef[];
  products: ProductDef[];
  recipes: RecipeDef[];
  machines: MachineDef[];
  upgrades: UpgradeDef[];
  quests: QuestDef[];
  customers: CustomerDef[];
  tutorial: TutorialStepDef[];
  harbors: HarborDef[];
}

/** Min inclusive, max exclusive (same as RectMm.contains in Kotlin). */
export function rectContains(r: RectMm, x: number, z: number): boolean {
  return x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ;
}
export const rectCenterX = (r: RectMm) => Math.trunc((r.minX + r.maxX) / 2);
export const rectCenterZ = (r: RectMm) => Math.trunc((r.minZ + r.maxZ) / 2);

const byId = <T extends { id: string }>(xs: readonly T[]) => new Map(xs.map((x) => [x.id, x] as const));

export class ContentPack {
  readonly speciesById: Map<string, SpeciesDef>;
  readonly productsById: Map<string, ProductDef>;
  readonly recipesById: Map<string, RecipeDef>;
  readonly machinesById: Map<string, MachineDef>;
  readonly upgradesById: Map<string, UpgradeDef>;
  readonly questsById: Map<string, QuestDef>;
  readonly customersById: Map<string, CustomerDef>;
  readonly harborsById: Map<string, HarborDef>;

  constructor(readonly raw: RawContentPack) {
    this.speciesById = byId(raw.species);
    this.productsById = byId(raw.products);
    this.recipesById = byId(raw.recipes);
    this.machinesById = byId(raw.machines);
    this.upgradesById = byId(raw.upgrades);
    this.questsById = byId(raw.quests);
    this.customersById = byId(raw.customers);
    this.harborsById = byId(raw.harbors);
  }

  get contentVersion() { return this.raw.contentVersion; }
  get player() { return this.raw.player; }
  get tutorial() { return this.raw.tutorial; }
  get customers() { return this.raw.customers; }
  get upgrades() { return this.raw.upgrades; }
  get quests() { return this.raw.quests; }

  carryUnits = (itemId: string): number => {
    const u = this.speciesById.get(itemId)?.carryUnits ?? this.productsById.get(itemId)?.carryUnits;
    if (u === undefined) throw new Error(`Unknown item ${itemId}`);
    return u;
  };

  itemName(itemId: string): string {
    return this.speciesById.get(itemId)?.name ?? this.productsById.get(itemId)?.name ?? itemId;
  }

  isKnownItem(itemId: string): boolean {
    return this.speciesById.has(itemId) || this.productsById.has(itemId);
  }

  harbor(id: string): HarborDef {
    const h = this.harborsById.get(id);
    if (!h) throw new Error(`Unknown harbor ${id}`);
    return h;
  }
}

export class ContentError extends Error {}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

export function loadContent(json: unknown): ContentPack {
  if (!validateSchema(json)) {
    const problems = (validateSchema.errors ?? []).map((e) => `$${e.instancePath.replace(/\//g, ".")}: ${e.message}`);
    throw new ContentError("Content pack failed schema validation:\n" + problems.map((p) => ` - ${p}`).join("\n"));
  }
  const pack = new ContentPack(json as unknown as RawContentPack);
  const problems = validateContent(pack);
  if (problems.length > 0) {
    throw new ContentError("Content pack failed validation:\n" + problems.map((p) => ` - ${p}`).join("\n"));
  }
  return pack;
}

/** Same rules, same order and same messages as ContentValidator.kt. */
export function validateContent(p: ContentPack): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, msg: () => string) => { if (!ok) errors.push(msg()); };
  const r = p.raw;

  check(r.ticksPerSecond === TICKS_PER_SECOND, () =>
    `ticksPerSecond is ${r.ticksPerSecond}; the simulation contract requires ${TICKS_PER_SECOND}`);
  check(r.player.timingWindowStartPermille < r.player.timingWindowEndPermille, () =>
    "player.timingWindowStartPermille must be < timingWindowEndPermille");
  check(r.player.startCatchSpeedPermille >= 1000, () =>
    "player.startCatchSpeedPermille must be >= 1000");
  check(r.player.startFishRegenPermille >= 1000, () =>
    "player.startFishRegenPermille must be >= 1000");

  const allIds = [...r.species, ...r.products, ...r.recipes, ...r.machines, ...r.upgrades, ...r.quests,
    ...r.customers, ...r.tutorial, ...r.harbors].map((x) => x.id);
  duplicates(allIds).forEach((id) => errors.push(`Duplicate id '${id}'`));

  const unitsOrZero = (item: string) => p.speciesById.get(item)?.carryUnits ?? p.productsById.get(item)?.carryUnits ?? 0;

  for (const sp of r.species) {
    const ru = sp.rareUpgrade;
    if (ru) {
      check(p.speciesById.has(ru.to), () => `${sp.id}: rareUpgrade.to unknown species '${ru.to}'`);
      check(ru.to !== sp.id, () => `${sp.id}: rareUpgrade.to must differ from the base species`);
      const target = p.speciesById.get(ru.to);
      if (target) {
        check(target.carryUnits === sp.carryUnits, () =>
          `${sp.id}: rareUpgrade target must share carryUnits with the base species`);
      }
    }
  }
  for (const rc of r.recipes) {
    check(p.machinesById.has(rc.machine), () => `${rc.id}: unknown machine '${rc.machine}'`);
    [...rc.inputs, ...rc.outputs].forEach((iq) => check(p.isKnownItem(iq.item), () => `${rc.id}: unknown item '${iq.item}'`));
    check(rc.inputs.length > 0 && rc.outputs.length > 0, () => `${rc.id}: needs inputs and outputs`);
  }
  for (const m of r.machines) {
    for (const rid of m.recipes) {
      const rc = p.recipesById.get(rid);
      check(rc !== undefined, () => `${m.id}: unknown recipe '${rid}'`);
      if (rc) {
        check(rc.machine === m.id, () => `${m.id}: recipe '${rid}' belongs to '${rc.machine}'`);
        const inUnits = rc.inputs.reduce((s, iq) => s + unitsOrZero(iq.item) * iq.quantity, 0);
        const outUnits = rc.outputs.reduce((s, iq) => s + unitsOrZero(iq.item) * iq.quantity, 0);
        check(inUnits <= m.inputCapacityUnits, () => `${m.id}: input capacity too small for '${rid}'`);
        check(outUnits <= m.outputCapacityUnits, () => `${m.id}: output capacity too small for '${rid}'`);
      }
    }
  }

  for (const u of r.upgrades) {
    u.requires.forEach((req) => check(p.upgradesById.has(req) || p.questsById.has(req), () => `${u.id}: unknown requirement '${req}'`));
    const e = u.effect;
    if (e.kind === "carry_capacity") {
      check(e.capacityUnits > r.player.startCarryCapacityUnits, () => `${u.id}: carry capacity does not exceed the starting capacity`);
    } else if (e.kind === "recipe_duration") {
      check(p.machinesById.has(e.machine), () => `${u.id}: unknown machine '${e.machine}'`);
      check(p.recipesById.has(e.recipe), () => `${u.id}: unknown recipe '${e.recipe}'`);
    } else if (e.kind === "catch_speed") {
      check(e.speedPermille > r.player.startCatchSpeedPermille, () =>
        `${u.id}: catch speed does not exceed the starting catch speed`);
    } else if (e.kind === "fish_regen") {
      check(e.speedPermille > r.player.startFishRegenPermille, () =>
        `${u.id}: fish regen does not exceed the starting fish regen`);
    } else {
      const spot = r.harbors.flatMap((h) => h.fishingSpots).find((f) => f.zone === e.zone);
      check(!!spot, () => `${u.id}: unlock_fishing_spot unknown zone '${e.zone}'`);
      check(spot?.requiresUpgrade === u.id, () =>
        `${u.id}: unlock_fishing_spot zone must list this upgrade as requiresUpgrade`);
    }
  }
  const cycle = findUpgradeCycle(p);
  if (cycle) errors.push(`Upgrade requirement cycle: ${cycle.join(" -> ")}`);

  for (const c of r.customers) {
    check(c.basketMax >= c.basketMin, () => `${c.id}: basketMax < basketMin`);
    check(c.priceMultPermille >= 1000, () => `${c.id}: priceMultPermille must be >= 1000`);
    check(c.unmetPriceMultPermille >= 1 && c.unmetPriceMultPermille <= 1000, () =>
      `${c.id}: unmetPriceMultPermille must be 1..1000`);
    check(c.unmetPatienceDrainPermille >= 1000, () =>
      `${c.id}: unmetPatienceDrainPermille must be >= 1000`);
    if (c.kind === "premium") {
      check(c.priceMultPermille > 1000, () => `${c.id}: premium customers must tip (priceMultPermille > 1000)`);
    }
    if (c.kind === "bulk") {
      check(c.basketMin >= 5, () => `${c.id}: bulk customers need basketMin >= 5`);
    }
    for (const pw of c.preferredProducts) {
      check(p.productsById.has(pw.item), () => `${c.id}: preferred product unknown '${pw.item}'`);
    }
    if (c.preferredProducts.length > 0) {
      const sellable = new Set(r.harbors.flatMap((h) => h.counters.flatMap((ct) => ct.products)));
      for (const pw of c.preferredProducts) {
        check(sellable.has(pw.item), () => `${c.id}: preferred '${pw.item}' is not sold at any counter`);
      }
    }
  }

  for (const h of r.harbors) {
    const zones = new Map(h.zones.map((z) => [z.id, z]));
    const open = (x: number, z: number) => h.walkable.some((w) => rectContains(w, x, z)) && !h.obstacles.some((o) => rectContains(o, x, z));
    check(h.walkable.some((w) => rectContains(w, h.playerSpawn.x, h.playerSpawn.z)), () => `${h.id}: spawn is not walkable`);
    check(!h.obstacles.some((o) => rectContains(o, h.playerSpawn.x, h.playerSpawn.z)), () => `${h.id}: spawn is inside an obstacle`);
    const fishingZoneIds = new Set(h.zones.filter((z) => z.kind === "fishing").map((z) => z.id));
    const spotZoneIds = new Set(h.fishingSpots.map((f) => f.zone));
    check(
      fishingZoneIds.size === spotZoneIds.size && [...fishingZoneIds].every((id) => spotZoneIds.has(id)),
      () => `${h.id}: fishing zones and fishingSpots must cover the same zone ids`,
    );
    for (const f of h.fishingSpots) {
      check(zones.get(f.zone)?.kind === "fishing", () => `${h.id}: '${f.zone}' is not a fishing zone`);
      f.species.forEach((s) => check(p.speciesById.has(s), () => `${h.id}: unknown species '${s}'`));
      check(f.regenCurvePermille.length >= 2, () => `${h.id}: '${f.zone}' regenCurvePermille needs >= 2 entries`);
      if (f.requiresUpgrade) {
        check(p.upgradesById.has(f.requiresUpgrade), () => `${h.id}: '${f.zone}' requiresUpgrade unknown '${f.requiresUpgrade}'`);
      }
    }
    for (const s of h.stations) {
      check(p.machinesById.has(s.machine), () => `${s.id}: unknown machine '${s.machine}'`);
      check(zones.get(s.inputZone)?.kind === "machine_input", () => `${s.id}: bad input zone`);
      check(zones.get(s.outputZone)?.kind === "machine_output", () => `${s.id}: bad output zone`);
    }
    const CUSTOMER_PATH_RADIUS_MM = 200;
    const CUSTOMER_PATH_SAMPLE_MM = 200;
    const openForCustomer = (x: number, z: number): boolean => {
      if (!h.walkable.some((w) => rectContains(w, x, z))) return false;
      const r = CUSTOMER_PATH_RADIUS_MM;
      return !h.obstacles.some((o) =>
        x >= o.minX - r && x < o.maxX + r && z >= o.minZ - r && z < o.maxZ + r);
    };
    const segmentClear = (a: PointMm, b: PointMm): boolean => {
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.max(1, SafeMath.isqrt(dx * dx + dz * dz));
      for (let d = 0; d <= dist; d += CUSTOMER_PATH_SAMPLE_MM) {
        const x = a.x + Math.trunc((dx * d) / dist);
        const z = a.z + Math.trunc((dz * d) / dist);
        if (!openForCustomer(x, z)) return false;
      }
      return openForCustomer(b.x, b.z);
    };
    check(open(h.customerEntry.x, h.customerEntry.z), () => `${h.id}: customer entry is not on open walkable ground`);
    const waypoints = h.customerPathWaypoints ?? [];
    waypoints.forEach((wp, i) => {
      check(openForCustomer(wp.x, wp.z), () => `${h.id}: customerPathWaypoints[${i}] is not on open walkable ground`);
    });
    const rushes = h.rushes ?? [];
    const rushQueueBonus = rushes.reduce((m, r) => Math.max(m, r.queueBonus), 0);
    for (const rush of rushes) {
      check(rush.startTick + rush.durationTicks <= rush.periodTicks, () =>
        `${rush.id}: rush window must fit inside periodTicks (no wrap)`);
      check(rush.spawnSpeedPermille >= 1000, () =>
        `${rush.id}: spawnSpeedPermille must be >= 1000 (rushes only speed up spawns)`);
    }
    duplicates(rushes.map((r) => r.id)).forEach((id) => errors.push(`${h.id}: duplicate rush '${id}'`));
    for (let i = 0; i < rushes.length; i++) {
      for (let j = i + 1; j < rushes.length; j++) {
        const a = rushes[i]!;
        const b = rushes[j]!;
        if (a.periodTicks !== b.periodTicks) continue;
        const aEnd = a.startTick + a.durationTicks;
        const bEnd = b.startTick + b.durationTicks;
        check(!(a.startTick < bEnd && b.startTick < aEnd), () =>
          `${h.id}: rushes '${a.id}' and '${b.id}' overlap`);
      }
    }
    for (const c of h.counters) {
      check(c.products.length > 0, () => `${c.id}: needs at least one product`);
      c.products.forEach((pid) => check(p.productsById.has(pid), () => `${c.id}: unknown product '${pid}'`));
      check(new Set(c.products).size === c.products.length, () => `${c.id}: duplicate products`);
      check(zones.get(c.zone)?.kind === "counter", () => `${c.id}: bad counter zone`);
      for (let i = 0; i < c.maxQueue + rushQueueBonus; i++) {
        const slot = queueSlot(c, i);
        check(open(slot.x, slot.z), () => `${c.id}: queue slot ${i} is not on open walkable ground`);
        const path = [h.customerEntry, ...waypoints, slot];
        for (let s = 0; s < path.length - 1; s++) {
          check(segmentClear(path[s]!, path[s + 1]!), () =>
            `${c.id}: customer path to queue slot ${i} crosses blocked ground`);
        }
      }
    }
    for (const z of h.zones) {
      check(open(rectCenterX(z), rectCenterZ(z)), () => `${h.id}: zone '${z.id}' centre is not on open walkable ground`);
    }
    duplicates([...h.zones, ...h.stations, ...h.counters].map((x) => x.id)).forEach((id) => errors.push(`${h.id}: duplicate '${id}'`));
    check(zones.size > 0, () => `${h.id}: no zones`);
  }

  for (const t of r.tutorial) {
    const trig = t.advanceOn;
    if (trig.kind === "enter_zone") {
      check(r.harbors.some((h) => h.zones.some((z) => z.id === trig.zone)), () => `${t.id}: unknown zone '${trig.zone}'`);
    }
  }
  return errors;
}

function duplicates(ids: string[]): string[] {
  const counts = new Map<string, number>();
  ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  return [...counts].filter(([, n]) => n > 1).map(([id]) => id);
}

function findUpgradeCycle(p: ContentPack): string[] | null {
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === 1) return [...stack.slice(stack.indexOf(id)), id];
    if (s === 2) return null;
    state.set(id, 1);
    stack.push(id);
    for (const req of p.upgradesById.get(id)?.requires ?? []) {
      if (p.upgradesById.has(req)) {
        const c = visit(req);
        if (c) return c;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const u of p.raw.upgrades) {
    const c = visit(u.id);
    if (c) return c;
  }
  return null;
}
