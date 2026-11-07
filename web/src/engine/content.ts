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
  timingPerfectStartPermille: number;
  timingPerfectEndPermille: number;
  timingGoodBonusPermille: number;
  timingPerfectBonusPermille: number;
}
export interface RareUpgradeDef { to: string; chancePermille: number }
export interface SpeciesDef {
  id: string; name: string; carryUnits: number; catchTicks: number; baseValue: number; rarityWeight: number;
  /** Bag spoil priority: 3 fragile first, 1 hardy last. Defaults to 2. */
  spoilTier?: number;
  asset?: string | null; rareUpgrade?: RareUpgradeDef | null;
}
export interface ProductDef {
  id: string;
  name: string;
  carryUnits: number;
  unitPrice: number;
  /** Counter spoil priority: 3 fragile first, 1 preserved last. Defaults to 2. */
  spoilTier?: number;
  asset?: string | null;
}
export interface BaitDef {
  id: string;
  name: string;
  description: string;
  carryUnits: number;
  packQuantity: number;
  cost: number;
  rareSpeciesWeightMultPermille: number;
  rareChanceBonusPermille: number;
  requires: string[];
}
export interface ItemQuantity { item: string; quantity: number }
export interface RecipeDef { id: string; machine: string; inputs: ItemQuantity[]; outputs: ItemQuantity[]; durationTicks: number }
export interface MachineDef { id: string; name: string; recipes: string[]; inputCapacityUnits: number; outputCapacityUnits: number }
export type UpgradeEffect =
  | { kind: "carry_capacity"; capacityUnits: number }
  | { kind: "recipe_duration"; machine: string; recipe: string; durationTicks: number }
  | { kind: "catch_speed"; speedPermille: number }
  | { kind: "grant_bait"; bait: string; quantity: number }
  | {
    kind: "timing_window";
    windowStartPermille: number;
    windowEndPermille: number;
    perfectStartPermille: number;
    perfectEndPermille: number;
  }
  | { kind: "fish_regen"; speedPermille: number }
  | { kind: "unlock_fishing_spot"; zone: string }
  | { kind: "unlock_machine"; machine: string }
  /** Ownership unlocks counters whose kind matches pad (Phase 15). */
  | { kind: "unlock_counter"; pad: "wholesale" }
  | { kind: "worker_move_speed"; speedPermille: number }
  | { kind: "worker_carry"; capacityUnits: number }
  | { kind: "worker_catch_speed"; speedPermille: number }
  | { kind: "worker_wage"; coinsPerWorkerPerHour: number }
  /** Subtracted from economy.maintenanceCoinsPerStation (floored at 0). */
  | { kind: "maintenance_discount"; coinsOffPerStation: number }
  /** Multiplies bag fish spoilage period (2000 = half as fast). */
  | { kind: "bag_spoil_resist"; periodMultPermille: number }
  /** Multiplies counter product spoilage period (2000 = half as fast). */
  | { kind: "counter_spoil_resist"; periodMultPermille: number };
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

/** Finish 2.0 Phase 18 — rotating daily objectives + local login streak. */
export interface DailyGoalsCatalog {
  /** Real-world day length in ms (86400000 = civil day). */
  dayLengthMs: number;
  boardSlots: number;
  streakBonusCoinsPerDay: number;
  maxStreakBonusDays: number;
  objectives: DailyObjectiveDef[];
}

export interface DailyObjectiveDef {
  id: string;
  name: string;
  description: string;
  goal: StatGoal;
  rewardCoins: number;
  weight: number;
}
export type WorkerRoleKind =
  | "fisher" | "porter" | "operator" | "cashier" | "supervisor"
  | "ice_runner" | "smoker_specialist" | "greeter";
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

/** Hire-time trait that modifies a single worker's capabilities (Phase 16). */
export interface WorkerTraitDef {
  id: string;
  name: string;
  description: string;
  weight: number;
  moveSpeedPermille?: number;
  catchSpeedPermille?: number;
  carryBonus?: number;
  /** Multiplies transfer interval (1000 = unchanged; lower = faster). */
  transferIntervalMultPermille?: number;
}

/** Hire-slot vs on-shift scheduling + overtime wages (Phase 17). */
export interface StaffShiftsDef {
  /** Workers that can be on shift at the standard wage rate. */
  baseOnShiftSlots: number;
  /** Wage multiplier for on-shift workers beyond free slots (1500 = 1.5x). */
  overtimeWagePermille: number;
  /** Added free on-shift slots while a supervisor is posted on shift. */
  supervisorExtraSlots: number;
}

/** Passive buffs for Phase 18 specialized hireable roles. */
export interface StaffRoleBuffsDef {
  greeterPatienceDrainMultPermille: number;
  smokerSpecialistProcessSpeedPermille: number;
  iceRunnerFragileSpoilTierMin: number;
  iceRunnerSpoilScoreBonus: number;
}

/** One equippable staff-gear slot (boots / satchel / tackle). */
export interface StaffLoadoutSlotDef {
  id: string;
  name: string;
  /** Upgrade IDs that fill this slot (mutually exclusive across workers). */
  upgradeIds: string[];
}

/** Assignable staff gear inventory (Phase 19). */
export interface StaffLoadoutsDef {
  slots: StaffLoadoutSlotDef[];
}

/** Finish 2.0 Phase 15 — one specialization branch within a role family. */
export interface StaffBranchDef {
  id: string;
  role: string;
  name: string;
  description: string;
  parentId: string | null;
  requiresWorkerLevel: number;
  trainingCostCoins: number;
  trainingXpRequired: number;
  catchSpeedMultPermille: number;
  moveSpeedMultPermille: number;
  carryBonus: number;
  transferIntervalMultPermille: number;
  wageMultPermille: number;
}

export interface StaffScheduleDef {
  id: string;
  name: string;
  description: string;
  dayParts: string[];
  autoOnShift: boolean;
  wageMultPermille: number;
}

export interface StaffTreesCatalog {
  branches: StaffBranchDef[];
  schedules: StaffScheduleDef[];
}

/** Shared XP curve + trait table for hired staff (Phase 16). */
export interface StaffProgressionDef {
  maxLevel: number;
  /** Cumulative XP for levels 1..N; index 0 must be 0. */
  xpThresholds: number[];
  moveSpeedPermillePerLevel: number;
  catchSpeedPermillePerLevel: number;
  /** +1 bag capacity every N levels above 1. */
  carryBonusEveryLevels: number;
  xpFishCaught: number;
  xpItemMoved: number;
  xpSaleAssisted: number;
  traitsOnHire: number;
  /** Shift slots / overtime (Phase 17). */
  shifts: StaffShiftsDef;
  /** Specialized role passives (Phase 18). */
  roleBuffs: StaffRoleBuffsDef;
  /** Equip slots for owned staff gear upgrades (Phase 19). */
  loadouts: StaffLoadoutsDef;
  traits: WorkerTraitDef[];
}

/** Weights for scoring worker haul candidates (urgency / distance / demand). */
export interface RoutingDef {
  urgencyWeight: number;
  distanceWeight: number;
  demandWeight: number;
  /** Multiplies demandWeight while a supervisor is on duty (1000 = unchanged). */
  supervisorDemandBoostPermille: number;
}

/** Rush idle ticker thresholds for automated stations (Phase 20). */
export interface AutomationAlertsDef {
  /** Ticks a station may stay idle during rush before alerting. */
  machineIdleTicksDuringRush: number;
  /** Minimum ticks between idle alerts for the same station. */
  alertCooldownTicks: number;
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
  /**
   * Phase 12 scarcity price curve: five bands for counter fill ratio 0–20% … 80–100%.
   * Low stock (early bands) tips above 1000; full shelves sit near 1000.
   */
  scarcityPriceCurvePermille: number[];
  /** Phase 25 machine wear / disasters (repair spend). */
  wear: MachineWearDef;
}

/** Phase 25 machine wear rolls and repair costs. */
export interface MachineWearDef {
  requires: string[];
  checkPeriodTicks: number;
  chancePermille: number;
  breakChancePermille: number;
  slowDurationTicks: number;
  slowProcessMultPermille: number;
  repairCoins: number;
}

/** Phase 26 pier bank: one short-term loan at a time + coin-goal presets. */
export interface BankDef {
  requires: string[];
  loanPrincipal: number;
  /** Total repayment = principal * repayPermille / 1000. */
  repayPermille: number;
  termTicks: number;
  /** While overdue, seize owed coins this often. */
  collectionPeriodTicks: number;
  goalPresets: number[];
}

export function bankRepayAmount(bank: BankDef): number {
  return Math.trunc((bank.loanPrincipal * bank.repayPermille) / 1000);
}

/** One curated museum set of species trophies. */
export interface TrophySetDef {
  id: string;
  name: string;
  description: string;
  species: string[];
  /** Stat written to 1 when every listed species has a personal best. */
  completeStat: string;
}

/** Size-roll bounds and museum sets for the trophy board (Phase 10). */
export interface TrophiesDef {
  sizeMinPermille: number;
  sizeMaxPermille: number;
  sets: TrophySetDef[];
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
  /**
   * Phase 12 soft price multipliers for harbor rating stars 0..5 (length 6).
   * Applied on top of permanent prestige price bonuses.
   */
  ratingPriceMultPermille: number[];
  milestones: PrestigeMilestoneDef[];
}

/** Finish 2.0 Phase 11 — content-driven achievement entry. */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: string;
  goal: StatGoal;
  rewardCoins: number;
}

export interface AchievementsCatalog {
  entries: AchievementDef[];
}

