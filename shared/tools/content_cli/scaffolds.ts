/**
 * Finish 2.0/3.0/4.0/5.0/6.0 content JSON scaffolds.
 * Generates schema-shaped fragments; does not mutate content-pack.json.
 */
import { normalizeSlug, qualifyId, titleFromSlug, type ScaffoldKind } from "./ids";

export interface ScaffoldRequest {
  kind: ScaffoldKind;
  id: string;
  name?: string;
  description?: string;
  /** Species base value override. */
  baseValue?: number;
  /** Quest goal stat id (default stat.fish_caught). */
  goalStat?: string;
  /** Quest goal atLeast (default 5). */
  goalAtLeast?: number;
  /** Harbor/quest/bait requires (default empty). */
  requires?: string[];
  /** Fishing spot species ids (default species.harbor_herring). */
  fishingSpecies?: string[];
  /** Contract delivery item id (default species.silver_sprat). */
  item?: string;
  /** Contract quantity (default 3). */
  quantity?: number;
  /** Bait/decor/contract cost or payout hint. */
  cost?: number;
  /** Decor patience bonus ticks (default 20). */
  patienceBonusTicks?: number;
  /** Machine recipe ids (default recipe.basic_portions). */
  recipes?: string[];
  /** Machine input capacity (default 8). */
  inputCapacityUnits?: number;
  /** Machine output capacity (default 12). */
  outputCapacityUnits?: number;
  /** Rival harbor ids (default harbor.sunrise_pier). */
  harbors?: string[];
  /** Rival specialty product ids. */
  specialtyProducts?: string[];
  /** Rival aggression permille (default 400). */
  aggressionPermille?: number;
  /** Rival undercut price mult permille (default 900). */
  undercutPriceMultPermille?: number;
  /** Rival AI profile. */
  aiProfile?: "siphon" | "undercut" | "adaptive" | "roamer";
  /** Seasonal period ticks (default 21000). */
  periodTicks?: number;
  /** Seasonal start tick (default 100). */
  startTick?: number;
  /** Seasonal duration ticks (default 1500). */
  durationTicks?: number;
  /** Endgame prestige gate (default 8). */
  requiresPrestigeCount?: number;
  /** Cosmetic SKU override. */
  sku?: string;
  /** Delivery chain step count (default 3). */
  steps?: number;
  /** Chain/sigil/modpack harbor gate. */
  requiresHarbor?: string;
  /** Modular pack included scaffold kinds. */
  includes?: string[];
}

export interface ScaffoldResult {
  kind: ScaffoldKind;
  id: string;
  fileName: string;
  document: Record<string, unknown>;
}

function rect(
  id: string,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  kind?: string,
): Record<string, unknown> {
  const r: Record<string, unknown> = { id, minX, minZ, maxX, maxZ };
  if (kind) r.kind = kind;
  return r;
}

