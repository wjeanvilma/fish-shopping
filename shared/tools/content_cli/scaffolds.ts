/**
 * Finish 2.0 Phase 27 — harbor / species / quest JSON scaffolds.
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
  /** Harbor travel requires (default empty). */
  requires?: string[];
  /** Fishing spot species ids (default species.harbor_herring). */
  fishingSpecies?: string[];
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

export function buildScaffold(req: ScaffoldRequest): ScaffoldResult {
  if (req.kind === "species") return scaffoldSpecies(req);
  if (req.kind === "quest") return scaffoldQuest(req);
  return scaffoldHarbor(req);
}
