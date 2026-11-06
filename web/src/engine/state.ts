/** Canonical game state, commands and events. Mirrors game-core sim/GameState.kt. */
import type { ContentPack, ItemQuantity } from "./content";
import { INPUT_SCALE, Prng, SafeMath } from "./foundations";
import { Inventory } from "./inventory";

export const Stats = {
  FISH_CAUGHT: "stat.fish_caught",
  MACHINE_INPUTS: "stat.machine_inputs",
  OUTPUTS_COLLECTED: "stat.outputs_collected",
  COUNTER_STOCKED: "stat.counter_stocked",
  SALES: "stat.sales",
  ITEMS_SOLD: "stat.items_sold",
  REVENUE: "stat.revenue",
  LOST_CUSTOMERS: "stat.lost_customers",
  UPGRADES_BOUGHT: "stat.upgrades_bought",
  TIMING_BONUSES: "stat.timing_bonuses",
  RARE_CATCHES: "stat.rare_catches",
  PREMIUM_SALES: "stat.premium_sales",
  BULK_SALES: "stat.bulk_sales",
  UNMET_PREFERENCE_SALES: "stat.unmet_preference_sales",
  WORKERS_HIRED: "stat.workers_hired",
  WORKER_FISH_CAUGHT: "stat.worker_fish_caught",
  WORKER_ITEMS_MOVED: "stat.worker_items_moved",
  LEASES_EXPIRED: "stat.leases_expired",
  WAGES_PAID: "stat.wages_paid",
  QUESTS_COMPLETED: "stat.quests_completed",
  CONTRACTS_COMPLETED: "stat.contracts_completed",
  CONTRACTS_FAILED: "stat.contracts_failed",
  CONTRACT_REVENUE: "stat.contract_revenue",
  CONTRACT_ITEMS_DELIVERED: "stat.contract_items_delivered",
  HARBORS_TRAVELED: "stat.harbors_traveled",
  MAINTENANCE_PAID: "stat.maintenance_paid",
  ITEMS_SPOILED: "stat.items_spoiled",
  PRESTIGE_COMPLETED: "stat.prestige_completed",
} as const;

/** Stable ordered list for telemetry exports (zeros included). */
export const STAT_KEYS: readonly string[] = [
  Stats.FISH_CAUGHT, Stats.MACHINE_INPUTS, Stats.OUTPUTS_COLLECTED, Stats.COUNTER_STOCKED,
  Stats.SALES, Stats.ITEMS_SOLD, Stats.REVENUE, Stats.LOST_CUSTOMERS, Stats.UPGRADES_BOUGHT,
  Stats.TIMING_BONUSES, Stats.RARE_CATCHES, Stats.PREMIUM_SALES, Stats.BULK_SALES, Stats.UNMET_PREFERENCE_SALES,
  Stats.WORKERS_HIRED, Stats.WORKER_FISH_CAUGHT, Stats.WORKER_ITEMS_MOVED, Stats.LEASES_EXPIRED, Stats.WAGES_PAID,
  Stats.QUESTS_COMPLETED, Stats.CONTRACTS_COMPLETED, Stats.CONTRACTS_FAILED, Stats.CONTRACT_REVENUE,
  Stats.CONTRACT_ITEMS_DELIVERED, Stats.HARBORS_TRAVELED, Stats.MAINTENANCE_PAID, Stats.ITEMS_SPOILED,
  Stats.PRESTIGE_COMPLETED,
];

export type WorkerTaskPhase = "NONE" | "WALK_TO_WORK" | "WORK" | "PICKUP" | "WALK_TO_DROP" | "DROP";

/** Hired staff. Fishers catch into [bag] and deliver to machines; porters haul machine output to counters. */
export class WorkerState {
  walkTicksLeft = 0;
  walkTicksTotal = 0;
  walkFromX = 0;
  walkFromZ = 0;
  walkToX = 0;
  walkToZ = 0;
  transferCooldown = 0;
  phase: WorkerTaskPhase = "NONE";
  taskId: string | null = null;
  taskZoneId: string | null = null;
  taskSourceInvId: string | null = null;
  taskDestInvId: string | null = null;
  taskItemId: string | null = null;
  taskQuantity = 0;
  leaseExpiresAt = 0;
  fishingSpecies: string | null = null;
  fishingProgress = 0;
  fishingCatchTicks = 0;
  constructor(
    readonly id: string,
    readonly roleId: string,
    public x: number,
    public z: number,
    readonly bag: Inventory,
  ) {}
  get busyWalking(): boolean { return this.walkTicksLeft > 0; }
}