/** Finish 2.0 Phase 12 — per-species journal entry. */
export interface SpeciesCodexEntryDef {
  speciesId: string;
  family: string;
  lore: string;
  habitatHint: string;
  journalTip: string;
}

export interface SpeciesCodexCatalog {
  families: string[];
  entries: SpeciesCodexEntryDef[];
}

/** Finish 2.0 Phase 13 — weather pattern in the rotating cycle. */
export interface WeatherPatternDef {
  id: string;
  name: string;
  description: string;
  durationTicks: number;
  catchSpeedMultPermille: number;
  regenMultPermille: number;
  customerSpawnMultPermille: number;
  rareChanceBonusPermille: number;
}

export interface TidePhaseDef {
  id: string;
  name: string;
  endPermille: number;
  catchSpeedMultPermille: number;
  regenMultPermille: number;
  customerSpawnMultPermille: number;
}

export interface TideCatalog {
  periodTicks: number;
  phases: TidePhaseDef[];
  chartCatchBonusPermille: number;
  chartRegenEasePermille: number;
  chartCrowdBonusPermille: number;
}

export interface WeatherCatalog {
  patterns: WeatherPatternDef[];
  tide: TideCatalog;
}

/** Finish 2.0 Phase 14 — rod technique selectable beyond Perfect/Good/Miss. */
export interface MasteryTechniqueDef {
  id: string;
  name: string;
  description: string;
  requiresMasteryLevel: number;
  windowStartDeltaPermille: number;
  windowEndDeltaPermille: number;
  perfectStartDeltaPermille: number;
  perfectEndDeltaPermille: number;
  catchSpeedMultPermille: number;
  perfectBonusPermille: number;
  rareChanceBonusPermille: number;
}

export interface MasteryCoachingTipDef {
  id: string;
  minGlobalLevel: number;
  maxGlobalLevel: number;
  minSpeciesLevel: number;
  text: string;
}

export interface FishingMasteryCatalog {
  maxLevel: number;
  xpThresholds: number[];
  xpCatch: number;
  xpGoodReel: number;
  xpPerfectReel: number;
  xpRareCatch: number;
  catchSpeedPermillePerLevel: number;
  rareChanceBonusPermillePerLevel: number;
  techniques: MasteryTechniqueDef[];
  coachingTips: MasteryCoachingTipDef[];
}


/**
 * Service reputation (Phase 13): computed from lifetime sales vs lost customers.
 * Distinct from prestige harbor ★ (revenue). Softly biases customer spawn mix.
 */
export interface ReputationDef {
  minSample: number;
  neutralScorePermille: number;
  scoreBandThresholdsPermille: number[];
  kindSpawnMultPermille: Record<string, number>[];
  unmetPreferencePenaltyPermille: number;
  coachingLostRatioPermille: number;
  coachingPraiseScorePermille: number;
}

export type ContractKind = "standard" | "standing";

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
  /** Phase 14: one-shot vs auto-refresh standing order. */
  kind?: ContractKind;
  /** Per completed standing cycle, multiply payout by this / 1000 (capped by maxStreak). */
  payoutEscalatePermille?: number;
  penaltyEscalatePermille?: number;
  /** Max escalate steps applied to payout/penalty. */
  maxStreak?: number;
  /** After a standing fail, template stays off the board for this many ticks. */
  failCooldownTicks?: number;
  /** Phase 24: only post while the named seasonal event is active. */
  requiresSeasonalEvent?: string | null;
  /** Finish 2.0 Phase 17 — delivery chain id (only step 1 posts to the board). */
  chainId?: string | null;
  /** 1-based step within chainId. */
  chainStep?: number;
  /** Minimum service-reputation band required before this offer can post. */
  requiresReputationBand?: number | null;
}

/** Harbor contract board: rotating offers with timed deliveries. */
export interface ContractsDef {
  boardSlots: number;
  maxActive: number;
  refreshPeriodTicks: number;
  /** Quest / upgrade IDs required before the board posts offers. */
  requires: string[];
  templates: ContractTemplateDef[];
  /** Finish 2.0 Phase 17 — consecutive fails at/above this apply board pressure. */
  failStreakThreshold?: number;
  failStreakBoardSlotPenalty?: number;
  failStreakOfferWeightMultPermille?: number;
  /** Per reputation band payout tip for new offers (1000 = unchanged). */
  reputationPayoutMultPermille?: number[];
}
export type CustomerKind =
  | "standard"
  | "premium"
  | "bulk"
  | "tourist"
  | "wholesaler"
  | "critic"
  | "night_regular";
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
  /** Optional day-part multipliers on spawnWeight (1000 = unchanged). */
  dayPartSpawnMultPermille?: Record<string, number>;
  /** Finish 2.0 Phase 16 — only spawn while the named festival weekend is active. */
  requiresSeasonalEvent?: string | null;
}
export type TutorialTrigger = { kind: "enter_zone"; zone: string } | ({ kind: "stat" } & StatGoal);
export interface TutorialStepDef { id: string; text: string; advanceOn: TutorialTrigger }
export interface RectMm { id: string; minX: number; minZ: number; maxX: number; maxZ: number }
export type ZoneKind = "fishing" | "machine_input" | "machine_output" | "counter" | "kiosk" | "plot";
export interface ZoneDef extends RectMm { kind: ZoneKind }
/** Phase 6 expansion marker that grants an unlock upgrade when built. */
export interface PlotDef {
  id: string;
  name: string;
  description: string;
  zone: string;
  grantsUpgrade: string;
}
export interface DayPartDef {
  id: string;
  name: string;
  /** Exclusive end of this part within the day cycle (1..1000); last part must be 1000. */
  endPermille: number;
  /** Regen duration multiplier (1000 = normal; higher = slower). */
  regenMultPermille: number;
  /** Player catch-speed multiplier when a tide chart is owned. */
  catchSpeedMultPermille: number;
}
export interface EcologyDef {
  dayLengthTicks: number;
  parts: DayPartDef[];
}
export interface FishingSpotDef {
  zone: string;
  species: string[];
  stockMax: number;
  regenTicks: number;
  regenCurvePermille: number[];
  /** Optional per-day-part regen overrides keyed by ecology part id. */
  dayPartRegenMultPermille?: Record<string, number>;
  requiresUpgrade?: string | null;
}
export interface StationDef {
  id: string;
  machine: string;
  inputZone: string;
  outputZone: string;
  requiresUpgrade?: string | null;
}
export interface PointMm { x: number; z: number }
export type CounterKind = "retail" | "wholesale";
export interface CounterDef {
  id: string;
  /** Products this counter accepts for stocking and sale (content order). */
  products: string[];
  capacityUnits: number; zone: string; checkoutTicks: number; maxQueue: number;
  /** Queue slot i is queueAnchor + i * queueStep. */
  queueAnchor: PointMm; queueStep: PointMm;
  /** Retail vs wholesale B2B pad (Phase 15). */
  kind?: CounterKind;
  /** Optional upgrade gate before this counter accepts stock/spawns/cashiers. */
  requiresUpgrade?: string | null;
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
  /** Phase 12 sale price multiplier while active (1000 = unchanged). */
  priceMultPermille: number;
}
/** Phase 22 per-harbor passive applied while the player is at this harbor. */
export interface HarborSpecializationDef {
  id: string;
  name: string;
  description: string;
  /** Subtracted from economy.maintenanceCoinsPerStation (with upgrade discounts). */
  maintenanceDiscountPerStation?: number;
  /** Added to rare-upgrade rolls while fishing here. */
  rareChanceBonusPermille?: number;
  /** Customer-kind spawn multipliers (keys = customer kind wires). */
  kindSpawnMultPermille?: Record<string, number>;
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
  /** Phase 6 expansion markers (walk-to-plot construction). */
  plots: PlotDef[];
  customerSpawnTicks: number;
  customerEntry: PointMm;
  customerWalkMmPerTick: number;
  /** Intermediate approach points (entry → waypoints → queue). Empty = straight line. */
  customerPathWaypoints: PointMm[];
  rushes: RushWindowDef[];
  /** Phase 22 passive while present at this harbor. */
  specialization?: HarborSpecializationDef | null;
  /** GLB filename under models/, matching generate_blockout.py. */
  blockoutAsset: string;
}

export interface RawContentPack {
  contentVersion: string;
  ticksPerSecond: number;
  player: PlayerDef;
  species: SpeciesDef[];
  products: ProductDef[];
  bait: BaitDef[];
  recipes: RecipeDef[];
  machines: MachineDef[];
  upgrades: UpgradeDef[];
  quests: QuestDef[];
  workers: WorkerDef[];
  staffProgression: StaffProgressionDef;
  routing: RoutingDef;
  automationAlerts: AutomationAlertsDef;
  offline: OfflineDef;
  /** Finish 2.0 Phase 18 — local daily board + login streak. */
  dailyGoals: DailyGoalsCatalog;
  /** Soft coin/stock sinks after early progression (Phase 19). */
  economy: EconomyDef;
  /** Day-part fishing ecology (Phase 7). */
  ecology: EcologyDef;
  /** Museum / trophy board (Phase 10). */
  trophies: TrophiesDef;
  /** End-of-run prestige milestones (Phase 20); additive, never wipes the save. */
  prestige: PrestigeDef;
  /** Finish 2.0 Phase 11 — sim-granted achievements. */
  achievements: AchievementsCatalog;
  /** Finish 2.0 Phase 12 — species codex / journal blurbs. */
  codex: SpeciesCodexCatalog;
  /** Finish 2.0 Phase 13 — weather cycle + tide phases. */
  weather: WeatherCatalog;
  /** Finish 2.0 Phase 14 — per-species mastery + rod techniques. */
  fishingMastery: FishingMasteryCatalog;
  /** Finish 2.0 Phase 15 — staff specialization branches + schedules. */
  staffTrees: StaffTreesCatalog;
  /** Service reputation from served vs abandoned (Phase 13). */
  reputation: ReputationDef;
  contracts: ContractsDef;
  customers: CustomerDef[];
  tutorial: TutorialStepDef[];
  /** Phase 23 shop decor / placable cosmetics. */
  decor: DecorCatalog;
  /** Phase 24 time-boxed overlays driven by the sim clock. */
  seasonalEvents: SeasonalEventsCatalog;
  /** Phase 26 short-term loans + coin-goal presets. */
  bank: BankDef;
  harbors: HarborDef[];
}

