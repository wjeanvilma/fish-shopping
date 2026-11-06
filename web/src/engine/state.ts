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
} as const;

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

export const LEDGER_LIMIT = 64;

export class GameState {
  tick = 0;
  coins = 0;
  nextSerial = 1;
  tutorialIndex = 0;
  customerSpawnProgress = 0;
  readonly customers: CustomerState[] = [];
  readonly ownedUpgrades = new Set<string>();
  readonly completedQuests = new Set<string>();
  readonly stats = new Map<string, number>();
  readonly purchaseReceipts = new Map<string, Receipt>();
  readonly ledger: Receipt[] = [];

  constructor(
    readonly harborId: string,
    readonly rng: Prng,
    readonly player: PlayerState,
    readonly fishingSpots: FishingSpotState[],
    readonly machines: MachineState[],
    readonly counters: CounterState[],
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
  | { type: "select_machine_recipe"; stationId: string; recipeId: string | null };

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
  | { type: "quest_completed"; tick: number; questId: string }
  | { type: "tutorial_advanced"; tick: number; stepIndex: number }
  | { type: "checkpoint_requested"; tick: number; reason: string };