export class PlayerState {
  facingX = 0;
  facingZ = INPUT_SCALE;
  inputX = 0;
  inputZ = 0;
  zoneId: string | null = null;
  transferCooldown = 0;
  fishingSpecies: string | null = null;
  fishingProgress = 0;
  fishingCatchTicks = 0;
  reelAttemptedThisCast = false;
  reelRequested = false;
  constructor(
    public x: number,
    public z: number,
    readonly bag: Inventory,
    public catchSpeedPermille = 1000,
    public fishRegenPermille = 1000,
  ) {}
}

export class FishingSpotState {
  regenProgress = 0;
  constructor(readonly zoneId: string, public stock: number) {}
}

export type MachineStatus = "WAITING_FOR_INPUT" | "PROCESSING" | "OUTPUT_FULL" | "PAUSED";

export interface Batch {
  readonly id: string;
  readonly recipeId: string;
  readonly durationTicks: number;
  remainingTicks: number;
  readonly consumed: ItemQuantity[];
}

export class MachineState {
  activeBatch: Batch | null = null;
  paused = false;
  status: MachineStatus = "WAITING_FOR_INPUT";
  /** Null = Auto; otherwise only this recipe may start. */
  preferredRecipeId: string | null = null;
  readonly recipeDurations = new Map<string, number>();
  constructor(readonly stationId: string, readonly machineId: string, readonly input: Inventory, readonly output: Inventory) {}
}

export class CounterState {
  checkoutProgress = 0;
  constructor(readonly counterId: string, readonly stock: Inventory) {}
}

export class CustomerState {
  /** Reserved quantities by product id. */
  readonly reservedItems = new Map<string, number>();
  /** Ticks still walking. A walking customer is not yet queued: no reservations, no patience loss. */
  walkTicksLeft: number;
  constructor(
    readonly id: string,
    readonly typeId: string,
    readonly counterId: string,
    readonly wants: number,
    public patienceLeft: number,
    readonly walkTicksTotal = 0,
    public preferredProductId: string | null = null,
  ) {
    this.walkTicksLeft = walkTicksTotal;
  }
  get reserved(): number {
    let n = 0;
    for (const q of this.reservedItems.values()) n += q;
    return n;
  }
  addReservation(itemId: string, count: number): void {
    if (count <= 0) throw new Error("reservation count must be positive");
    this.reservedItems.set(itemId, (this.reservedItems.get(itemId) ?? 0) + count);
  }
  clearReservations(): void { this.reservedItems.clear(); }
  preferenceMet(): boolean {
    const pref = this.preferredProductId;
    if (pref === null) return true;
    if (this.reserved === 0) return false;
    for (const id of this.reservedItems.keys()) if (id !== pref) return false;
    return true;
  }
  get arrived(): boolean { return this.walkTicksLeft === 0; }
}

export interface Receipt {
  readonly id: string;
  readonly type: string;
  readonly coinDelta: number;
  readonly tick: number;
  readonly reference: string;
}

/** Posted board offer waiting to be accepted. */
export interface ContractOffer {
  readonly id: string;
  readonly templateId: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly durationTicks: number;
  readonly payout: number;
  readonly penalty: number;
}

/** Accepted timed delivery job. */
export class ContractState {
  delivered: number;
  constructor(
    readonly id: string,
    readonly templateId: string,
    readonly itemId: string,
    readonly quantity: number,
    delivered: number,
    readonly deadlineTick: number,
    readonly payout: number,
    readonly penalty: number,
  ) {
    this.delivered = delivered;
  }
}

export const LEDGER_LIMIT = 64;