export interface DecorCatalog {
  items: DecorDef[];
}

export interface DecorDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Prestige cosmetic / banner id that must already be unlocked, if any. */
  requiresCosmetic?: string | null;
  /** Added to newly spawned customer patience while owned. */
  patienceBonusTicks: number;
}

export interface SeasonalEventsCatalog {
  events: SeasonalEventDef[];
}

export interface SeasonalEventDef {
  id: string;
  name: string;
  description: string;
  periodTicks: number;
  startTick: number;
  durationTicks: number;
  /** Cosmetic / banner id unlocked when the event first becomes active. */
  banner?: string | null;
  /** Catch-weight multipliers while active (1000 = unchanged). */
  speciesWeightMultPermille?: Record<string, number>;
  /** Finish 2.0 Phase 16 — crowd spawn tip while active (1000 = unchanged). */
  customerSpawnMultPermille?: number;
  /** Harbor-wide sale tip while active (1000 = unchanged). */
  priceMultPermille?: number;
  /** Festival-only customer ids that appear while this weekend is live. */
  festivalCustomerIds?: string[];
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
  readonly baitById: Map<string, BaitDef>;
  readonly recipesById: Map<string, RecipeDef>;
  readonly machinesById: Map<string, MachineDef>;
  readonly upgradesById: Map<string, UpgradeDef>;
  readonly questsById: Map<string, QuestDef>;
  readonly workersById: Map<string, WorkerDef>;
  readonly workerTraitsById: Map<string, WorkerTraitDef>;
  readonly prestigeMilestonesById: Map<string, PrestigeMilestoneDef>;
  readonly achievementsById: Map<string, AchievementDef>;
  readonly codexBySpeciesId: Map<string, SpeciesCodexEntryDef>;
  readonly weatherPatternsById: Map<string, WeatherPatternDef>;
  readonly tidePhasesById: Map<string, TidePhaseDef>;
  readonly techniquesById: Map<string, MasteryTechniqueDef>;
  readonly trophySetsById: Map<string, TrophySetDef>;
  readonly contractTemplatesById: Map<string, ContractTemplateDef>;
  readonly customersById: Map<string, CustomerDef>;
  readonly decorById: Map<string, DecorDef>;
  readonly seasonalEventsById: Map<string, SeasonalEventDef>;
  readonly harborsById: Map<string, HarborDef>;
  readonly staffBranchesById: Map<string, StaffBranchDef>;
  readonly staffSchedulesById: Map<string, StaffScheduleDef>;
  readonly dailyObjectivesById: Map<string, DailyObjectiveDef>;

  constructor(readonly raw: RawContentPack) {
    for (const t of raw.contracts.templates) {
      t.kind = t.kind ?? "standard";
      t.payoutEscalatePermille = t.payoutEscalatePermille ?? 1000;
      t.penaltyEscalatePermille = t.penaltyEscalatePermille ?? 1000;
      t.maxStreak = t.maxStreak ?? 1;
      t.failCooldownTicks = t.failCooldownTicks ?? 1;
      t.chainStep = t.chainStep ?? 1;
    }
    raw.contracts.failStreakThreshold = raw.contracts.failStreakThreshold ?? 3;
    raw.contracts.failStreakBoardSlotPenalty = raw.contracts.failStreakBoardSlotPenalty ?? 1;
    raw.contracts.failStreakOfferWeightMultPermille =
      raw.contracts.failStreakOfferWeightMultPermille ?? 700;
    raw.contracts.reputationPayoutMultPermille = raw.contracts.reputationPayoutMultPermille ?? [];
    raw.dailyGoals = raw.dailyGoals ?? {
      dayLengthMs: 86_400_000,
      boardSlots: 3,
      streakBonusCoinsPerDay: 25,
      maxStreakBonusDays: 7,
      objectives: [],
    };
    for (const e of raw.seasonalEvents.events) {
      e.speciesWeightMultPermille = e.speciesWeightMultPermille ?? {};
    }
    for (const t of raw.staffProgression.traits) {
      t.moveSpeedPermille = t.moveSpeedPermille ?? 1000;
      t.catchSpeedPermille = t.catchSpeedPermille ?? 1000;
      t.carryBonus = t.carryBonus ?? 0;
      t.transferIntervalMultPermille = t.transferIntervalMultPermille ?? 1000;
    }
    for (const h of raw.harbors) {
      h.requires = h.requires ?? [];
      h.customerPathWaypoints = h.customerPathWaypoints ?? [];
      h.plots = h.plots ?? [];
      h.rushes = (h.rushes ?? []).map((rush) => ({
        ...rush,
        priceMultPermille: rush.priceMultPermille ?? 1000,
      }));
      if (h.specialization) {
        h.specialization.maintenanceDiscountPerStation = h.specialization.maintenanceDiscountPerStation ?? 0;
        h.specialization.rareChanceBonusPermille = h.specialization.rareChanceBonusPermille ?? 0;
        h.specialization.kindSpawnMultPermille = h.specialization.kindSpawnMultPermille ?? {};
      }
      h.blockoutAsset = `${h.id.includes(".") ? h.id.slice(h.id.indexOf(".") + 1) : h.id}_blockout.glb`;
    }
    this.speciesById = byId(raw.species);
    this.productsById = byId(raw.products);
    this.baitById = byId(raw.bait);
    this.recipesById = byId(raw.recipes);
    this.machinesById = byId(raw.machines);
    this.upgradesById = byId(raw.upgrades);
    this.questsById = byId(raw.quests);
    this.workersById = byId(raw.workers);
    this.workerTraitsById = byId(raw.staffProgression.traits);
    this.prestigeMilestonesById = byId(raw.prestige.milestones);
    this.achievementsById = byId(raw.achievements.entries);
    this.codexBySpeciesId = new Map(raw.codex.entries.map((e) => [e.speciesId, e] as const));
    this.weatherPatternsById = byId(raw.weather.patterns);
    this.tidePhasesById = byId(raw.weather.tide.phases);
    this.techniquesById = byId(raw.fishingMastery.techniques);
    this.trophySetsById = byId(raw.trophies.sets);
    this.contractTemplatesById = byId(raw.contracts.templates);
    this.customersById = byId(raw.customers);
    for (const d of raw.decor.items) {
      d.requiresCosmetic = d.requiresCosmetic ?? null;
      d.patienceBonusTicks = d.patienceBonusTicks ?? 0;
    }
    this.decorById = byId(raw.decor.items);
    this.seasonalEventsById = byId(raw.seasonalEvents.events);
    this.harborsById = byId(raw.harbors);
    this.staffBranchesById = byId(raw.staffTrees.branches);
    this.staffSchedulesById = byId(raw.staffTrees.schedules);
    this.dailyObjectivesById = byId(raw.dailyGoals.objectives);
  }

  get contentVersion() { return this.raw.contentVersion; }
  get player() { return this.raw.player; }
  get tutorial() { return this.raw.tutorial; }
  get customers() { return this.raw.customers; }
  get upgrades() { return this.raw.upgrades; }
  get quests() { return this.raw.quests; }
  get workers() { return this.raw.workers; }
  get staffProgression() { return this.raw.staffProgression; }
  get routing() { return this.raw.routing; }
  get automationAlerts() { return this.raw.automationAlerts; }
  get offline() { return this.raw.offline; }
  get dailyGoals() { return this.raw.dailyGoals; }
  get economy() { return this.raw.economy; }
  get ecology() { return this.raw.ecology; }
  get species() { return this.raw.species; }
  get products() { return this.raw.products; }
  get machines() { return this.raw.machines; }
  get bait() { return this.raw.bait; }
  get trophies() { return this.raw.trophies; }
  get prestige() { return this.raw.prestige; }
  get achievements() { return this.raw.achievements; }
  get codex() { return this.raw.codex; }
  get weather() { return this.raw.weather; }
  get fishingMastery() { return this.raw.fishingMastery; }
  get staffTrees() { return this.raw.staffTrees; }
  get reputation() { return this.raw.reputation; }
  get contracts() { return this.raw.contracts; }
  get decor() { return this.raw.decor; }
  get seasonalEvents() { return this.raw.seasonalEvents; }
  get bank() { return this.raw.bank; }
  get harbors() { return this.raw.harbors; }

  carryUnits = (itemId: string): number => {
    const u = this.speciesById.get(itemId)?.carryUnits
      ?? this.productsById.get(itemId)?.carryUnits
      ?? this.baitById.get(itemId)?.carryUnits;
    if (u === undefined) throw new Error(`Unknown item ${itemId}`);
    return u;
  };

  itemName(itemId: string): string {
    return this.speciesById.get(itemId)?.name
      ?? this.productsById.get(itemId)?.name
      ?? this.baitById.get(itemId)?.name
      ?? itemId;
  }

