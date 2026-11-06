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
  | { kind: "unlock_fishing_spot"; zone: string }
  | { kind: "worker_move_speed"; speedPermille: number }
  | { kind: "worker_carry"; capacityUnits: number }
  | { kind: "worker_catch_speed"; speedPermille: number }
  | { kind: "worker_wage"; coinsPerWorkerPerHour: number }
  /** Subtracted from economy.maintenanceCoinsPerStation (floored at 0). */
  | { kind: "maintenance_discount"; coinsOffPerStation: number }
  /** Multiplies bag fish spoilage period (2000 = half as fast). */
  | { kind: "bag_spoil_resist"; periodMultPermille: number };
export interface UpgradeDef { id: string; name: string; description: string; cost: number; requires: string[]; effect: UpgradeEffect }
export interface StatGoal { stat: string; atLeast: number }
export interface QuestReward { coins: number; unlockUpgrades: string[] }
export interface QuestDef {
  id: string;
  name: string;
  description: string;
  requires: string[];
  goal: StatGoal;
  reward: QuestReward;
}
export type WorkerRoleKind = "fisher" | "porter" | "operator" | "cashier" | "supervisor";
export interface WorkerDef {
  id: string;
  name: string;
  role: WorkerRoleKind;
  hireCost: number;
  maxHired: number;
  carryCapacityUnits: number;
  moveSpeedMmPerTick: number;
  catchSpeedPermille: number;
  transferIntervalTicks: number;
  leaseTicks: number;
  requires: string[];
}

/** Weights for scoring worker haul candidates (urgency / distance / demand). */
export interface RoutingDef {
  urgencyWeight: number;
  distanceWeight: number;
  demandWeight: number;
  /** Multiplies demandWeight while a supervisor is on duty (1000 = unchanged). */
  supervisorDemandBoostPermille: number;
}

/** Offline catch-up: how long absence is simulated when loading / resuming. */
export interface OfflineDef {
  capHours: number;
  /** Absences shorter than this do not show the summary screen. */
  summaryMinSeconds: number;
}

/** Soft economy pressure: station upkeep + counter/bag spoilage (Phase 19). */
export interface EconomyDef {
  requires: string[];
  maintenancePeriodTicks: number;
  maintenanceCoinsPerStation: number;
  counterSpoilPeriodTicks: number;
  counterSpoilUnits: number;
  bagFishSpoilPeriodTicks: number;
  bagFishSpoilUnits: number;
}

export interface PrestigeRewardDef {
  coins: number;
  /** 0 = none; otherwise permanent catch-speed floor in permille. */
  catchSpeedPermille: number;
  /** 0 = none; otherwise permanent sale price multiplier floor in permille. */
  priceBonusPermille: number;
  /** Optional cosmetic / banner id stored on the save. */
  cosmetic?: string | null;
}

export interface PrestigeMilestoneDef {
  id: string;
  name: string;
  description: string;
  requires: string[];
  goal: StatGoal;
  reward: PrestigeRewardDef;
}

/** Prestige-lite board: permanent bonuses without wiping the run (Phase 20). */
export interface PrestigeDef {
  requires: string[];
  /** Revenue thresholds for harbor rating stars 1..5 (non-decreasing). */
  ratingThresholds: number[];
  milestones: PrestigeMilestoneDef[];
}

export interface ContractTemplateDef {
  id: string;
  name: string;
  description: string;
  item: string;
  quantity: number;
  durationTicks: number;
  payout: number;
  penalty: number;
  weight: number;
}