/** Per-harbor world parked when the player travels elsewhere. */
export interface HarborWorldStash {
  fishingSpots: FishingSpotState[];
  machines: MachineState[];
  counters: CounterState[];
  customers: CustomerState[];
  workers: WorkerState[];
  customerSpawnProgress: number;
  playerX: number;
  playerZ: number;
  playerFacingX: number;
  playerFacingZ: number;
  playerZoneId: string | null;
}

export class GameState {
  tick = 0;
  coins = 0;
  nextSerial = 1;
  tutorialIndex = 0;
  customerSpawnProgress = 0;
  readonly customers: CustomerState[] = [];
  readonly workers: WorkerState[] = [];
  readonly ownedUpgrades = new Set<string>();
  readonly completedQuests = new Set<string>();
  readonly completedPrestige = new Set<string>();
  readonly unlockedCosmetics = new Set<string>();
  readonly stats = new Map<string, number>();
  readonly purchaseReceipts = new Map<string, Receipt>();
  readonly ledger: Receipt[] = [];
  /** Parked harbor worlds keyed by harbor id (active harbor is live on this state). */
  readonly harborStashes = new Map<string, HarborWorldStash>();
  /** Rebuilt from owned upgrades on load (idempotent max). */
  workerMoveSpeedPermille = 1000;
  workerCatchSpeedPermille = 0;
  workerCarryCapacityFloor = 0;
  workerWagePerWorkerPerHour = 0;
  /** Ticks since last hourly wage debit (not persisted). */
  workerWageAccrualTicks = 0;

  /** Subtracted from content maintenance rate (from upgrades; rebuilt on load). */
  maintenanceDiscountPerStation = 0;
  /** Multiplies bag fish spoil period (1000 = content default; rebuilt on load). */
  bagSpoilPeriodMultPermille = 1000;
  /** Permanent catch-speed floor from prestige (rebuilt on load). */
  prestigeCatchSpeedPermille = 1000;
  /** Permanent sale price multiplier from prestige (rebuilt on load). */
  prestigePriceBonusPermille = 1000;
  /** Progress toward next station upkeep (not persisted). */
  maintenanceAccrualTicks = 0;
  /** Progress toward next counter spoilage (not persisted). */
  counterSpoilAccrualTicks = 0;
  /** Progress toward next bag fish spoilage (not persisted). */
  bagSpoilAccrualTicks = 0;

  /** Tick when the contract board next refreshes (0 = needs immediate refresh when unlocked). */
  contractBoardRefreshAt = 0;
  readonly contractOffers: ContractOffer[] = [];
  readonly activeContracts: ContractState[] = [];

  constructor(
    public harborId: string,
    readonly rng: Prng,
    readonly player: PlayerState,
    public fishingSpots: FishingSpotState[],
    public machines: MachineState[],
    public counters: CounterState[],
  ) {}

  stat(key: string): number { return this.stats.get(key) ?? 0; }
  bumpStat(key: string, by = 1): void { this.stats.set(key, SafeMath.add(this.stat(key), by)); }
  newId(prefix: string): string { return `${prefix}.${this.nextSerial++}`; }

  record(r: Receipt): void {
    this.ledger.push(r);
    while (this.ledger.length > LEDGER_LIMIT) this.ledger.shift();
  }

  static newGame(content: ContentPack, harborId: string, seed: number): GameState {
    const h = content.harbor(harborId);
    const units = content.carryUnits;
    const s = new GameState(
      harborId,
      new Prng(seed),
      new PlayerState(
        h.playerSpawn.x, h.playerSpawn.z,
        new Inventory("inv.player_bag", content.player.startCarryCapacityUnits, units),
        content.player.startCatchSpeedPermille,
        content.player.startFishRegenPermille,
      ),
      h.fishingSpots.map((f) => new FishingSpotState(f.zone, f.stockMax)),
      h.stations.map((st) => {
        const def = content.machinesById.get(st.machine)!;
        return new MachineState(st.id, st.machine,
          new Inventory(`inv.${st.id}.input`, def.inputCapacityUnits, units),
          new Inventory(`inv.${st.id}.output`, def.outputCapacityUnits, units));
      }),
      h.counters.map((c) => new CounterState(c.id, new Inventory(`inv.${c.id}`, c.capacityUnits, units))),
    );
    s.coins = content.player.startCoins;
    return s;
  }
}