  isKnownItem(itemId: string): boolean {
    return this.speciesById.has(itemId) || this.productsById.has(itemId) || this.baitById.has(itemId);
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
  check(r.player.timingPerfectStartPermille < r.player.timingPerfectEndPermille, () =>
    "player.timingPerfectStartPermille must be < timingPerfectEndPermille");
  check(r.player.timingPerfectStartPermille >= r.player.timingWindowStartPermille, () =>
    "player.timingPerfectStartPermille must be >= timingWindowStartPermille");
  check(r.player.timingPerfectEndPermille <= r.player.timingWindowEndPermille, () =>
    "player.timingPerfectEndPermille must be <= timingWindowEndPermille");
  check(r.player.timingGoodBonusPermille >= 1, () => "player.timingGoodBonusPermille must be >= 1");
  check(r.player.timingPerfectBonusPermille >= r.player.timingGoodBonusPermille, () =>
    "player.timingPerfectBonusPermille must be >= timingGoodBonusPermille");
  check(r.player.startCatchSpeedPermille >= 1000, () =>
    "player.startCatchSpeedPermille must be >= 1000");
  check(r.player.startFishRegenPermille >= 1000, () =>
    "player.startFishRegenPermille must be >= 1000");

  const allIds = [...r.species, ...r.products, ...r.recipes, ...r.machines, ...r.upgrades, ...r.quests,
    ...r.bait, ...r.workers, ...r.staffProgression.traits, ...r.trophies.sets, ...r.prestige.milestones,
    ...r.achievements.entries, ...r.fishingMastery.techniques, ...r.fishingMastery.coachingTips,
    ...r.staffTrees.branches, ...r.staffTrees.schedules,
    ...r.contracts.templates, ...r.customers, ...r.tutorial, ...r.decor.items,
    ...r.seasonalEvents.events, ...r.harbors].map((x) => x.id);
  duplicates(allIds).forEach((id) => errors.push(`Duplicate id '${id}'`));

  check(r.bait.length > 0, () => "bait must not be empty");
  const baitRequirable = new Set([...p.upgradesById.keys(), ...p.questsById.keys()]);
  for (const b of r.bait) {
    check(b.carryUnits >= 1, () => `${b.id}: carryUnits must be >= 1`);
    check(b.packQuantity >= 1, () => `${b.id}: packQuantity must be >= 1`);
    check(b.cost >= 0, () => `${b.id}: cost must be >= 0`);
    check(b.rareSpeciesWeightMultPermille >= 1, () => `${b.id}: rareSpeciesWeightMultPermille must be >= 1`);
    check(b.rareChanceBonusPermille >= 0 && b.rareChanceBonusPermille <= 1000, () =>
      `${b.id}: rareChanceBonusPermille must be 0..1000`);
    for (const req of b.requires) {
      check(baitRequirable.has(req), () => `${b.id}: unknown requirement '${req}'`);
    }
  }
  for (const h of r.harbors) {
    check(h.zones.some((z) => z.kind === "kiosk"), () => `${h.id}: needs at least one kiosk zone`);
  }

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
  check(r.workers.some((w) => w.role === "ice_runner"), () => "content needs at least one ice_runner worker");
  check(r.workers.some((w) => w.role === "smoker_specialist"), () =>
    "content needs at least one smoker_specialist worker");
  check(r.workers.some((w) => w.role === "greeter"), () => "content needs at least one greeter worker");
  const sp = r.staffProgression;
  check(sp.maxLevel >= 1, () => "staffProgression.maxLevel must be >= 1");
  check(sp.xpThresholds.length === sp.maxLevel, () =>
    `staffProgression.xpThresholds must have maxLevel (${sp.maxLevel}) entries`);
  check(sp.xpThresholds[0] === 0, () => "staffProgression.xpThresholds[0] must be 0");
  for (let i = 1; i < sp.xpThresholds.length; i++) {
    check(sp.xpThresholds[i]! > sp.xpThresholds[i - 1]!, () =>
      "staffProgression.xpThresholds must be strictly increasing");
  }
  check(sp.traits.length > 0, () => "staffProgression.traits must not be empty");
  check(sp.traitsOnHire <= sp.traits.length, () =>
    "staffProgression.traitsOnHire must be <= traits.size");
  check(sp.shifts.baseOnShiftSlots >= 1, () =>
    "staffProgression.shifts.baseOnShiftSlots must be >= 1");
  check(sp.shifts.overtimeWagePermille >= 1, () =>
    "staffProgression.shifts.overtimeWagePermille must be >= 1");
  check(sp.shifts.supervisorExtraSlots >= 0, () =>
    "staffProgression.shifts.supervisorExtraSlots must be >= 0");
  check(sp.roleBuffs.greeterPatienceDrainMultPermille >= 1, () =>
    "staffProgression.roleBuffs.greeterPatienceDrainMultPermille must be >= 1");
  check(sp.roleBuffs.smokerSpecialistProcessSpeedPermille >= 1, () =>
    "staffProgression.roleBuffs.smokerSpecialistProcessSpeedPermille must be >= 1");
  check(sp.roleBuffs.iceRunnerFragileSpoilTierMin >= 1 && sp.roleBuffs.iceRunnerFragileSpoilTierMin <= 3, () =>
    "staffProgression.roleBuffs.iceRunnerFragileSpoilTierMin must be 1..3");
  check(sp.roleBuffs.iceRunnerSpoilScoreBonus >= 0, () =>
    "staffProgression.roleBuffs.iceRunnerSpoilScoreBonus must be >= 0");
  check(sp.loadouts.slots.length > 0, () => "staffProgression.loadouts.slots must not be empty");
  const seenSlotIds = new Set<string>();
  const seenGearUpgrades = new Set<string>();
  for (const slot of sp.loadouts.slots) {
    check(!!slot.id, () => "loadout slot id must not be blank");
    check(!seenSlotIds.has(slot.id), () => `duplicate loadout slot ${slot.id}`);
    seenSlotIds.add(slot.id);
    check(slot.upgradeIds.length > 0, () => `loadout slot ${slot.id}: upgradeIds must not be empty`);
    for (const uid of slot.upgradeIds) {
      check(!seenGearUpgrades.has(uid), () => `upgrade ${uid} listed in multiple loadout slots`);
      seenGearUpgrades.add(uid);
      const u = r.upgrades.find((x) => x.id === uid);
      check(!!u, () => `loadout slot ${slot.id}: unknown upgrade ${uid}`);
      const kind = u!.effect.kind;
      check(
        kind === "worker_move_speed" || kind === "worker_carry" || kind === "worker_catch_speed",
        () => `loadout upgrade ${uid} must use worker_move_speed / worker_carry / worker_catch_speed`,
      );
    }
  }
  for (const t of sp.traits) {
    check(t.weight >= 1, () => `${t.id}: weight must be >= 1`);
    check((t.moveSpeedPermille ?? 1000) >= 1, () => `${t.id}: moveSpeedPermille must be >= 1`);
    check((t.catchSpeedPermille ?? 1000) >= 1, () => `${t.id}: catchSpeedPermille must be >= 1`);
    check((t.carryBonus ?? 0) >= 0, () => `${t.id}: carryBonus must be >= 0`);
    check((t.transferIntervalMultPermille ?? 1000) >= 1, () =>
      `${t.id}: transferIntervalMultPermille must be >= 1`);
  }
  check(r.routing.urgencyWeight >= 0, () => "routing.urgencyWeight must be >= 0");
  check(r.routing.distanceWeight >= 0, () => "routing.distanceWeight must be >= 0");
  check(r.routing.demandWeight >= 0, () => "routing.demandWeight must be >= 0");
  check(r.routing.supervisorDemandBoostPermille >= 1, () => "routing.supervisorDemandBoostPermille must be >= 1");
  check(r.automationAlerts.machineIdleTicksDuringRush >= 1, () =>
    "automationAlerts.machineIdleTicksDuringRush must be >= 1");
  check(r.automationAlerts.alertCooldownTicks >= 1, () =>
    "automationAlerts.alertCooldownTicks must be >= 1");
  check(r.offline.capHours >= 1, () => "offline.capHours must be >= 1");
  check(r.offline.summaryMinSeconds >= 0, () => "offline.summaryMinSeconds must be >= 0");
  check(r.dailyGoals.dayLengthMs >= 1, () => "dailyGoals.dayLengthMs must be >= 1");
  check(r.dailyGoals.boardSlots >= 1, () => "dailyGoals.boardSlots must be >= 1");
  check(r.dailyGoals.streakBonusCoinsPerDay >= 0, () =>
    "dailyGoals.streakBonusCoinsPerDay must be >= 0");
  check(r.dailyGoals.maxStreakBonusDays >= 1, () => "dailyGoals.maxStreakBonusDays must be >= 1");
  check(r.dailyGoals.objectives.length >= r.dailyGoals.boardSlots, () =>
    "dailyGoals.objectives must cover boardSlots");
  const dailyIds = new Set<string>();
  for (const o of r.dailyGoals.objectives) {
    check(o.id.startsWith("daily."), () => `${o.id}: daily objective id must start with 'daily.'`);
    check(!dailyIds.has(o.id), () => `${o.id}: duplicate daily objective id`);
    dailyIds.add(o.id);
    check(!!o.name.trim(), () => `${o.id}: name must not be blank`);
    check(!!o.description.trim(), () => `${o.id}: description must not be blank`);
    check(o.goal.atLeast >= 1, () => `${o.id}: goal.atLeast must be >= 1`);
    check(!!o.goal.stat.trim(), () => `${o.id}: goal.stat must not be blank`);
    check(o.rewardCoins >= 0, () => `${o.id}: rewardCoins must be >= 0`);
    check(o.weight >= 1, () => `${o.id}: weight must be >= 1`);
  }
  check(r.economy.maintenancePeriodTicks >= 1, () => "economy.maintenancePeriodTicks must be >= 1");
  check(r.economy.maintenanceCoinsPerStation >= 0, () => "economy.maintenanceCoinsPerStation must be >= 0");
  check(r.economy.counterSpoilPeriodTicks >= 1, () => "economy.counterSpoilPeriodTicks must be >= 1");
  check(r.economy.counterSpoilUnits >= 0, () => "economy.counterSpoilUnits must be >= 0");
  check(r.economy.bagFishSpoilPeriodTicks >= 1, () => "economy.bagFishSpoilPeriodTicks must be >= 1");
  check(r.economy.bagFishSpoilUnits >= 0, () => "economy.bagFishSpoilUnits must be >= 0");
  check(r.economy.scarcityPriceCurvePermille?.length === 5, () =>
    "economy.scarcityPriceCurvePermille must have exactly 5 bands");
  for (let i = 0; i < (r.economy.scarcityPriceCurvePermille?.length ?? 0); i++) {
    check(r.economy.scarcityPriceCurvePermille![i]! >= 1, () =>
      `economy.scarcityPriceCurvePermille[${i}] must be >= 1`);
  }
  const economyRequirable = new Set([...p.upgradesById.keys(), ...p.questsById.keys()]);
  for (const req of r.economy.requires) {
    check(economyRequirable.has(req), () => `economy: unknown requirement '${req}'`);
  }
  const wear = r.economy.wear;
  check(wear.checkPeriodTicks >= 1, () => "economy.wear.checkPeriodTicks must be >= 1");
  check(wear.chancePermille >= 0 && wear.chancePermille <= 1000, () =>
    "economy.wear.chancePermille must be 0..1000");
  check(wear.breakChancePermille >= 0 && wear.breakChancePermille <= 1000, () =>
    "economy.wear.breakChancePermille must be 0..1000");
  check(wear.slowDurationTicks >= 1, () => "economy.wear.slowDurationTicks must be >= 1");
  check(wear.slowProcessMultPermille >= 1000, () =>
    "economy.wear.slowProcessMultPermille must be >= 1000");
  check(wear.repairCoins >= 0, () => "economy.wear.repairCoins must be >= 0");
  for (const req of wear.requires) {
    check(economyRequirable.has(req), () => `economy.wear: unknown requirement '${req}'`);
  }
  check(!!r.ecology, () => "ecology is required");
  check(r.ecology.dayLengthTicks >= 1, () => "ecology.dayLengthTicks must be >= 1");
  check(r.ecology.parts.length >= 2, () => "ecology.parts needs at least 2 day parts");
  check(new Set(r.ecology.parts.map((p) => p.id)).size === r.ecology.parts.length, () =>
    "ecology.parts ids must be unique");
  let prevEnd = 0;
  for (const part of r.ecology.parts) {
    check(part.endPermille > prevEnd, () =>
      `ecology.${part.id}: endPermille must increase (was ${prevEnd} → ${part.endPermille})`);
    check(part.regenMultPermille >= 1, () => `ecology.${part.id}: regenMultPermille must be >= 1`);
    check(part.catchSpeedMultPermille >= 1, () => `ecology.${part.id}: catchSpeedMultPermille must be >= 1`);
    prevEnd = part.endPermille;
  }
  check(r.ecology.parts[r.ecology.parts.length - 1]!.endPermille === 1000, () =>
    "ecology.parts must end at endPermille 1000");
  check(r.trophies.sizeMinPermille <= r.trophies.sizeMaxPermille, () =>
    "trophies: sizeMinPermille must be <= sizeMaxPermille");
  check(r.trophies.sets.length > 0, () => "trophies.sets must not be empty");
  check(new Set(r.trophies.sets.map((s) => s.id)).size === r.trophies.sets.length, () =>
    "trophies.sets ids must be unique");
  check(new Set(r.trophies.sets.map((s) => s.completeStat)).size === r.trophies.sets.length, () =>
    "trophies.sets completeStat values must be unique");
  for (const set of r.trophies.sets) {
    check(set.species.length > 0, () => `${set.id}: species must not be empty`);
    check(new Set(set.species).size === set.species.length, () => `${set.id}: species must be unique`);
    check(set.completeStat.startsWith("stat."), () => `${set.id}: completeStat must start with 'stat.'`);
    for (const sp of set.species) {
      check(p.speciesById.has(sp), () => `${set.id}: unknown species '${sp}'`);
    }
  }
  check(r.prestige.ratingThresholds.length === 5, () => "prestige.ratingThresholds must have exactly 5 entries");
  check(r.prestige.ratingPriceMultPermille?.length === 6, () =>
    "prestige.ratingPriceMultPermille must have exactly 6 entries (stars 0..5)");
  for (let i = 0; i < (r.prestige.ratingPriceMultPermille?.length ?? 0); i++) {
    check(r.prestige.ratingPriceMultPermille![i]! >= 1, () =>
      `prestige.ratingPriceMultPermille[${i}] must be >= 1`);
  }
  check(r.prestige.milestones.length > 0, () => "prestige.milestones must not be empty");
  for (let i = 1; i < r.prestige.ratingThresholds.length; i++) {
    check(r.prestige.ratingThresholds[i]! >= r.prestige.ratingThresholds[i - 1]!, () =>
      "prestige.ratingThresholds must be non-decreasing");
  }
  const achievementCategories = new Set(["fishing", "kitchen", "commerce", "exploration", "mastery"]);
  check(!!r.achievements, () => "achievements is required");
  check(r.achievements.entries.length > 0, () => "achievements.entries must not be empty");
  check(new Set(r.achievements.entries.map((a) => a.id)).size === r.achievements.entries.length, () =>
    "achievements.entries ids must be unique");
  for (const a of r.achievements.entries) {
    check(a.id.startsWith("achievement."), () => `${a.id}: id must start with 'achievement.'`);
    check(a.name.trim().length > 0, () => `${a.id}: name must not be blank`);
    check(a.description.trim().length > 0, () => `${a.id}: description must not be blank`);
    check(achievementCategories.has(a.category), () =>
      `${a.id}: category must be one of ${[...achievementCategories].join(", ")}`);
    check(a.goal.stat.startsWith("stat."), () => `${a.id}: goal.stat must start with 'stat.'`);
    check(a.goal.atLeast >= 1, () => `${a.id}: goal.atLeast must be >= 1`);
    check(a.rewardCoins >= 0, () => `${a.id}: rewardCoins must be >= 0`);
  }
  const codexFamilies = new Set(["pier", "cove", "jetty", "polar", "marina", "reef", "storm", "ember", "trophy"]);
  check(!!r.codex, () => "codex is required");
  check(r.codex.families.length > 0, () => "codex.families must not be empty");
  check(new Set(r.codex.families).size === r.codex.families.length, () => "codex.families must be unique");
  for (const f of r.codex.families) {
    check(codexFamilies.has(f), () => `codex.families: unknown family '${f}'`);
  }
  check(r.codex.entries.length > 0, () => "codex.entries must not be empty");
  check(new Set(r.codex.entries.map((e) => e.speciesId)).size === r.codex.entries.length, () =>
    "codex.entries speciesId must be unique");
  check(r.codex.entries.length === r.species.length, () =>
    `codex.entries size ${r.codex.entries.length} must match species ${r.species.length}`);
  for (const e of r.codex.entries) {
    check(p.speciesById.has(e.speciesId), () => `codex: unknown species '${e.speciesId}'`);
    check(codexFamilies.has(e.family), () => `${e.speciesId}: unknown family '${e.family}'`);
    check(r.codex.families.includes(e.family), () =>
      `${e.speciesId}: family '${e.family}' not listed in codex.families`);
    check(e.lore.trim().length > 0, () => `${e.speciesId}: lore must not be blank`);
    check(e.habitatHint.trim().length > 0, () => `${e.speciesId}: habitatHint must not be blank`);
    check(e.journalTip.trim().length > 0, () => `${e.speciesId}: journalTip must not be blank`);
  }
  for (const sp of r.species) {
    check(p.codexBySpeciesId.has(sp.id), () => `${sp.id}: missing codex entry`);
  }
  check(!!r.weather, () => "weather is required");
  check(r.weather.patterns.length >= 2, () => "weather.patterns needs at least 2 patterns");
  check(new Set(r.weather.patterns.map((pat) => pat.id)).size === r.weather.patterns.length, () =>
    "weather.patterns ids must be unique");
  for (const pat of r.weather.patterns) {
    check(pat.id.startsWith("weather."), () => `${pat.id}: id must start with 'weather.'`);
    check(pat.name.trim().length > 0, () => `${pat.id}: name must not be blank`);
    check(pat.description.trim().length > 0, () => `${pat.id}: description must not be blank`);
    check(pat.durationTicks >= 1, () => `${pat.id}: durationTicks must be >= 1`);
    check(pat.catchSpeedMultPermille >= 1, () => `${pat.id}: catchSpeedMultPermille must be >= 1`);
    check(pat.regenMultPermille >= 1, () => `${pat.id}: regenMultPermille must be >= 1`);
    check(pat.customerSpawnMultPermille >= 1, () => `${pat.id}: customerSpawnMultPermille must be >= 1`);
    check(pat.rareChanceBonusPermille >= 0 && pat.rareChanceBonusPermille <= 1000, () =>
      `${pat.id}: rareChanceBonusPermille must be 0..1000`);
  }
  const tide = r.weather.tide;
  check(!!tide, () => "weather.tide is required");
  check(tide.periodTicks >= 1, () => "weather.tide.periodTicks must be >= 1");
  check(tide.phases.length >= 2, () => "weather.tide.phases needs at least 2 phases");
  check(new Set(tide.phases.map((ph) => ph.id)).size === tide.phases.length, () =>
    "weather.tide.phases ids must be unique");
  let prevTideEnd = 0;
  for (const phase of tide.phases) {
    check(phase.id.startsWith("tide."), () => `${phase.id}: id must start with 'tide.'`);
    check(phase.name.trim().length > 0, () => `${phase.id}: name must not be blank`);
    check(phase.endPermille > prevTideEnd, () =>
      `weather.tide.${phase.id}: endPermille must increase (was ${prevTideEnd} → ${phase.endPermille})`);
    check(phase.catchSpeedMultPermille >= 1, () => `${phase.id}: catchSpeedMultPermille must be >= 1`);
    check(phase.regenMultPermille >= 1, () => `${phase.id}: regenMultPermille must be >= 1`);
    check(phase.customerSpawnMultPermille >= 1, () => `${phase.id}: customerSpawnMultPermille must be >= 1`);
    prevTideEnd = phase.endPermille;
  }
  check(tide.phases[tide.phases.length - 1]!.endPermille === 1000, () =>
    "weather.tide.phases must end at endPermille 1000");
  check(tide.chartCatchBonusPermille >= 0 && tide.chartCatchBonusPermille <= 1000, () =>
    "weather.tide.chartCatchBonusPermille must be 0..1000");
  check(tide.chartRegenEasePermille >= 0 && tide.chartRegenEasePermille <= 1000, () =>
    "weather.tide.chartRegenEasePermille must be 0..1000");
  check(tide.chartCrowdBonusPermille >= 0 && tide.chartCrowdBonusPermille <= 1000, () =>
    "weather.tide.chartCrowdBonusPermille must be 0..1000");
  const mastery = r.fishingMastery;
  check(mastery.maxLevel >= 1, () => "fishingMastery.maxLevel must be >= 1");
  check(mastery.xpThresholds.length === mastery.maxLevel, () =>
    `fishingMastery.xpThresholds must have maxLevel (${mastery.maxLevel}) entries`);
  check(mastery.xpThresholds[0] === 0, () => "fishingMastery.xpThresholds[0] must be 0");
  for (let i = 1; i < mastery.xpThresholds.length; i++) {
    check(mastery.xpThresholds[i]! > mastery.xpThresholds[i - 1]!, () =>
      "fishingMastery.xpThresholds must be strictly increasing");
  }
  check(mastery.techniques.length > 0, () => "fishingMastery.techniques must not be empty");
  check(mastery.techniques.some((x) => x.requiresMasteryLevel === 0), () =>
    "fishingMastery.techniques needs at least one technique with requiresMasteryLevel 0");
  for (const tech of mastery.techniques) {
    check(tech.id.startsWith("technique."), () => `${tech.id}: id must start with 'technique.'`);
    check(tech.requiresMasteryLevel >= 0 && tech.requiresMasteryLevel <= mastery.maxLevel, () =>
      `${tech.id}: requiresMasteryLevel must be 0..maxLevel`);
    check(tech.catchSpeedMultPermille >= 1, () => `${tech.id}: catchSpeedMultPermille must be >= 1`);
    check(tech.perfectBonusPermille >= 0, () => `${tech.id}: perfectBonusPermille must be >= 0`);
    check(tech.rareChanceBonusPermille >= 0 && tech.rareChanceBonusPermille <= 1000, () =>
      `${tech.id}: rareChanceBonusPermille must be 0..1000`);
  }
  check(mastery.coachingTips.length > 0, () => "fishingMastery.coachingTips must not be empty");
  for (const tip of mastery.coachingTips) {
    check(tip.id.startsWith("tip.mastery."), () => `${tip.id}: id must start with 'tip.mastery.'`);
    check(tip.minGlobalLevel <= tip.maxGlobalLevel, () =>
      `${tip.id}: minGlobalLevel must be <= maxGlobalLevel`);
    check(tip.text.trim().length > 0, () => `${tip.id}: text must not be blank`);
  }
  const trees = r.staffTrees;
  check(trees.branches.length > 0, () => "staffTrees.branches must not be empty");
  check(new Set(trees.branches.map((b) => b.id)).size === trees.branches.length, () =>
    "staffTrees.branches ids must be unique");
  check(trees.branches.filter((b) => b.parentId === null).length >= 1, () =>
    "staffTrees.branches needs at least one root");
  const roleWires = new Set<string>(r.workers.map((w) => w.role));
  const dayParts = new Set(r.ecology.parts.map((p) => p.id));
  for (const b of trees.branches) {
    check(b.id.startsWith("branch."), () => `${b.id}: id must start with 'branch.'`);
    check(roleWires.has(b.role), () => `${b.id}: unknown role '${b.role}'`);
    check(b.requiresWorkerLevel >= 1, () => `${b.id}: requiresWorkerLevel must be >= 1`);
    check(b.trainingXpRequired >= 1, () => `${b.id}: trainingXpRequired must be >= 1`);
    check(b.catchSpeedMultPermille >= 1, () => `${b.id}: catchSpeedMultPermille must be >= 1`);
    check(b.moveSpeedMultPermille >= 1, () => `${b.id}: moveSpeedMultPermille must be >= 1`);
    check(b.transferIntervalMultPermille >= 1, () => `${b.id}: transferIntervalMultPermille must be >= 1`);
    check(b.wageMultPermille >= 1, () => `${b.id}: wageMultPermille must be >= 1`);
    const parent = b.parentId;
    if (parent !== null) {
      check(p.staffBranchesById.has(parent), () => `${b.id}: unknown parent '${parent}'`);
      check(p.staffBranchesById.get(parent)!.role === b.role, () => `${b.id}: parent role must match`);
    }
  }
  check(trees.schedules.length > 0, () => "staffTrees.schedules must not be empty");
  check(new Set(trees.schedules.map((s) => s.id)).size === trees.schedules.length, () =>
    "staffTrees.schedules ids must be unique");
  for (const sch of trees.schedules) {
    check(sch.id.startsWith("schedule."), () => `${sch.id}: id must start with 'schedule.'`);
    check(sch.dayParts.length > 0, () => `${sch.id}: dayParts must not be empty`);
    for (const part of sch.dayParts) {
      check(dayParts.has(part), () => `${sch.id}: unknown day part '${part}'`);
    }
    check(sch.wageMultPermille >= 1, () => `${sch.id}: wageMultPermille must be >= 1`);
  }
  const rep = r.reputation;
  check(!!rep, () => "reputation is required");
  check(rep.minSample >= 1, () => "reputation.minSample must be >= 1");
  check(rep.neutralScorePermille >= 1, () => "reputation.neutralScorePermille must be >= 1");
  check(rep.scoreBandThresholdsPermille.length > 0, () =>
    "reputation.scoreBandThresholdsPermille must not be empty");
  for (let i = 1; i < rep.scoreBandThresholdsPermille.length; i++) {
    check(rep.scoreBandThresholdsPermille[i]! >= rep.scoreBandThresholdsPermille[i - 1]!, () =>
      "reputation.scoreBandThresholdsPermille must be non-decreasing");
  }
  check(rep.kindSpawnMultPermille.length === rep.scoreBandThresholdsPermille.length + 1, () =>
    "reputation.kindSpawnMultPermille must have thresholds+1 rows");
  const kindWires = new Set([
    "standard", "premium", "bulk", "tourist", "wholesaler", "critic", "night_regular",
  ]);
  for (let bandIdx = 0; bandIdx < rep.kindSpawnMultPermille.length; bandIdx++) {
    const row = rep.kindSpawnMultPermille[bandIdx]!;
    for (const kind of kindWires) {
      check(row[kind] !== undefined, () =>
        `reputation.kindSpawnMultPermille[${bandIdx}] must include every customer kind`);
    }
    for (const [kind, mult] of Object.entries(row)) {
      check(kindWires.has(kind), () =>
        `reputation.kindSpawnMultPermille[${bandIdx}]: unknown kind '${kind}'`);
      check(mult >= 1, () =>
        `reputation.kindSpawnMultPermille[${bandIdx}].${kind} must be >= 1`);
    }
  }
  check(rep.unmetPreferencePenaltyPermille >= 0, () =>
    "reputation.unmetPreferencePenaltyPermille must be >= 0");
  check(rep.coachingLostRatioPermille >= 0 && rep.coachingLostRatioPermille <= 1000, () =>
    "reputation.coachingLostRatioPermille must be 0..1000");
  check(rep.coachingPraiseScorePermille >= 1, () =>
    "reputation.coachingPraiseScorePermille must be >= 1");
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
    const kind = t.kind ?? "standard";
    check(kind === "standard" || kind === "standing", () => `${t.id}: unknown contract kind '${kind}'`);
    const payoutEsc = t.payoutEscalatePermille ?? 1000;
    const penaltyEsc = t.penaltyEscalatePermille ?? 1000;
    const maxStreak = t.maxStreak ?? 1;
    const failCd = t.failCooldownTicks ?? 1;
    check(payoutEsc >= 1, () => `${t.id}: payoutEscalatePermille must be >= 1`);
    check(penaltyEsc >= 1, () => `${t.id}: penaltyEscalatePermille must be >= 1`);
    check(maxStreak >= 1, () => `${t.id}: maxStreak must be >= 1`);
    check(failCd >= 1, () => `${t.id}: failCooldownTicks must be >= 1`);
    if (kind === "standing") {
      check(payoutEsc >= 1000, () => `${t.id}: standing payoutEscalatePermille must be >= 1000`);
      check(penaltyEsc >= 1000, () => `${t.id}: standing penaltyEscalatePermille must be >= 1000`);
    }
    const seasonalReq = t.requiresSeasonalEvent;
    if (seasonalReq != null) {
      check(p.seasonalEventsById.has(seasonalReq), () =>
        `${t.id}: unknown requiresSeasonalEvent '${seasonalReq}'`);
    }
    if (kind === "standing") {
      check(t.chainId == null, () => `${t.id}: standing contracts cannot be chain steps`);
    }
    if (t.requiresReputationBand != null) {
      const maxRepBand = r.reputation.scoreBandThresholdsPermille.length;
      check(t.requiresReputationBand >= 0 && t.requiresReputationBand <= maxRepBand, () =>
        `${t.id}: requiresReputationBand must be 0..${maxRepBand}`);
    }
    if (t.chainId != null) {
      check(t.chainId.trim().length > 0, () => `${t.id}: chainId must not be blank`);
      check((t.chainStep ?? 1) >= 1, () => `${t.id}: chainStep must be >= 1`);
    }
  }
  check((r.contracts.failStreakThreshold ?? 3) >= 1, () => "contracts.failStreakThreshold must be >= 1");
  check((r.contracts.failStreakBoardSlotPenalty ?? 1) >= 0, () =>
    "contracts.failStreakBoardSlotPenalty must be >= 0");
  check((r.contracts.failStreakOfferWeightMultPermille ?? 700) >= 1, () =>
    "contracts.failStreakOfferWeightMultPermille must be >= 1");
  for (const [i, mult] of (r.contracts.reputationPayoutMultPermille ?? []).entries()) {
    check(mult >= 1, () => `contracts.reputationPayoutMultPermille[${i}] must be >= 1`);
  }
  const chainSteps = new Map<string, Set<number>>();
  for (const t of r.contracts.templates) {
    if (!t.chainId) continue;
    const steps = chainSteps.get(t.chainId) ?? new Set<number>();
    const step = t.chainStep ?? 1;
    check(!steps.has(step), () => `${t.id}: duplicate chainStep ${step} in chain '${t.chainId}'`);
    steps.add(step);
    chainSteps.set(t.chainId, steps);
  }
  for (const [chainId, steps] of chainSteps) {
    check(steps.size >= 2, () => `chain '${chainId}' needs at least 2 steps`);
    const maxStep = Math.max(...steps);
    for (let step = 1; step <= maxStep; step++) {
      check(steps.has(step), () => `chain '${chainId}' missing chainStep ${step}`);
    }
  }