export function scaffoldSpecies(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("species", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const document = {
    id,
    name,
    carryUnits: 1,
    catchTicks: 100,
    baseValue: req.baseValue ?? 3,
    rarityWeight: 50,
    asset: `models/fish_${slug}.glb`,
    spoilTier: 2,
  };
  return { kind: "species", id, fileName: `${id}.json`, document };
}

export function scaffoldQuest(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("quest", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold for ${name}. Replace goal/rewards before merging into content-pack.json.`;
  const document = {
    id,
    name,
    description,
    requires: req.requires ?? [],
    goal: {
      stat: req.goalStat ?? "stat.fish_caught",
      atLeast: req.goalAtLeast ?? 5,
    },
    reward: {
      coins: 25,
      unlockUpgrades: [] as string[],
    },
  };
  return { kind: "quest", id, fileName: `${id}.json`, document };
}

/**
 * Compact harbor stub meeting content-pack.schema harbor required fields.
 * Uses existing machine/product/species ids so fragment schema validates.
 */
export function scaffoldHarbor(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("harbor", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const prefix = slug.replace(/_/g, "").slice(0, 6) || "hb";
  const species = req.fishingSpecies?.length
    ? req.fishingSpecies
    : ["species.harbor_herring", "species.silver_sprat"];

  const document: Record<string, unknown> = {
    id,
    name,
    playerSpawn: { x: 0, z: 0 },
    walkable: [rect("area.land", -6000, -6000, 8000, 6000)],
    obstacles: [
      rect("footprint.cutter_1", 2000, -3000, 3600, -1400),
      rect("footprint.counter_1", 1500, 2500, 4000, 3500),
    ],
    zones: [
      rect("zone.pier_end", -5500, -800, -3500, 800, "fishing"),
      rect("zone.cutter_in", 1800, -3200, 2800, -2200, "machine_input"),
      rect("zone.cutter_out", 2800, -3200, 3800, -2200, "machine_output"),
      rect("zone.counter_1", 1600, 2200, 3900, 3200, "counter"),
      rect("zone.kiosk_1", -1000, 2000, 0, 3000, "kiosk"),
      rect("zone.plot_grill", 4500, -3000, 5500, -2000, "plot"),
    ],
    fishingSpots: [
      {
        zone: "zone.pier_end",
        species,
        stockMax: 12,
        regenTicks: 45,
        regenCurvePermille: [2000, 1500, 1100, 850, 650],
        dayPartRegenMultPermille: {
          dawn: 800,
          day: 1000,
          dusk: 900,
          night: 1300,
        },
      },
    ],
    stations: [
      {
        id: "station.cutter_1",
        machine: "machine.basic_cutter",
        inputZone: "zone.cutter_in",
        outputZone: "zone.cutter_out",
      },
    ],
    counters: [
      {
        id: "counter.retail_1",
        kind: "retail",
        products: ["product.basic_portion", "product.fillet"],
        capacityUnits: 20,
        zone: "zone.counter_1",
        footprint: "footprint.counter_1",
        checkoutTicks: 20,
        maxQueue: 3,
        queueAnchor: { x: 2800, z: 4200 },
        queueStep: { x: -900, z: 0 },
      },
    ],
    plots: [
      {
        id: `plot.${slug}_grill`,
        name: "Grill expansion",
        description: `Scaffold plot for ${name}. Point grantsUpgrade at a real unlock before merge.`,
        zone: "zone.plot_grill",
        grantsUpgrade: "upgrade.harbor_grill",
      },
    ],
    customerSpawnTicks: 160,
    customerEntry: { x: 5000, z: 5000 },
    customerWalkMmPerTick: 100,
    customerPathWaypoints: [
      { x: 3500, z: 4500 },
      { x: 2500, z: 3800 },
    ],
    rushes: [
      {
        id: `rush.${prefix}_lunch`,
        name: "Lunch rush",
        periodTicks: 2400,
        startTick: 600,
        durationTicks: 400,
        spawnSpeedPermille: 2200,
        queueBonus: 2,
        priceMultPermille: 1100,
      },
    ],
    requires: req.requires ?? [],
    specialization: {
      id: `spec.${slug}_docks`,
      name: `${name} docks`,
      description: `Authoring scaffold specialization for ${name}.`,
      maintenanceDiscountPerStation: 0,
      rareChanceBonusPermille: 0,
      kindSpawnMultPermille: {},
    },
  };

  return { kind: "harbor", id, fileName: `${id}.json`, document };
}

/** Finish 3.0 Phase 28 — contract template fragment. */
export function scaffoldContract(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("contract", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold contract for ${name}. Tune payout/penalty before merging.`;
  const document = {
    id,
    name,
    description,
    item: req.item ?? "species.silver_sprat",
    quantity: req.quantity ?? 3,
    durationTicks: 1800,
    payout: req.cost ?? 40,
    penalty: 10,
    weight: 20,
  };
  return { kind: "contract", id, fileName: `${id}.json`, document };
}

/** Finish 3.0 Phase 28 — bait fragment. */
export function scaffoldBait(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("bait", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold bait for ${name}. Adjust rare weights before merge.`;
  const document = {
    id,
    name,
    description,
    carryUnits: 1,
    packQuantity: 3,
    cost: req.cost ?? 25,
    rareSpeciesWeightMultPermille: 1200,
    rareChanceBonusPermille: 50,
    requires: req.requires ?? [],
  };
  return { kind: "bait", id, fileName: `${id}.json`, document };
}

/** Finish 3.0 Phase 28 — shop decor fragment. */
export function scaffoldDecor(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("decor", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold decor for ${name}. Optional requiresCosmetic before merge.`;
  const document = {
    id,
    name,
    description,
    cost: req.cost ?? 100,
    requiresCosmetic: null as string | null,
    patienceBonusTicks: req.patienceBonusTicks ?? 20,
  };
  return { kind: "decor", id, fileName: `${id}.json`, document };
}

/** Finish 4.0 Phase 28 — machine fragment. */
export function scaffoldMachine(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("machine", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const recipes = req.recipes?.length ? req.recipes : ["recipe.basic_portions"];
  const document = {
    id,
    name,
    recipes,
    inputCapacityUnits: req.inputCapacityUnits ?? 8,
    outputCapacityUnits: req.outputCapacityUnits ?? 12,
  };
  return { kind: "machine", id, fileName: `${id}.json`, document };
}

/** Finish 4.0 Phase 28 — rival market NPC fragment. */
export function scaffoldRival(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("rival", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold rival for ${name}. Tune harbors/specialty before merge.`;
  const document = {
    id,
    name,
    description,
    harbors: req.harbors?.length ? req.harbors : ["harbor.sunrise_pier"],
    aggressionPermille: req.aggressionPermille ?? 400,
    specialtyProducts: req.specialtyProducts?.length
      ? req.specialtyProducts
      : ["product.basic_portion", "product.fillet"],
    undercutPriceMultPermille: req.undercutPriceMultPermille ?? 900,
    activeDayParts: ["dawn", "day"],
    aiProfile: req.aiProfile ?? "siphon",
  };
  return { kind: "rival", id, fileName: `${id}.json`, document };
}

/** Finish 5.0 Phase 28 — seasonal event fragment. */
export function scaffoldSeasonal(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("seasonal", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold seasonal event for ${name}. Tune multipliers before merge.`;
  const document = {
    id,
    name,
    description,
    periodTicks: req.periodTicks ?? 21000,
    startTick: req.startTick ?? 100,
    durationTicks: req.durationTicks ?? 1500,
    banner: `banner.${slug}`,
    customerSpawnMultPermille: 1300,
    priceMultPermille: 1100,
    festivalCustomerIds: [] as string[],
    speciesWeightMultPermille: {} as Record<string, number>,
  };
  return { kind: "seasonal", id, fileName: `${id}.json`, document };
}

/** Finish 5.0 Phase 28 — endgame tier fragment. */
export function scaffoldEndgame(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("endgame", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold endgame tier for ${name}. Tune gates/rewards before merge.`;
  const document = {
    id,
    name,
    description,
    requiresPrestigeCount: req.requiresPrestigeCount ?? 8,
    requiresRivalBeats: 0,
    requiresChallenges: 0,
    catchSpeedPermille: 1025,
    priceBonusPermille: 1025,
    coins: req.cost ?? 400,
    requiresMarks: 0,
    requiresCrests: 0,
  };
  return { kind: "endgame", id, fileName: `${id}.json`, document };
}

/** Finish 5.0 Phase 28 — cosmetic entitlement fragment (billing, not content-pack). */
export function scaffoldCosmetic(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("cosmetic", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `${name}. Visual only — never changes rates, wages, or sale prices.`;
  const sku = req.sku?.trim() || `fish.cosmetic.${slug}`;
  const document = {
    id,
    sku,
    androidProductId: `fish_cosmetic_${slug}`,
    webProductId: sku,
    grantsCosmetic: `banner.iap_${slug}`,
    type: "non_consumable",
    powerNeutral: true,
    title: name,
    name,
    description,
  };
  return { kind: "cosmetic", id, fileName: `${id}.json`, document };
}

/** Finish 6.0 Phase 27 — delivery chain catalog fragment. */
export function scaffoldChain(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("chain", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const steps = req.steps ?? 3;
  const description =
    req.description?.trim() ||
    `Authoring scaffold delivery chain for ${name}. Author ${steps} contract steps with this chainId before merge.`;
  const document = {
    id,
    name,
    description,
    steps,
    requiresHarbor: req.requiresHarbor ?? "harbor.sunrise_pier",
    contractIdHints: Array.from({ length: steps }, (_, i) => `contract.chain_${slug}_${i + 1}`),
  };
  return { kind: "chain", id, fileName: `${id}.json`, document };
}

/** Finish 6.0 Phase 27 — nest endgame sigil fragment (structural; challenge grantsSigil). */
export function scaffoldSigil(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("sigil", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold nest sigil for ${name}. Reference from endgame.challenge.grantsSigil before merge.`;
  const document = {
    id,
    name,
    description,
    grantsFromChallengeHint: `endgame.challenge.${slug}`,
    requiresPrestigeCount: req.requiresPrestigeCount ?? 10,
    powerNeutral: true,
  };
  return { kind: "sigil", id, fileName: `${id}.json`, document };
}

/** Finish 6.0 Phase 27 — modular content pack manifest (never auto-merges). */
export function scaffoldModpack(req: ScaffoldRequest): ScaffoldResult {
  const slug = normalizeSlug(req.id);
  const id = qualifyId("modpack", slug);
  const name = req.name?.trim() || titleFromSlug(slug);
  const description =
    req.description?.trim() ||
    `Authoring scaffold modular content pack for ${name}. Lists fragment kinds to author together; never auto-merges content-pack.json.`;
  const includes = req.includes?.length
    ? req.includes
    : ["chain", "sigil", "seasonal", "cosmetic"];
  const document = {
    id,
    name,
    description,
    contentVersion: "5.0.0",
    schemaVersion: 27,
    includes,
    fragments: [] as string[],
    modular: true,
  };
  return { kind: "modpack", id, fileName: `${id}.json`, document };
}

export function buildScaffold(req: ScaffoldRequest): ScaffoldResult {
  if (req.kind === "species") return scaffoldSpecies(req);
  if (req.kind === "quest") return scaffoldQuest(req);
  if (req.kind === "harbor") return scaffoldHarbor(req);
  if (req.kind === "contract") return scaffoldContract(req);
  if (req.kind === "bait") return scaffoldBait(req);
  if (req.kind === "decor") return scaffoldDecor(req);
  if (req.kind === "machine") return scaffoldMachine(req);
  if (req.kind === "rival") return scaffoldRival(req);
  if (req.kind === "seasonal") return scaffoldSeasonal(req);
  if (req.kind === "endgame") return scaffoldEndgame(req);
  if (req.kind === "cosmetic") return scaffoldCosmetic(req);
  if (req.kind === "chain") return scaffoldChain(req);
  if (req.kind === "sigil") return scaffoldSigil(req);
  return scaffoldModpack(req);
}