export type Command =
  | { type: "move"; x: number; z: number }
  | { type: "purchase_upgrade"; upgradeId: string; requestId: string }
  | { type: "set_machine_paused"; stationId: string; paused: boolean }
  | { type: "reel" }
  | { type: "select_machine_recipe"; stationId: string; recipeId: string | null }
  | { type: "hire_worker"; roleId: string; requestId: string }
  /** Accept a posted contract offer; requestId makes retries idempotent. */
  | { type: "accept_contract"; offerId: string; requestId: string }
  /** Deliver matching items from the player bag toward an active contract. */
  | { type: "deliver_contract"; contractId: string; requestId: string }
  /** Travel to another harbor; requestId makes retries idempotent. */
  | { type: "travel_to_harbor"; harborId: string; requestId: string };

export type GameEvent =
  | { type: "zone_entered"; tick: number; zoneId: string | null }
  | { type: "fish_caught"; tick: number; speciesId: string; zoneId: string; timingBonus?: boolean; rareUpgrade?: boolean }
  | { type: "fishing_spot_depleted"; tick: number; zoneId: string }
  | { type: "items_transferred"; tick: number; from: string; to: string; itemId: string; count: number }
  | { type: "batch_started"; tick: number; batchId: string; stationId: string; recipeId: string }
  | { type: "batch_completed"; tick: number; batchId: string; stationId: string }
  | { type: "customer_arrived"; tick: number; customerId: string; counterId: string }
  | { type: "customer_left"; tick: number; customerId: string; paid: boolean }
  | { type: "rush_started"; tick: number; rushId: string; name: string }
  | { type: "rush_ended"; tick: number; rushId: string; name: string }
  | { type: "sale_committed"; tick: number; saleId: string; customerId: string; items: { item: string; quantity: number }[]; coins: number; customerTypeId?: string; priceMultPermille?: number; preferenceMet?: boolean; preferredProductId?: string | null }
  | { type: "upgrade_purchased"; tick: number; upgradeId: string; receipt: Receipt; replayed: boolean }
  | { type: "purchase_rejected"; tick: number; upgradeId: string; requestId: string; reason: string }
  | { type: "worker_hired"; tick: number; roleId: string; receipt: Receipt; replayed: boolean }
  | { type: "hire_rejected"; tick: number; roleId: string; requestId: string; reason: string }
  | { type: "wages_paid"; tick: number; workers: number; coins: number }
  | { type: "lease_expired"; tick: number; workerId: string; itemId: string | null; sourceInvId: string | null }
  | { type: "quest_completed"; tick: number; questId: string; coinsRewarded?: number; unlockUpgrades?: string[] }
  | { type: "tutorial_advanced"; tick: number; stepIndex: number }
  | { type: "checkpoint_requested"; tick: number; reason: string }
  | { type: "contract_board_refreshed"; tick: number; offerIds: string[] }
  | { type: "contract_accepted"; tick: number; contractId: string; offerId: string; receipt: Receipt; replayed: boolean }
  | { type: "contract_delivered"; tick: number; contractId: string; count: number; completed: boolean; receipt: Receipt; replayed: boolean }
  | { type: "contract_completed"; tick: number; contractId: string; templateId: string; payout: number }
  | { type: "contract_failed"; tick: number; contractId: string; templateId: string; penaltyPaid: number }
  | { type: "contract_rejected"; tick: number; referenceId: string; requestId: string; reason: string }
  | { type: "harbor_traveled"; tick: number; fromHarborId: string; toHarborId: string; receipt: Receipt; replayed: boolean }
  | { type: "travel_rejected"; tick: number; harborId: string; requestId: string; reason: string }
  | { type: "maintenance_paid"; tick: number; stations: number; coins: number }
  | { type: "items_spoiled"; tick: number; location: "counter" | "bag"; items: ItemQuantity[] }
  | { type: "prestige_unlocked"; tick: number; prestigeId: string; coinsRewarded: number; cosmetic: string | null; catchSpeedPermille: number; priceBonusPermille: number };