  const unitsOrZero = (item: string) =>
    p.speciesById.get(item)?.carryUnits ?? p.productsById.get(item)?.carryUnits ?? p.baitById.get(item)?.carryUnits ?? 0;

  for (const sp of r.species) {
    const tier = sp.spoilTier ?? 2;
    check(tier >= 1 && tier <= 3, () => `${sp.id}: spoilTier must be 1..3`);
    sp.spoilTier = tier;
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
  for (const prod of r.products) {
    const tier = prod.spoilTier ?? 2;
    check(tier >= 1 && tier <= 3, () => `${prod.id}: spoilTier must be 1..3`);
    prod.spoilTier = tier;
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
    } else if (e.kind === "grant_bait") {
      check(p.baitById.has(e.bait), () => `${u.id}: grant_bait unknown '${e.bait}'`);
      check(e.quantity >= 1, () => `${u.id}: grant_bait quantity must be >= 1`);
    } else if (e.kind === "timing_window") {
      check(e.windowStartPermille < e.windowEndPermille, () =>
        `${u.id}: timing_window windowStart must be < windowEnd`);
      check(e.perfectStartPermille < e.perfectEndPermille, () =>
        `${u.id}: timing_window perfectStart must be < perfectEnd`);
      check(e.perfectStartPermille >= e.windowStartPermille, () =>
        `${u.id}: timing_window Perfect must sit inside Good (start)`);
      check(e.perfectEndPermille <= e.windowEndPermille, () =>
        `${u.id}: timing_window Perfect must sit inside Good (end)`);
      check(e.windowStartPermille < r.player.timingWindowStartPermille, () =>
        `${u.id}: timing_window must widen Good start vs player default`);
      check(e.windowEndPermille > r.player.timingWindowEndPermille, () =>
        `${u.id}: timing_window must widen Good end vs player default`);
    } else if (e.kind === "fish_regen") {
      check(e.speedPermille > r.player.startFishRegenPermille, () =>
        `${u.id}: fish regen does not exceed the starting fish regen`);
    } else if (e.kind === "unlock_fishing_spot") {
      const spot = r.harbors.flatMap((h) => h.fishingSpots).find((f) => f.zone === e.zone);
      check(!!spot, () => `${u.id}: unlock_fishing_spot unknown zone '${e.zone}'`);
      check(spot?.requiresUpgrade === u.id, () =>
        `${u.id}: unlock_fishing_spot zone must list this upgrade as requiresUpgrade`);
    } else if (e.kind === "unlock_machine") {
      check(p.machinesById.has(e.machine), () => `${u.id}: unlock_machine unknown '${e.machine}'`);
      const stations = r.harbors.flatMap((h) => h.stations).filter((st) => st.machine === e.machine);
      check(stations.length > 0, () => `${u.id}: unlock_machine has no stations for '${e.machine}'`);
      for (const st of stations) {
        check(st.requiresUpgrade === u.id, () =>
          `${u.id}: station '${st.id}' must list this upgrade as requiresUpgrade`);
      }
    } else if (e.kind === "unlock_counter") {
      const counters = r.harbors.flatMap((h) => h.counters).filter((c) => (c.kind ?? "retail") === e.pad);
      check(counters.length > 0, () => `${u.id}: unlock_counter has no '${e.pad}' counters`);
      for (const c of counters) {
        check(c.requiresUpgrade === u.id, () =>
          `${u.id}: counter '${c.id}' must list this upgrade as requiresUpgrade`);
      }
      for (const h of r.harbors) {
        check(h.counters.some((c) => (c.kind ?? "retail") === e.pad), () =>
          `${u.id}: harbor '${h.id}' needs a '${e.pad}' counter`);
      }
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
    } else if (e.kind === "counter_spoil_resist") {
      check(e.periodMultPermille > 1000, () => `${u.id}: counter_spoil_resist must exceed 1000`);
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

  check(r.decor.items.length > 0, () => "decor.items must not be empty");
  const prestigeCosmetics = new Set(
    r.prestige.milestones.map((m) => m.reward.cosmetic).filter((x): x is string => !!x),
  );
  for (const d of r.decor.items) {
    check(d.id.startsWith("decor."), () => `${d.id}: decor id must start with 'decor.'`);
    check(d.name.trim().length > 0, () => `${d.id}: name must not be blank`);
    check(d.description.trim().length > 0, () => `${d.id}: description must not be blank`);
    check(d.cost >= 0, () => `${d.id}: cost must be >= 0`);
    check((d.patienceBonusTicks ?? 0) >= 0, () => `${d.id}: patienceBonusTicks must be >= 0`);
    const cos = d.requiresCosmetic;
    if (cos != null) {
      check(cos.trim().length > 0, () => `${d.id}: requiresCosmetic must be non-empty when set`);
      check(prestigeCosmetics.has(cos), () =>
        `${d.id}: requiresCosmetic '${cos}' is not granted by any prestige milestone`);
    }
  }

  const bank = r.bank;
  check(bank.loanPrincipal >= 1, () => "bank.loanPrincipal must be >= 1");
  check(bank.repayPermille >= 1000, () => "bank.repayPermille must be >= 1000");
  check(bank.termTicks >= 1, () => "bank.termTicks must be >= 1");
  check(bank.collectionPeriodTicks >= 1, () => "bank.collectionPeriodTicks must be >= 1");
  check(bank.goalPresets.length > 0, () => "bank.goalPresets must not be empty");
  check(new Set(bank.goalPresets).size === bank.goalPresets.length, () =>
    "bank.goalPresets must be unique");
  for (const goal of bank.goalPresets) {
    check(goal >= 1, () => "bank.goalPresets entries must be >= 1");
  }
  for (const req of bank.requires) {
    check(economyRequirable.has(req), () => `bank: unknown requirement '${req}'`);
  }

  check(r.seasonalEvents.events.length > 0, () => "seasonalEvents.events must not be empty");
  const seasonalWindows: Array<{ period: number; start: number; end: number }> = [];
  for (const e of r.seasonalEvents.events) {
    check(e.id.startsWith("event."), () => `${e.id}: seasonal event id must start with 'event.'`);
    check(e.name.trim().length > 0, () => `${e.id}: name must not be blank`);
    check(e.description.trim().length > 0, () => `${e.id}: description must not be blank`);
    check(e.periodTicks >= 1, () => `${e.id}: periodTicks must be >= 1`);
    check(e.startTick >= 0, () => `${e.id}: startTick must be >= 0`);
    check(e.durationTicks >= 1, () => `${e.id}: durationTicks must be >= 1`);
    check(e.startTick + e.durationTicks <= e.periodTicks, () =>
      `${e.id}: window must fit inside periodTicks (no wrap)`);
    if (e.banner != null) {
      check(e.banner.trim().length > 0, () => `${e.id}: banner must be non-empty when set`);
    }
    const end = e.startTick + e.durationTicks;
    for (const [sp, mult] of Object.entries(e.speciesWeightMultPermille ?? {})) {
      check(p.speciesById.has(sp), () => `${e.id}: unknown species '${sp}'`);
      check(mult >= 1, () => `${e.id}: speciesWeightMultPermille.${sp} must be >= 1`);
    }
    const crowdMult = e.customerSpawnMultPermille ?? 1000;
    const priceMult = e.priceMultPermille ?? 1000;
    check(crowdMult >= 1, () => `${e.id}: customerSpawnMultPermille must be >= 1`);
    check(priceMult >= 1, () => `${e.id}: priceMultPermille must be >= 1`);
    for (const cid of e.festivalCustomerIds ?? []) {
      check(p.customersById.has(cid), () => `${e.id}: unknown festivalCustomerId '${cid}'`);
      const guest = p.customersById.get(cid)!;
      check(guest.requiresSeasonalEvent === e.id, () =>
        `${e.id}: festivalCustomerId '${cid}' must require this seasonal event`);
    }
    for (const other of seasonalWindows) {
      if (other.period !== e.periodTicks) continue;
      check(end <= other.start || other.end <= e.startTick, () =>
        `${e.id}: overlaps another seasonal event window inside the period`);
    }
    seasonalWindows.push({ period: e.periodTicks, start: e.startTick, end });
  }

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
    if (c.kind === "premium" || c.kind === "tourist" || c.kind === "critic") {
      check(c.priceMultPermille > 1000, () =>
        `${c.id}: ${c.kind} customers must tip (priceMultPermille > 1000)`);
    }
    if (c.kind === "bulk") {
      check(c.basketMin >= 5, () => `${c.id}: bulk customers need basketMin >= 5`);
    }
    if (c.kind === "wholesaler") {
      check(c.basketMin >= 2, () => `${c.id}: wholesaler customers need basketMin >= 2`);
    }
    if (c.kind === "critic") {
      check(c.preferredProducts.length > 0, () => `${c.id}: critic customers need preferred products`);
      check(c.unmetPatienceDrainPermille >= 2500, () =>
        `${c.id}: critic unmetPatienceDrainPermille must be >= 2500`);
    }
    if (c.kind === "night_regular") {
      const night = c.dayPartSpawnMultPermille?.night ?? 1000;
      const day = c.dayPartSpawnMultPermille?.day ?? 1000;
      check(night > day, () => `${c.id}: night_regular needs night spawn mult > day`);
    }
    const ecologyParts = new Set(r.ecology.parts.map((part) => part.id));
    for (const [partId, mult] of Object.entries(c.dayPartSpawnMultPermille ?? {})) {
      check(ecologyParts.has(partId), () => `${c.id}: unknown day-part '${partId}' in dayPartSpawnMultPermille`);
      check(mult >= 1, () => `${c.id}: dayPartSpawnMultPermille.${partId} must be >= 1`);
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
    if (c.requiresSeasonalEvent) {
      check(p.seasonalEventsById.has(c.requiresSeasonalEvent), () =>
        `${c.id}: unknown requiresSeasonalEvent '${c.requiresSeasonalEvent}'`);
    }
  }

  const specializationIds = new Set<string>();
  const customerKindWires = new Set([
    "standard", "premium", "bulk", "tourist", "wholesaler", "critic", "night_regular",
  ]);
  for (const h of r.harbors) {
    const zones = new Map(h.zones.map((z) => [z.id, z]));
    const open = (x: number, z: number) => h.walkable.some((w) => rectContains(w, x, z)) && !h.obstacles.some((o) => rectContains(o, x, z));
    for (const req of h.requires) {
      check(
        p.upgradesById.has(req) || p.questsById.has(req) || p.prestigeMilestonesById.has(req),
        () => `${h.id}: unknown requirement '${req}'`,
      );
    }
    const sp = h.specialization;
    check(!!sp, () => `${h.id}: specialization is required`);
    if (sp) {
      check(sp.id.startsWith("spec."), () => `${h.id}: specialization.id must start with 'spec.'`);
      check(sp.name.trim().length > 0, () => `${h.id}: specialization.name must not be blank`);
      check(sp.description.trim().length > 0, () => `${h.id}: specialization.description must not be blank`);
      check((sp.maintenanceDiscountPerStation ?? 0) >= 0, () =>
        `${h.id}: specialization.maintenanceDiscountPerStation must be >= 0`);
      const rareBonus = sp.rareChanceBonusPermille ?? 0;
      check(rareBonus >= 0 && rareBonus <= 1000, () =>
        `${h.id}: specialization.rareChanceBonusPermille must be 0..1000`);
      for (const [kind, mult] of Object.entries(sp.kindSpawnMultPermille ?? {})) {
        check(customerKindWires.has(kind), () => `${h.id}: specialization.kindSpawnMultPermille unknown kind '${kind}'`);
        check(mult >= 1, () => `${h.id}: specialization.kindSpawnMultPermille.${kind} must be >= 1`);
      }
      check(!specializationIds.has(sp.id), () => `${h.id}: duplicate specialization '${sp.id}'`);
      specializationIds.add(sp.id);
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
      for (const [partId, mult] of Object.entries(f.dayPartRegenMultPermille ?? {})) {
        check(r.ecology.parts.some((part) => part.id === partId), () =>
          `${h.id}: '${f.zone}' dayPartRegenMultPermille unknown part '${partId}'`);
        check(mult >= 1, () => `${h.id}: '${f.zone}' dayPartRegenMultPermille.${partId} must be >= 1`);
      }
      if (f.requiresUpgrade) {
        check(p.upgradesById.has(f.requiresUpgrade), () => `${h.id}: '${f.zone}' requiresUpgrade unknown '${f.requiresUpgrade}'`);
      }
    }
    for (const s of h.stations) {
      check(p.machinesById.has(s.machine), () => `${s.id}: unknown machine '${s.machine}'`);
      check(zones.get(s.inputZone)?.kind === "machine_input", () => `${s.id}: bad input zone`);
      check(zones.get(s.outputZone)?.kind === "machine_output", () => `${s.id}: bad output zone`);
      if (s.requiresUpgrade) {
        check(p.upgradesById.has(s.requiresUpgrade), () => `${s.id}: requiresUpgrade unknown '${s.requiresUpgrade}'`);
      }
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
      check((rush.priceMultPermille ?? 1000) >= 1, () =>
        `${rush.id}: priceMultPermille must be >= 1`);
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
      if (c.requiresUpgrade) {
        check(p.upgradesById.has(c.requiresUpgrade), () => `${c.id}: requiresUpgrade unknown '${c.requiresUpgrade}'`);
      }
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
    const plotIds = new Set<string>();
    const plotZones = new Set<string>();
    const plotUpgrades = new Set<string>();
    for (const plot of h.plots ?? []) {
      check(!plotIds.has(plot.id), () => `${h.id}: duplicate plot '${plot.id}'`);
      plotIds.add(plot.id);
      check(!plotZones.has(plot.zone), () => `${h.id}: duplicate plot zone '${plot.zone}'`);
      plotZones.add(plot.zone);
      check(!plotUpgrades.has(plot.grantsUpgrade), () => `${h.id}: duplicate plot grantsUpgrade '${plot.grantsUpgrade}'`);
      plotUpgrades.add(plot.grantsUpgrade);
      const z = zones.get(plot.zone);
      check(!!z, () => `${plot.id}: unknown zone '${plot.zone}'`);
      check(z?.kind === "plot", () => `${plot.id}: zone must be kind plot`);
      if (z) {
        check(open(rectCenterX(z), rectCenterZ(z)), () => `${plot.id}: plot zone center is not on open walkable ground`);
      }
      const u = p.upgradesById.get(plot.grantsUpgrade);
      check(!!u, () => `${plot.id}: grantsUpgrade unknown '${plot.grantsUpgrade}'`);
      if (u) {
        const e = u.effect;
        if (e.kind === "unlock_machine") {
          check(h.stations.some((st) => st.machine === e.machine && st.requiresUpgrade === u.id), () =>
            `${plot.id}: harbor has no station for unlock_machine '${e.machine}' gated by '${u.id}'`);
        } else if (e.kind === "unlock_counter") {
          check(h.counters.some((ct) => ct.requiresUpgrade === u.id), () =>
            `${plot.id}: harbor has no counter gated by '${u.id}'`);
        } else if (e.kind === "unlock_fishing_spot") {
          check(h.fishingSpots.some((f) => f.requiresUpgrade === u.id), () =>
            `${plot.id}: harbor has no fishing spot gated by '${u.id}'`);
        } else {
          check(false, () => `${plot.id}: grantsUpgrade must unlock a machine, counter, or fishing spot`);
        }
      }
    }
    for (const s of h.stations) {
      if (!s.requiresUpgrade) continue;
      check(plotUpgrades.has(s.requiresUpgrade), () =>
        `${s.id}: locked station upgrade '${s.requiresUpgrade}' needs a plot on ${h.id}`);
    }
    for (const c of h.counters) {
      if (!c.requiresUpgrade) continue;
      check(plotUpgrades.has(c.requiresUpgrade), () =>
        `${c.id}: locked counter upgrade '${c.requiresUpgrade}' needs a plot on ${h.id}`);
    }
    for (const z of h.zones) {
      check(open(rectCenterX(z), rectCenterZ(z)), () => `${h.id}: zone '${z.id}' centre is not on open walkable ground`);
    }
    duplicates([...h.zones, ...h.stations, ...h.counters, ...(h.plots ?? [])].map((x) => x.id)).forEach((id) => errors.push(`${h.id}: duplicate '${id}'`));
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