/** Harbor contract board: rotating offers with timed deliveries. */
export interface ContractsDef {
  boardSlots: number;
  maxActive: number;
  refreshPeriodTicks: number;
  /** Quest / upgrade IDs required before the board posts offers. */
  requires: string[];
  templates: ContractTemplateDef[];
}
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
  /** Quest / upgrade IDs required before the player may travel here. */
  requires: string[];
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
  /** GLB filename under models/, matching generate_blockout.py. */
  blockoutAsset: string;
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
  workers: WorkerDef[];
  routing: RoutingDef;
  offline: OfflineDef;
  /** Soft coin/stock sinks after early progression (Phase 19). */
  economy: EconomyDef;
  /** End-of-run prestige milestones (Phase 20); additive, never wipes the save. */
  prestige: PrestigeDef;
  contracts: ContractsDef;
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
  readonly workersById: Map<string, WorkerDef>;
  readonly prestigeMilestonesById: Map<string, PrestigeMilestoneDef>;
  readonly contractTemplatesById: Map<string, ContractTemplateDef>;
  readonly customersById: Map<string, CustomerDef>;
  readonly harborsById: Map<string, HarborDef>;

  constructor(readonly raw: RawContentPack) {
    for (const h of raw.harbors) {
      h.requires = h.requires ?? [];
      h.customerPathWaypoints = h.customerPathWaypoints ?? [];
      h.rushes = h.rushes ?? [];
      h.blockoutAsset = `${h.id.includes(".") ? h.id.slice(h.id.indexOf(".") + 1) : h.id}_blockout.glb`;
    }
    this.speciesById = byId(raw.species);
    this.productsById = byId(raw.products);
    this.recipesById = byId(raw.recipes);
    this.machinesById = byId(raw.machines);
    this.upgradesById = byId(raw.upgrades);
    this.questsById = byId(raw.quests);
    this.workersById = byId(raw.workers);
    this.prestigeMilestonesById = byId(raw.prestige.milestones);
    this.contractTemplatesById = byId(raw.contracts.templates);
    this.customersById = byId(raw.customers);
    this.harborsById = byId(raw.harbors);
  }

  get contentVersion() { return this.raw.contentVersion; }
  get player() { return this.raw.player; }
  get tutorial() { return this.raw.tutorial; }
  get customers() { return this.raw.customers; }
  get upgrades() { return this.raw.upgrades; }
  get quests() { return this.raw.quests; }
  get workers() { return this.raw.workers; }
  get routing() { return this.raw.routing; }
  get offline() { return this.raw.offline; }
  get economy() { return this.raw.economy; }
  get prestige() { return this.raw.prestige; }
  get contracts() { return this.raw.contracts; }
  get harbors() { return this.raw.harbors; }

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
    ...r.workers, ...r.prestige.milestones, ...r.contracts.templates, ...r.customers, ...r.tutorial, ...r.harbors].map((x) => x.id);
  duplicates(allIds).forEach((id) => errors.push(`Duplicate id '${id}'`));

  for (const w of r.workers) {
    check(w.hireCost >= 0, () => `${w.id}: hireCost must be >= 0`);
    check(w.maxHired >= 1, () => `${w.id}: maxHired must be >= 1`);
    check(w.catchSpeedPermille >= 1, () => `${w.id}: catchSpeedPermille must be >= 1`);
  }
  check(r.workers.some((w) => w.role === "fisher"), () => "content needs at least one fisher worker");
  check(r.workers.some((w) => w.role === "porter"), () => "content needs at least one porter worker");
  check(r.workers.some((w) => w.role === "operator"), () => "content needs at least one operator worker");
  check(r.workers.some((w) => w.role === "cashier"), () => "content needs at least one cashier worker");
  check(r.workers.some((w) => w.role === "supervisor"), () => "content needs at least one supervisor worker");
  check(r.routing.urgencyWeight >= 0, () => "routing.urgencyWeight must be >= 0");
  check(r.routing.distanceWeight >= 0, () => "routing.distanceWeight must be >= 0");
  check(r.routing.demandWeight >= 0, () => "routing.demandWeight must be >= 0");
  check(r.routing.supervisorDemandBoostPermille >= 1, () => "routing.supervisorDemandBoostPermille must be >= 1");
  check(r.offline.capHours >= 1, () => "offline.capHours must be >= 1");
  check(r.offline.summaryMinSeconds >= 0, () => "offline.summaryMinSeconds must be >= 0");
  check(r.economy.maintenancePeriodTicks >= 1, () => "economy.maintenancePeriodTicks must be >= 1");
  check(r.economy.maintenanceCoinsPerStation >= 0, () => "economy.maintenanceCoinsPerStation must be >= 0");
  check(r.economy.counterSpoilPeriodTicks >= 1, () => "economy.counterSpoilPeriodTicks must be >= 1");
  check(r.economy.counterSpoilUnits >= 0, () => "economy.counterSpoilUnits must be >= 0");
  check(r.economy.bagFishSpoilPeriodTicks >= 1, () => "economy.bagFishSpoilPeriodTicks must be >= 1");
  check(r.economy.bagFishSpoilUnits >= 0, () => "economy.bagFishSpoilUnits must be >= 0");
  const economyRequirable = new Set([...p.upgradesById.keys(), ...p.questsById.keys()]);
  for (const req of r.economy.requires) {
    check(economyRequirable.has(req), () => `economy: unknown requirement '${req}'`);
  }
  check(r.prestige.ratingThresholds.length === 5, () => "prestige.ratingThresholds must have exactly 5 entries");
  check(r.prestige.milestones.length > 0, () => "prestige.milestones must not be empty");
  for (let i = 1; i < r.prestige.ratingThresholds.length; i++) {
    check(r.prestige.ratingThresholds[i]! >= r.prestige.ratingThresholds[i - 1]!, () =>
      "prestige.ratingThresholds must be non-decreasing");
  }
  check(r.contracts.boardSlots >= 1, () => "contracts.boardSlots must be >= 1");
  check(r.contracts.maxActive >= 1, () => "contracts.maxActive must be >= 1");
  check(r.contracts.refreshPeriodTicks >= 1, () => "contracts.refreshPeriodTicks must be >= 1");
  check(r.contracts.templates.length > 0, () => "contracts.templates must not be empty");
  const contractRequirable = new Set([...p.upgradesById.keys(), ...p.questsById.keys()]);
  for (const req of r.contracts.requires) {
    check(contractRequirable.has(req), () => `contracts: unknown requirement '${req}'`);
  }
  for (const t of r.contracts.templates) {
    check(p.isKnownItem(t.item), () => `${t.id}: unknown item '${t.item}'`);
    check(t.quantity >= 1, () => `${t.id}: quantity must be >= 1`);
    check(t.durationTicks >= 1, () => `${t.id}: durationTicks must be >= 1`);
    check(t.payout >= 0, () => `${t.id}: payout must be >= 0`);
    check(t.penalty >= 0, () => `${t.id}: penalty must be >= 0`);
    check(t.weight >= 1, () => `${t.id}: weight must be >= 1`);
  }

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
    } else if (e.kind === "unlock_fishing_spot") {
      const spot = r.harbors.flatMap((h) => h.fishingSpots).find((f) => f.zone === e.zone);
      check(!!spot, () => `${u.id}: unlock_fishing_spot unknown zone '${e.zone}'`);
      check(spot?.requiresUpgrade === u.id, () =>
        `${u.id}: unlock_fishing_spot zone must list this upgrade as requiresUpgrade`);
    } else if (e.kind === "worker_move_speed") {
      check(e.speedPermille > 1000, () => `${u.id}: worker_move_speed must exceed 1000 (base speed)`);
    } else if (e.kind === "worker_carry") {
      const minCarry = r.workers.reduce((m, w) => Math.min(m, w.carryCapacityUnits), Number.POSITIVE_INFINITY);
      check(e.capacityUnits > minCarry, () => `${u.id}: worker_carry must exceed the smallest role carry capacity`);
    } else if (e.kind === "worker_catch_speed") {
      check(e.speedPermille >= 1000, () => `${u.id}: worker_catch_speed must be >= 1000`);
    } else if (e.kind === "worker_wage") {
      check(e.coinsPerWorkerPerHour >= 1, () => `${u.id}: worker_wage must be >= 1`);
    } else if (e.kind === "maintenance_discount") {
      check(e.coinsOffPerStation >= 1, () => `${u.id}: maintenance_discount must be >= 1`);
    } else if (e.kind === "bag_spoil_resist") {
      check(e.periodMultPermille > 1000, () => `${u.id}: bag_spoil_resist must exceed 1000`);
    }
  }
  const cycle = findUpgradeCycle(p);
  if (cycle) errors.push(`Upgrade requirement cycle: ${cycle.join(" -> ")}`);

  const requirable = new Set([...p.upgradesById.keys(), ...p.questsById.keys()]);
  for (const q of r.quests) {
    for (const req of q.requires) {
      check(requirable.has(req), () => `${q.id}: unknown requirement '${req}'`);
    }
    check(q.reward.coins >= 0, () => `${q.id}: reward.coins must be >= 0`);
    for (const uid of q.reward.unlockUpgrades) {
      check(p.upgradesById.has(uid), () => `${q.id}: unknown reward upgrade '${uid}'`);
    }
  }
  const questCycle = findQuestCycle(p);
  if (questCycle) errors.push(`Quest requirement cycle: ${questCycle.join(" -> ")}`);

  const prestigeRequirable = new Set([...requirable, ...p.prestigeMilestonesById.keys()]);
  for (const req of r.prestige.requires) {
    check(prestigeRequirable.has(req), () => `prestige: unknown requirement '${req}'`);
  }
  for (const m of r.prestige.milestones) {
    for (const req of m.requires) {
      check(prestigeRequirable.has(req), () => `${m.id}: unknown requirement '${req}'`);
    }
    check(m.reward.coins >= 0, () => `${m.id}: reward.coins must be >= 0`);
    if (m.reward.catchSpeedPermille > 0) {
      check(m.reward.catchSpeedPermille >= 1000, () =>
        `${m.id}: catchSpeedPermille must be 0 or >= 1000`);
    }
    if (m.reward.priceBonusPermille > 0) {
      check(m.reward.priceBonusPermille >= 1000, () =>
        `${m.id}: priceBonusPermille must be 0 or >= 1000`);
    }
    const cos = m.reward.cosmetic;
    if (cos != null) {
      check(cos.trim().length > 0, () => `${m.id}: cosmetic must be non-empty when set`);
    }
  }
  const prestigeCycle = findPrestigeCycle(p);
  if (prestigeCycle) errors.push(`Prestige requirement cycle: ${prestigeCycle.join(" -> ")}`);

  for (const w of r.workers) {
    for (const req of w.requires) {
      check(requirable.has(req), () => `${w.id}: unknown requirement '${req}'`);
    }
  }

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
    for (const req of h.requires) {
      check(p.upgradesById.has(req) || p.questsById.has(req), () => `${h.id}: unknown requirement '${req}'`);
    }
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

function findQuestCycle(p: ContentPack): string[] | null {
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === 1) return [...stack.slice(stack.indexOf(id)), id];
    if (s === 2) return null;
    state.set(id, 1);
    stack.push(id);
    for (const req of p.questsById.get(id)?.requires ?? []) {
      if (p.questsById.has(req)) {
        const c = visit(req);
        if (c) return c;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const q of p.raw.quests) {
    const c = visit(q.id);
    if (c) return c;
  }
  return null;
}

/** Depth-first search over prestige -> required prestige edges. */
function findPrestigeCycle(p: ContentPack): string[] | null {
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === 1) return [...stack.slice(stack.indexOf(id)), id];
    if (s === 2) return null;
    state.set(id, 1);
    stack.push(id);
    for (const req of p.prestigeMilestonesById.get(id)?.requires ?? []) {
      if (p.prestigeMilestonesById.has(req)) {
        const c = visit(req);
        if (c) return c;
      }
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const m of p.raw.prestige.milestones) {
    const c = visit(m.id);
    if (c) return c;
  }
  return null;
}
