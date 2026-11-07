/** Immutable presentation snapshot for the HUD and renderer. Mirrors game-core sim/SimView.kt. */
import { coachingObjective, type ObjectiveView } from "./coaching";
import { queueSlot, rectCenterX, rectCenterZ } from "./content";
import { compareStrings } from "./foundations";
import type { MachineStatus } from "./state";
import type { Simulation } from "./simulation";
import { abandonPermille, topSpeciesCatchShare, wageRatioPermille } from "./telemetry";
import { BaitSystem, BankSystem, ContractSystem, CosmeticsIapSystem, CustomerSystem, DailyGoalsSystem, DecorSystem, EconomySystem, FishingSystem, HarborTravelSystem, MasterySystem, PlotSystem, PrestigeSystem, ProductionSystem, ProgressionSystem, ReputationSystem, SeasonalEventSystem, StaffTreesSystem, UpgradeSystem, WeatherSystem, WorkerSystem } from "./systems";
import { Warehouse, type WarehouseView } from "./warehouse";
export type { WarehouseView, WarehouseLineView, WarehouseLocationView } from "./warehouse";
import { SpeciesBook, type SpeciesBookView } from "./speciesBook";
export type { SpeciesBookView, SpeciesBookEntryView } from "./speciesBook";
import { BusinessDashboard, type BusinessDashboardView } from "./businessDashboard";
export type { BusinessDashboardView } from "./businessDashboard";

/** Finish 2.0 Phase 18 — one daily board objective. */
export interface DailyGoalView {
  objectiveId: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
  complete: boolean;
  claimed: boolean;
  claimEnabled: boolean;
}

export interface ItemCount { itemId: string; name: string; count: number }
export interface ContextCard {
  title: string;
  lines: string[];
  progress: number | null;
  stationId?: string | null;
  recipeModeLabel?: string | null;
  /** Phase 6 expansion marker underfoot. */
  plotId?: string | null;
  /** Confirm-spend cost when plotId is set and not yet built. */
  plotCost?: number | null;
  /** True when the player can afford and unlock the plot's upgrade. */
  plotBuildable?: boolean;
}
export interface StationView {
  stationId: string;
  status: MachineStatus;
  inputCount: number;
  outputCount: number;
  progress: number | null;
  statusText: string;
  preferredRecipeId: string | null;
  nextRecipeId: string | null;
  /** Phase 25: machine is broken or still slowed. */
  needsRepair: boolean;
  repairCost: number;
  slowed: boolean;
  slowTicksRemaining: number;
}
export interface CounterView { counterId: string; stock: number; capacityUnits: number; queue: number }
export interface BaitOfferView {
  id: string;
  name: string;
  description: string;
  cost: number;
  packQuantity: number;
  ownedCount: number;
  purchasable: boolean;
  reason: string | null;
  preferred: boolean;
}
/** Finish 2.0 Phase 14 — rod technique chip. */
export interface TechniqueView {
  id: string;
  name: string;
  description: string;
  requiresMasteryLevel: number;
  unlocked: boolean;
  active: boolean;
}
/** Presentation-only position: interpolated along the canonical walk, then the current queue slot. */
export interface CustomerView {
  id: string; counterId: string; queueIndex: number; xMm: number; zMm: number; arrived: boolean; wants: number; reserved: number;
  typeId: string; typeName: string; kind: string;
  preferredProductId: string | null; preferredProductName: string | null; preferenceMet: boolean;
}
export interface UpgradeView { id: string; name: string; description: string; cost: number; owned: boolean; purchasable: boolean; reason: string | null }
export interface RushBannerView { rushId: string; name: string; ticksRemaining: number }
export interface SeasonalEventBannerView {
  eventId: string;
  name: string;
  description: string;
  ticksRemaining: number;
  banner: string | null;
  customerSpawnMultPermille: number;
  priceMultPermille: number;
}
/** Phase 26 Goals-panel bank / coin-goal presentation. */
export interface BankView {
  unlocked: boolean;
  lockedReason: string | null;
  loanPrincipal: number;
  repayAmount: number;
  termTicks: number;
  loanOwed: number;
  loanDueTicksLeft: number;
  loanOverdue: boolean;
  canTakeLoan: boolean;
  canRepayLoan: boolean;
  coinGoal: number;
  coinGoalCelebrated: boolean;
  goalPresets: number[];
}
/** Phase 27 compact telemetry rates for HUD / Settings. */
export interface TelemetryRatesView {
  abandonPermille: number;
  wageRatioPermille: number;
  topSpecies: Array<{ speciesId: string; name: string; sharePermille: number; catches: number }>;
}
export interface WorkerEquipmentView {
  slotId: string;
  slotName: string;
  upgradeId: string;
  upgradeName: string;
}

/** Finish 2.0 Phase 15 — specialization branch row for one worker. */
export interface StaffBranchOfferView {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  requiresWorkerLevel: number;
  trainingCostCoins: number;
  unlocked: boolean;
  active: boolean;
  canTrain: boolean;
  trainReason: string | null;
  catchSpeedMultPermille: number;
  moveSpeedMultPermille: number;
  carryBonus: number;
  wageMultPermille: number;
}

/** Finish 2.0 Phase 15 — automation schedule row for one worker. */
export interface StaffScheduleOfferView {
  id: string;
  name: string;
  description: string;
  dayParts: string[];
  wageMultPermille: number;
  active: boolean;
}

export interface WorkerView {
  id: string;
  roleId: string;
  roleName: string;
  roleKind: string;
  xMm: number;
  zMm: number;
  bagUsedUnits: number;
  bagCapacityUnits: number;
  phase: string;
  level: number;
  xp: number;
  xpToNext: number | null;
  traitNames: string[];
  onShift: boolean;
  equipment: WorkerEquipmentView[];
  /** Why this worker is stuck idle, if any (Phase 20). */
  blockedReason: string | null;
  /** Finish 2.0 Phase 15 — active specialization + schedule. */
  activeBranchId: string | null;
  activeBranchName: string | null;
  scheduleId: string | null;
  scheduleName: string | null;
  branches: StaffBranchOfferView[];
  schedules: StaffScheduleOfferView[];
}
export interface StaffHireView {
  roleId: string;
  name: string;
  roleKind: string;
  cost: number;
  hired: number;
  maxHired: number;
  purchasable: boolean;
  reason: string | null;
}
/** Owned staff-gear upgrade and whether it is currently equipped (Phase 19). */
export interface StaffGearView {
  upgradeId: string;
  name: string;
  slotId: string;
  slotName: string;
  equippedOnWorkerId: string | null;
  equippedOnRoleName: string | null;
}
/** Station or worker bottleneck shown in the Staff panel (Phase 20). */
export interface AutomationIssueView {
  id: string;
  /** machine | worker */
  kind: string;
  label: string;
  reason: string;
}

/** Phase 23 shop decor offer row. */
export interface DecorOfferView {
  id: string;
  name: string;
  description: string;
  cost: number;
  patienceBonusTicks: number;
  requiresCosmetic: string | null;
  status: string;
  reason: string | null;
  canAfford: boolean;
}

/** Phase 24 optional IAP cosmetic row (power-neutral). */
export interface CosmeticIapOfferView {
  id: string;
  sku: string;
  grantsCosmetic: string;
  title: string;
  description: string;
  status: string;
}

/** completed | active | locked */
export interface PrestigeView {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  goalAtLeast: number;
  rewardCoins: number;
  cosmetic: string | null;
  catchSpeedPermille: number;
  priceBonusPermille: number;
  reason: string | null;
}

/** unlocked | active — Finish 2.0 Phase 11 achievements. */
export interface AchievementView {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  progress: number;
  goalAtLeast: number;
  rewardCoins: number;
}
export interface TrophyEntryView {
  speciesId: string;
  name: string;
  sizePermille: number;
  valueCoins: number;
  tick: number;
}
export interface TrophySetView {
  id: string;
  name: string;
  description: string;
  mounted: number;
  total: number;
  completed: boolean;
}

/** completed | active | locked */
export interface QuestView {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  goalAtLeast: number;
  rewardCoins: number;
  rewardUnlockNames: string[];
  reason: string | null;
}

export interface ContractOfferView {
  offerId: string;
  templateId: string;
  name: string;
  description: string;
  itemId: string;
  itemName: string;
  quantity: number;
  durationTicks: number;
  payout: number;
  penalty: number;
  acceptEnabled: boolean;
  reason: string | null;
  /** Phase 14 standing order flag. */
  standing: boolean;
  /** Current standing streak shown on the board (0 for standard). */
  standingStreak: number;
  chainId: string | null;
  chainStep: number;
  chainLength: number;
  requiresReputationBand: number | null;
}

export interface ActiveContractView {
  contractId: string;
  templateId: string;
  name: string;
  itemId: string;
  itemName: string;
  delivered: number;
  quantity: number;
  ticksRemaining: number;
  payout: number;
  penalty: number;
  bagAvailable: number;
  deliverEnabled: boolean;
  /** Phase 14 standing order flag. */
  standing: boolean;
  /** Completions in the current standing run. */
  standingStreak: number;
  chainId: string | null;
  chainStep: number;
  chainLength: number;
}

export interface HarborMapEntryView {
  harborId: string;
  name: string;
  blockoutAsset: string;
  current: boolean;
  unlocked: boolean;
  travelEnabled: boolean;
  reason: string | null;
  /** Phase 22 specialty name. */
  specializationName: string | null;
  specializationDescription: string | null;
}

export interface SimView {
  tick: number;
  coins: number;
  harborId: string;
  harborName: string;
  /** Phase 22 active harbor specialty. */
  harborSpecializationName: string | null;
  harborSpecializationDescription: string | null;
  /** GLB under models/ for the active harbor blockout. */
  blockoutAsset: string;
  harbors: HarborMapEntryView[];
  /** Phase 23: one-time IAP unlocked every harbor (power-neutral). */
  fullHarborUnlock: boolean;
  player: { xMm: number; zMm: number; facingX: number; facingZ: number; zoneId: string | null };
  bag: ItemCount[];
  bagUsedUnits: number;
  bagCapacityUnits: number;
  fishingProgress: number | null;
  fishingTimingWindow: boolean;
  fishingTimingTier: "perfect" | "good" | null;
  /** Phase 19: Good reel window as 0..1 of cast duration (presentation). */
  timingGoodStart01: number;
  timingGoodEnd01: number;
  /** Phase 19: Perfect reel window as 0..1 of cast duration (presentation). */
  timingPerfectStart01: number;
  timingPerfectEnd01: number;
  fishingCanReel: boolean;
  fishingSpotEmpty: boolean;
  fishingRegenProgress: number | null;
  dayPartId: string;
  dayPartName: string;
  tideChartOwned: boolean;
  /** Finish 2.0 Phase 13 — current weather pattern. */
  weatherId: string;
  weatherName: string;
  weatherDescription: string;
  weatherTicksRemaining: number;
  /** Finish 2.0 Phase 13 — current tide phase. */
  tidePhaseId: string;
  tidePhaseName: string;
  tideTicksRemaining: number;
  /** Finish 2.0 Phase 14 — rod technique + global mastery. */
  activeTechniqueId: string;
  activeTechniqueName: string;
  masteryGlobalLevel: number;
  techniques: TechniqueView[];
  preferredBaitId: string | null;
  activeBaitId: string | null;
  baitOffers: BaitOfferView[];
  context: ContextCard | null;
  stations: StationView[];
  counters: CounterView[];
  customersWaiting: number;
  customers: CustomerView[];
  customerEntryXMm: number;
  customerEntryZMm: number;
  customerPathWaypoints: { xMm: number; zMm: number }[];
  tutorialText: string | null;
  /** Phase 30 HUD objective: tutorial, active quest, or empty-state tip. */
  objective: ObjectiveView | null;
  upgrades: UpgradeView[];
  rush: RushBannerView | null;
  /** Non-null while a Phase 24 seasonal event window is active. */
  seasonalEvent: SeasonalEventBannerView | null;
  /** Phase 26 pier bank + coin goals for the Goals panel. */
  bank: BankView;
  /** Phase 27 derived balance rates for the in-dev strip / Settings preview. */
  telemetryRates: TelemetryRatesView;
  /** True while a hired supervisor is posted (boosts haul demand scoring). */
  supervisorOnDuty: boolean;
  /** Coins charged per hired worker each simulated hour (0 = unpaid). */
  workerWagePerWorkerPerHour: number;
  freeOnShiftSlots: number;
  onShiftCount: number;
  overtimeOnShiftCount: number;
  workers: WorkerView[];
  staff: StaffHireView[];
  /** Owned assignable staff gear (boots/satchel/tackle) — Phase 19. */
  staffGear: StaffGearView[];
  /** Active machine/worker bottlenecks for the Staff panel (Phase 20). */
  automationIssues: AutomationIssueView[];
  quests: QuestView[];
  contractsUnlocked: boolean;
  contractsLockedReason: string | null;
  contractOffers: ContractOfferView[];
  activeContracts: ActiveContractView[];
  contractRefreshTicksLeft: number;
  contractFailStreak: number;
  contractFailStreakThreshold: number;
  /** Finish 2.0 Phase 18 — local login streak + today's dailies (Goals panel). */
  dailyLoginStreak: number;
  dailyGoals: DailyGoalView[];
  /** Soft sinks unlocked (maintenance + spoilage). */
  economyUnlocked: boolean;
  economyLockedReason: string | null;
  /** Effective coins charged per station each maintenance cycle (0 if none/locked). */
  maintenanceCoinsPerStation: number;
  /** True while bag fish spoilage is active. */
  bagFishSpoilActive: boolean;
  prestigeUnlocked: boolean;
  prestigeLockedReason: string | null;
  /** Harbor rating stars 0..5 from lifetime revenue. */
  harborRating: number;
  /** Service reputation score permille from served vs abandoned (Phase 13). */
  reputationScorePermille: number;
  /** Reputation band index (0 = poor … higher = better). */
  reputationBand: number;
  /** Short band label for the HUD strip. */
  reputationLabel: string;
  prestige: PrestigeView[];
  /** Finish 2.0 Phase 11 — lifetime achievements for Settings / HUD. */
  achievements: AchievementView[];
  unlockedAchievementsCount: number;
  unlockedCosmetics: string[];
  /** Phase 23 shop decor offers for the Goals panel. */
  decorOffers: DecorOfferView[];
  /** Phase 24 optional IAP cosmetics (power-neutral). */
  cosmeticIapOffers: CosmeticIapOfferView[];
  /** Summed patience bonus from owned decor. */
  decorPatienceBonusTicks: number;
  /** Museum personal bests (sorted by species id). */
  trophies: TrophyEntryView[];
  /** Curated gallery progress for the Goals panel. */
  trophySets: TrophySetView[];
  /**
   * World anchors for inventory ids used by flying-transfer VFX
   * (items_transferred from/to). Presentation only.
   */
  transferAnchors: TransferAnchorView[];
  /** Phase 7 warehouse: available vs reserved across bag/stations/counters/workers. */
  warehouse: WarehouseView;
  /** Phase 8 species collection book (linked from Goals). */
  speciesBook: SpeciesBookView;
  /** Phase 9 business dashboard (committed sales + rates + bottlenecks). */
  businessDashboard: BusinessDashboardView;
}

/** Inventory id → ground position for bag ↔ pad ↔ counter arcs. */
export interface TransferAnchorView { inventoryId: string; xMm: number; zMm: number }

export function buildView(sim: Simulation): SimView {
  const s = sim.state;
  const c = sim.content;
  const h = sim.harbor;
  const p = s.player;
  const zone = p.zoneId ? h.zones.find((z) => z.id === p.zoneId) : undefined;

  const stations: StationView[] = s.machines.map((m) => {
    const stDef = h.stations.find((st) => st.id === m.stationId)!;
    const unlocked = ProductionSystem.isUnlocked(stDef, s);
    const lockName = stDef.requiresUpgrade
      ? (c.upgradesById.get(stDef.requiresUpgrade)?.name ?? stDef.requiresUpgrade)
      : "an upgrade";
    const slowed = unlocked && EconomySystem.isSlowed(m, s.tick);
    const needsRepair = unlocked && EconomySystem.needsRepair(m, s.tick);
    const status: MachineStatus = !unlocked ? "LOCKED" : m.broken ? "NEEDS_REPAIR" : m.status;
    const statusText = !unlocked
      ? `Locked — buy ${lockName}`
      : m.broken
        ? "Needs repair"
        : slowed
          ? "Running slow"
          : ProductionSystem.statusText(m, c);
    return {
      stationId: m.stationId,
      status,
      inputCount: m.input.usedUnits(),
      outputCount: m.output.usedUnits(),
      progress: unlocked && !m.broken && m.activeBatch
        ? 1 - m.activeBatch.remainingTicks / m.activeBatch.durationTicks
        : null,
      statusText,
      preferredRecipeId: m.preferredRecipeId,
      nextRecipeId: unlocked && !m.broken
        ? (ProductionSystem.nextStartable(c, m)?.id ?? m.activeBatch?.recipeId ?? null)
        : null,
      needsRepair,
      repairCost: needsRepair ? EconomySystem.repairCost(c) : 0,
      slowed,
      slowTicksRemaining: slowed ? Math.max(0, m.slowUntilTick - s.tick) : 0,
    };
  });
  const topSpeciesViews = topSpeciesCatchShare(s, 3).map((row) => ({
    speciesId: row.speciesId,
    name: c.itemName(row.speciesId),
    sharePermille: row.sharePermille,
    catches: row.catches,
  }));
  const automationIssueViews: AutomationIssueView[] = [];
  for (const st of stations) {
    const reason = st.needsRepair && st.status === "NEEDS_REPAIR"
      ? "Needs repair"
      : st.needsRepair && st.slowed
        ? "Running slow"
        : st.status === "OUTPUT_FULL"
          ? "Output full"
          : st.status === "WAITING_FOR_INPUT"
            ? "No input"
            : null;
    if (!reason) continue;
    const pad = h.stations.find((x) => x.id === st.stationId);
    const name = pad
      ? (c.machinesById.get(pad.machine)?.name ?? st.stationId)
      : st.stationId;
    automationIssueViews.push({ id: st.stationId, kind: "machine", label: name, reason });
  }
  for (const w of s.workers) {
    const reason = WorkerSystem.blockedReason(c, s, h, w);
    if (!reason || reason === "Off shift") continue;
    const def = c.workersById.get(w.roleId);
    automationIssueViews.push({ id: w.id, kind: "worker", label: def?.name ?? w.roleId, reason });
  }

  let context: ContextCard | null = null;
  if (zone?.kind === "fishing") {
    const spotDef = h.fishingSpots.find((f) => f.zone === zone.id)!;
    const spot = s.fishingSpots.find((f) => f.zoneId === zone.id)!;
    const unlocked = FishingSystem.isUnlocked(spotDef, s);
    const full = p.bag.freeUnits() === 0;
    const casting = p.fishingSpecies !== null && p.fishingCatchTicks > 0;
    const windows = MasterySystem.timingWindows(c, s);
    const inWindow = casting && FishingSystem.inTimingWindow(
      p.fishingProgress, p.fishingCatchTicks,
      windows.goodStart, windows.goodEnd,
    );
    const empty = unlocked && spot.stock <= 0;
    const part = FishingSystem.dayPartAt(c, s.tick);
    const tideOwned = FishingSystem.hasTideChart(s);
    const tier = casting
      ? FishingSystem.timingTierAtContent(c, s, p.fishingProgress, p.fishingCatchTicks)
      : "miss";
    const reelHint = tier === "perfect" ? "Perfect — reel now!"
      : tier === "good" ? "Good — reel for a tip!"
        : "Reel now for a bonus!";
    const lines = [
      !unlocked
        ? `Locked — buy ${spotDef.requiresUpgrade ? (c.upgradesById.get(spotDef.requiresUpgrade)?.name ?? spotDef.requiresUpgrade) : "an upgrade"}`
        : full ? "Bag full - deliver your catch"
          : empty ? "Pier empty — fish are returning"
            : casting && inWindow && !p.reelAttemptedThisCast ? reelHint
              : "Fishing...",
      `Fish here: ${spot.stock}/${spotDef.stockMax}`,
      tideOwned ? `${part.name} · tide chart` : part.name,
    ];
    if (casting) lines.push(`Hooked: ${c.speciesById.get(p.fishingSpecies!)!.name}`);
    const regenNeeded = FishingSystem.regenTicksForState(c, s, spotDef, spot.stock);
    context = {
      title: "Fishing spot",
      lines,
      progress: casting ? p.fishingProgress / p.fishingCatchTicks
        : unlocked && spot.stock < spotDef.stockMax ? spot.regenProgress / regenNeeded
          : null,
    };
  } else if (zone?.kind === "machine_input" || zone?.kind === "machine_output") {
    const station = h.stations.find((st) => st.inputZone === zone.id || st.outputZone === zone.id)!;
    const m = s.machines.find((mm) => mm.stationId === station.id)!;
    const v = stations.find((sv) => sv.stationId === station.id)!;
    const queue = ProductionSystem.queuedReady(c, m);
    const queuePreview = queue.length === 0
      ? "Queue: empty"
      : `Queue: ${queue.slice(0, 3).map((r) => ProductionSystem.recipeLabel(r.id)).join(" → ")}${queue.length > 3 ? "…" : ""}`;
    const mode = m.preferredRecipeId ? ProductionSystem.recipeLabel(m.preferredRecipeId) : "Auto";
    context = {
      title: c.machinesById.get(m.machineId)!.name,
      lines: [
        v.statusText,
        `In: ${m.input.usedUnits()}/${m.input.capacityUnits}   Out: ${m.output.usedUnits()}/${m.output.capacityUnits}`,
        queuePreview,
        `Recipe: ${mode}`,
      ],
      progress: v.progress,
      stationId: m.stationId,
      recipeModeLabel: mode,
    };
  } else if (zone?.kind === "counter") {
    const def = h.counters.find((d) => d.zone === zone.id)!;
    const counter = s.counters.find((ct) => ct.counterId === def.id)!;
    const unlocked = CustomerSystem.isUnlocked(def, s);
    const padLabel = (def.kind ?? "retail") === "wholesale" ? "Wholesale" : "Counter";
    if (!unlocked) {
      const lockName = def.requiresUpgrade
        ? (c.upgradesById.get(def.requiresUpgrade)?.name ?? def.requiresUpgrade)
        : "an upgrade";
      context = {
        title: `${padLabel} locked`,
        lines: [`Buy ${lockName} to open this B2B pad`],
        progress: null,
      };
    } else {
      const queued = s.customers.filter((x) => x.counterId === def.id);
      const front = queued.find((x) => x.arrived);
      const label = def.products.map((pid) => c.productsById.get(pid)!.name).join(" / ");
      const demandMult = CustomerSystem.demandPriceMultPermille(c, s, h, def, counter);
      const lines = [
        `Stock: ${counter.stock.usedUnits()}/${def.capacityUnits}`,
        `Queue: ${queued.length}`,
      ];
      if (demandMult !== 1000) {
        const pct = Math.trunc(((demandMult - 1000) * 100) / 1000);
        lines.push(pct >= 0 ? `Demand prices +${pct}%` : `Demand prices ${pct}%`);
      }
      if (front) {
        const type = c.customersById.get(front.typeId);
        const who = type?.name ?? front.typeId;
        const kindNote = type?.kind === "premium" ? " · tips well"
          : type?.kind === "bulk" ? " · bulk order"
            : type?.kind === "tourist" ? " · tourist tip"
              : type?.kind === "wholesaler" ? " · wholesale order"
                : type?.kind === "critic" ? " · picky critic"
                  : type?.kind === "night_regular" ? " · night regular" : "";
        const wantLabel = front.preferredProductId ? c.itemName(front.preferredProductId) : "anything";
        const subNote = front.preferredProductId && front.reserved > 0 && !front.preferenceMet()
          ? " · substituting" : "";
        lines.push(`Front: ${who} wants ${front.wants} ${wantLabel}${kindNote}${subNote}`);
      }
      context = {
        title: (def.kind ?? "retail") === "wholesale" ? `Wholesale · ${label}` : `${label} counter`,
        lines,
        progress: counter.checkoutProgress > 0 ? counter.checkoutProgress / def.checkoutTicks : null,
      };
    }
  } else if (zone?.kind === "kiosk") {
    const preferred = p.preferredBaitId ? (c.baitById.get(p.preferredBaitId)?.name ?? p.preferredBaitId) : "Auto";
    context = {
      title: "Bait kiosk",
      lines: [
        "Buy chum packs for rare bites",
        `Preferred: ${preferred}`,
        `Bag: ${p.bag.usedUnits()}/${p.bag.capacityUnits}`,
      ],
      progress: null,
    };
  } else if (zone?.kind === "plot") {
    const plot = h.plots.find((pp) => pp.zone === zone.id)!;
    const u = c.upgradesById.get(plot.grantsUpgrade)!;
    const owned = s.ownedUpgrades.has(plot.grantsUpgrade);
    const avail = UpgradeSystem.availability(c, s, u);
    const reqLine = avail.kind === "owned" ? "Built — station registered"
      : avail.kind === "locked" ? avail.reason
        : avail.kind === "too_expensive" ? `Need ${avail.missing} more coins`
          : "Confirm spend to register";
    context = {
      title: plot.name,
      lines: [plot.description, `Cost: ${u.cost}`, reqLine],
      progress: null,
      plotId: plot.id,
      plotCost: owned ? null : u.cost,
      plotBuildable: avail.kind === "purchasable",
    };
  }

  const atKiosk = zone?.kind === "kiosk";
  const baitOffers: BaitOfferView[] = atKiosk
    ? c.bait.map((b) => {
      const locked = !BaitSystem.requirementsMet(s, b);
      const miss = BaitSystem.missingRequirement(c, s, b);
      const room = p.bag.roomFor(b.id);
      const reason = locked ? `Requires: ${miss ?? "an unlock"}`
        : s.coins < b.cost ? `Need ${b.cost - s.coins} more coins`
          : room < 1 ? "Bag full"
            : null;
      return {
        id: b.id,
        name: b.name,
        description: b.description,
        cost: b.cost,
        packQuantity: b.packQuantity,
        ownedCount: p.bag.quantity(b.id),
        purchasable: reason === null,
        reason,
        preferred: p.preferredBaitId === b.id,
      };
    })
    : [];

  return {
    tick: s.tick,
    coins: s.coins,
    harborId: s.harborId,
    harborName: h.name,
    harborSpecializationName: h.specialization?.name ?? null,
    harborSpecializationDescription: h.specialization?.description ?? null,
    blockoutAsset: h.blockoutAsset,
    harbors: c.harbors.map((harbor) => {
      const unlocked = HarborTravelSystem.unlocked(c, s, harbor);
      const current = harbor.id === s.harborId;
      return {
        harborId: harbor.id,
        name: harbor.name,
        blockoutAsset: harbor.blockoutAsset,
        current,
        unlocked,
        travelEnabled: unlocked && !current,
        reason: current
          ? "You are here"
          : !unlocked
            ? (() => {
              const miss = HarborTravelSystem.missingRequirement(c, s, harbor);
              return miss ? `Requires: ${miss}` : null;
            })()
            : null,
        specializationName: harbor.specialization?.name ?? null,
        specializationDescription: harbor.specialization?.description ?? null,
      };
    }),
    fullHarborUnlock: s.fullHarborUnlock,
    player: { xMm: p.x, zMm: p.z, facingX: p.facingX, facingZ: p.facingZ, zoneId: p.zoneId },
    bag: p.bag.contents().map(([id, n]) => ({ itemId: id, name: c.itemName(id), count: n })),
    bagUsedUnits: p.bag.usedUnits(),
    bagCapacityUnits: p.bag.capacityUnits,
    fishingProgress: p.fishingSpecies
      ? p.fishingProgress / Math.max(1, p.fishingCatchTicks)
      : null,
    fishingTimingWindow: (() => {
      if (p.fishingSpecies === null || p.fishingCatchTicks <= 0) return false;
      const w = MasterySystem.timingWindows(c, s);
      return FishingSystem.inTimingWindow(p.fishingProgress, p.fishingCatchTicks, w.goodStart, w.goodEnd);
    })(),
    fishingTimingTier: (() => {
      if (p.fishingSpecies === null || p.fishingCatchTicks <= 0) return null;
      const tier = FishingSystem.timingTierAtContent(c, s, p.fishingProgress, p.fishingCatchTicks);
      return tier === "miss" ? null : tier;
    })(),
    timingGoodStart01: MasterySystem.timingWindows(c, s).goodStart / 1000,
    timingGoodEnd01: MasterySystem.timingWindows(c, s).goodEnd / 1000,
    timingPerfectStart01: MasterySystem.timingWindows(c, s).perfectStart / 1000,
    timingPerfectEnd01: MasterySystem.timingWindows(c, s).perfectEnd / 1000,
    fishingCanReel: p.fishingSpecies !== null && !p.reelAttemptedThisCast,
    preferredBaitId: p.preferredBaitId,
    activeBaitId: p.activeBaitId,
    baitOffers,
    fishingSpotEmpty: (() => {
      if (!zone || zone.kind !== "fishing") return false;
      const def = h.fishingSpots.find((f) => f.zone === zone.id)!;
      const spot = s.fishingSpots.find((f) => f.zoneId === zone.id)!;
      return FishingSystem.isUnlocked(def, s) && spot.stock <= 0;
    })(),
    fishingRegenProgress: (() => {
      if (!zone || zone.kind !== "fishing") return null;
      const def = h.fishingSpots.find((f) => f.zone === zone.id)!;
      const spot = s.fishingSpots.find((f) => f.zoneId === zone.id)!;
      if (!FishingSystem.isUnlocked(def, s) || spot.stock >= def.stockMax) return null;
      return spot.regenProgress / FishingSystem.regenTicksForState(c, s, def, spot.stock);
    })(),
    dayPartId: FishingSystem.dayPartAt(c, s.tick).id,
    dayPartName: FishingSystem.dayPartAt(c, s.tick).name,
    tideChartOwned: FishingSystem.hasTideChart(s),
    weatherId: WeatherSystem.weatherAt(c, s.tick).id,
    weatherName: WeatherSystem.weatherAt(c, s.tick).name,
    weatherDescription: WeatherSystem.weatherAt(c, s.tick).description,
    weatherTicksRemaining: WeatherSystem.ticksUntilWeatherChange(c, s.tick),
    tidePhaseId: WeatherSystem.tidePhaseAt(c, s.tick).id,
    tidePhaseName: WeatherSystem.tidePhaseAt(c, s.tick).name,
    tideTicksRemaining: WeatherSystem.ticksUntilTideChange(c, s.tick),
    activeTechniqueId: MasterySystem.technique(c, s).id,
    activeTechniqueName: MasterySystem.technique(c, s).name,
    masteryGlobalLevel: MasterySystem.globalLevel(c, s),
    techniques: c.fishingMastery.techniques.map((tech) => {
      const unlocked = MasterySystem.isUnlocked(c, s, tech);
      const active = MasterySystem.technique(c, s).id === tech.id;
      return {
        id: tech.id,
        name: tech.name,
        description: tech.description,
        requiresMasteryLevel: tech.requiresMasteryLevel,
        unlocked,
        active,
      };
    }),
    context,
    stations,
    counters: s.counters.map((ct) => ({
      counterId: ct.counterId,
      stock: ct.stock.usedUnits(),
      capacityUnits: ct.stock.capacityUnits,
      queue: s.customers.filter((x) => x.counterId === ct.counterId).length,
    })),
    customersWaiting: s.customers.length,
    customers: h.counters.flatMap((def) =>
      s.customers.filter((x) => x.counterId === def.id).map((x, index) => {
        const slot = queueSlot(def, index);
        const path = CustomerSystem.approachPath(h, slot);
        const elapsed = Math.max(0, x.walkTicksTotal - x.walkTicksLeft);
        const pos = CustomerSystem.pointAlongPath(path, elapsed, x.walkTicksTotal);
        const type = c.customersById.get(x.typeId);
        return {
          id: x.id, counterId: def.id, queueIndex: index,
          xMm: pos.x,
          zMm: pos.z,
          arrived: x.arrived, wants: x.wants, reserved: x.reserved,
          typeId: x.typeId,
          typeName: type?.name ?? x.typeId,
          kind: type?.kind ?? "standard",
          preferredProductId: x.preferredProductId,
          preferredProductName: x.preferredProductId ? c.itemName(x.preferredProductId) : null,
          preferenceMet: x.preferenceMet(),
        };
      })),
    customerEntryXMm: h.customerEntry.x,
    customerEntryZMm: h.customerEntry.z,
    customerPathWaypoints: (h.customerPathWaypoints ?? []).map((p) => ({ xMm: p.x, zMm: p.z })),
    tutorialText: c.tutorial[s.tutorialIndex]?.text ?? null,
    objective: coachingObjective(c, s),
    upgrades: c.upgrades.map((u) => {
      const a = UpgradeSystem.availability(c, s, u);
      const needsPlot = PlotSystem.requiresPlotPresence(h, u.id);
      const onPlot = PlotSystem.standingOnUpgradePlot(h, s, u.id);
      const plotReady = a.kind === "purchasable" && (!needsPlot || onPlot);
      return {
        id: u.id, name: u.name, description: u.description, cost: u.cost,
        owned: a.kind === "owned",
        purchasable: plotReady,
        reason: a.kind === "locked" ? a.reason
          : a.kind === "too_expensive" ? `Need ${a.missing} more coins`
            : a.kind === "purchasable" && needsPlot && !onPlot ? "Stand on the expansion marker"
              : null,
      };
    }),
    rush: (() => {
      const r = CustomerSystem.activeRush(h, s.tick);
      return r ? { rushId: r.id, name: r.name, ticksRemaining: CustomerSystem.ticksRemaining(r, s.tick) } : null;
    })(),
    seasonalEvent: (() => {
      const e = SeasonalEventSystem.active(c, s.tick);
      return e
        ? {
          eventId: e.id,
          name: e.name,
          description: e.description,
          ticksRemaining: SeasonalEventSystem.ticksRemaining(e, s.tick),
          banner: e.banner ?? null,
          customerSpawnMultPermille: e.customerSpawnMultPermille ?? 1000,
          priceMultPermille: e.priceMultPermille ?? 1000,
        }
        : null;
    })(),
    bank: (() => {
      const unlocked = BankSystem.unlocked(c, s);
      const hasLoan = BankSystem.hasLoan(s);
      return {
        unlocked,
        lockedReason: (() => {
          const miss = BankSystem.missingRequirement(c, s);
          return miss ? `Requires: ${miss}` : null;
        })(),
        loanPrincipal: c.bank.loanPrincipal,
        repayAmount: BankSystem.repayAmount(c),
        termTicks: c.bank.termTicks,
        loanOwed: s.loanOwed,
        loanDueTicksLeft: BankSystem.ticksRemaining(s),
        loanOverdue: BankSystem.overdue(s),
        canTakeLoan: unlocked && !hasLoan,
        canRepayLoan: hasLoan && s.coins > 0,
        coinGoal: s.coinGoal,
        coinGoalCelebrated: s.coinGoalCelebrated,
        goalPresets: [...c.bank.goalPresets],
      };
    })(),
    telemetryRates: {
      abandonPermille: abandonPermille(s),
      wageRatioPermille: wageRatioPermille(s),
      topSpecies: topSpeciesViews,
    },
    supervisorOnDuty: WorkerSystem.supervisorOnDuty(c, s),
    workerWagePerWorkerPerHour: s.workerWagePerWorkerPerHour,
    freeOnShiftSlots: WorkerSystem.freeOnShiftSlots(c, s),
    onShiftCount: s.workers.filter((w) => w.onShift).length,
    overtimeOnShiftCount: Math.max(
      0,
      s.workers.filter((w) => w.onShift).length - WorkerSystem.freeOnShiftSlots(c, s),
    ),
    workers: s.workers.map((w) => {
      const def = c.workersById.get(w.roleId);
      const prog = c.staffProgression;
      const xpToNext = w.level >= prog.maxLevel
        ? null
        : Math.max((prog.xpThresholds[w.level] ?? w.xp) - w.xp, 0);
      const roleWire = def?.role ?? "fisher";
      const activeBranch = w.activeBranchId ? c.staffBranchesById.get(w.activeBranchId) : undefined;
      const activeSchedule = w.scheduleId ? c.staffSchedulesById.get(w.scheduleId) : undefined;
      return {
        id: w.id, roleId: w.roleId, roleName: def?.name ?? w.roleId, roleKind: roleWire,
        xMm: w.x, zMm: w.z, bagUsedUnits: w.bag.usedUnits(), bagCapacityUnits: w.bag.capacityUnits, phase: w.phase,
        level: w.level,
        xp: w.xp,
        xpToNext,
        traitNames: w.traits.map((tid) => c.workerTraitsById.get(tid)?.name ?? tid),
        onShift: w.onShift,
        equipment: prog.loadouts.slots.flatMap((slot) => {
          const uid = w.equipment[slot.id];
          if (!uid) return [];
          return [{
            slotId: slot.id,
            slotName: slot.name,
            upgradeId: uid,
            upgradeName: c.upgradesById.get(uid)?.name ?? uid,
          }];
        }),
        blockedReason: WorkerSystem.blockedReason(c, s, h, w),
        activeBranchId: activeBranch?.id ?? null,
        activeBranchName: activeBranch?.name ?? null,
        scheduleId: activeSchedule?.id ?? null,
        scheduleName: activeSchedule?.name ?? null,
        branches: c.staffTrees.branches.filter((branch) => branch.role === roleWire).map((branch) => {
          const unlocked = w.unlockedBranchIds.includes(branch.id);
          const trainReason = unlocked ? null : StaffTreesSystem.canTrain(c, s, w, branch.id);
          return {
            id: branch.id,
            name: branch.name,
            description: branch.description,
            parentId: branch.parentId,
            requiresWorkerLevel: branch.requiresWorkerLevel,
            trainingCostCoins: branch.trainingCostCoins,
            unlocked,
            active: w.activeBranchId === branch.id,
            canTrain: trainReason === null,
            trainReason,
            catchSpeedMultPermille: branch.catchSpeedMultPermille,
            moveSpeedMultPermille: branch.moveSpeedMultPermille,
            carryBonus: branch.carryBonus,
            wageMultPermille: branch.wageMultPermille,
          };
        }),
        schedules: c.staffTrees.schedules.map((sch) => ({
          id: sch.id,
          name: sch.name,
          description: sch.description,
          dayParts: sch.dayParts,
          wageMultPermille: sch.wageMultPermille,
          active: w.scheduleId === sch.id,
        })),
      };
    }),
    staff: c.workers.map((def) => {
      const a = WorkerSystem.availability(c, s, def);
      const hired = s.workers.filter((w) => w.roleId === def.id).length;
      return {
        roleId: def.id, name: def.name, roleKind: def.role, cost: def.hireCost, hired, maxHired: def.maxHired,
        purchasable: a.kind === "purchasable",
        reason: a.kind === "locked" ? a.reason
          : a.kind === "too_expensive" ? `Need ${a.missing} more coins`
          : a.kind === "maxed" ? "Max hired"
          : null,
      };
    }),
    staffGear: c.staffProgression.loadouts.slots.flatMap((slot) =>
      slot.upgradeIds.flatMap((uid) => {
        if (!s.ownedUpgrades.has(uid)) return [];
        const wearer = s.workers.find((w) => w.equipment[slot.id] === uid);
        return [{
          upgradeId: uid,
          name: c.upgradesById.get(uid)?.name ?? uid,
          slotId: slot.id,
          slotName: slot.name,
          equippedOnWorkerId: wearer?.id ?? null,
          equippedOnRoleName: wearer
            ? (c.workersById.get(wearer.roleId)?.name ?? wearer.roleId)
            : null,
        }];
      }),
    ),
    automationIssues: automationIssueViews,
    quests: c.quests.map((q) => {
      const completed = s.completedQuests.has(q.id);
      const locked = !completed && !ProgressionSystem.requirementsMet(s, q);
      const progress = Math.min(s.stat(q.goal.stat), q.goal.atLeast);
      const missing = locked ? ProgressionSystem.missingRequirement(c, s, q) : null;
      return {
        id: q.id,
        name: q.name,
        description: q.description,
        status: completed ? "completed" : locked ? "locked" : "active",
        progress: completed ? q.goal.atLeast : progress,
        goalAtLeast: q.goal.atLeast,
        rewardCoins: q.reward.coins,
        rewardUnlockNames: q.reward.unlockUpgrades.map((uid) => c.upgradesById.get(uid)?.name ?? uid),
        reason: missing ? `Requires: ${missing}` : null,
      };
    }),
    contractsUnlocked: ContractSystem.boardUnlocked(c, s),
    contractsLockedReason: (() => {
      const missing = ContractSystem.missingBoardRequirement(c, s);
      return missing ? `Requires: ${missing}` : null;
    })(),
    contractOffers: s.contractOffers.map((o) => {
      const t = c.contractTemplatesById.get(o.templateId);
      const maxed = s.activeContracts.length >= c.contracts.maxActive;
      const standing = ContractSystem.isStanding(t);
      const chainId = t?.chainId ?? null;
      return {
        offerId: o.id,
        templateId: o.templateId,
        name: t?.name ?? o.templateId,
        description: t?.description ?? "",
        itemId: o.itemId,
        itemName: c.itemName(o.itemId),
        quantity: o.quantity,
        durationTicks: o.durationTicks,
        payout: o.payout,
        penalty: o.penalty,
        acceptEnabled: !maxed,
        reason: maxed ? "Max active contracts" : null,
        standing,
        standingStreak: standing ? ContractSystem.standingStreak(s, o.templateId) : 0,
        chainId,
        chainStep: t?.chainStep ?? 0,
        chainLength: chainId ? ContractSystem.chainLength(c, chainId) : 0,
        requiresReputationBand: t?.requiresReputationBand ?? null,
      };
    }),
    activeContracts: s.activeContracts.map((job) => {
      const t = c.contractTemplatesById.get(job.templateId);
      const bag = s.player.bag.available(job.itemId);
      const standing = ContractSystem.isStanding(t);
      const chainId = t?.chainId ?? null;
      return {
        contractId: job.id,
        templateId: job.templateId,
        name: t?.name ?? job.templateId,
        itemId: job.itemId,
        itemName: c.itemName(job.itemId),
        delivered: job.delivered,
        quantity: job.quantity,
        ticksRemaining: Math.max(0, job.deadlineTick - s.tick),
        payout: job.payout,
        penalty: job.penalty,
        bagAvailable: bag,
        deliverEnabled: bag > 0 && job.delivered < job.quantity,
        standing,
        standingStreak: standing ? ContractSystem.standingStreak(s, job.templateId) : 0,
        chainId,
        chainStep: t?.chainStep ?? 0,
        chainLength: chainId ? ContractSystem.chainLength(c, chainId) : 0,
      };
    }),
    contractRefreshTicksLeft: s.contractBoardRefreshAt <= 0 ? 0 : Math.max(0, s.contractBoardRefreshAt - s.tick),
    contractFailStreak: ContractSystem.failStreak(s),
    contractFailStreakThreshold: c.contracts.failStreakThreshold ?? 3,
    dailyLoginStreak: DailyGoalsSystem.streak(s),
    dailyGoals: DailyGoalsSystem.boardObjectives(c, s).map((o) => {
      const progress = DailyGoalsSystem.progress(c, s, o);
      const complete = DailyGoalsSystem.isComplete(c, s, o);
      const claimed = DailyGoalsSystem.isClaimed(c, s, o);
      return {
        objectiveId: o.id,
        name: o.name,
        description: o.description,
        progress,
        target: o.goal.atLeast,
        rewardCoins: DailyGoalsSystem.claimRewardCoins(c, s, o),
        complete,
        claimed,
        claimEnabled: complete && !claimed,
      };
    }),
    economyUnlocked: EconomySystem.unlocked(c, s),
    economyLockedReason: (() => {
      const missing = EconomySystem.missingRequirement(c, s);
      return missing ? `Requires: ${missing}` : null;
    })(),
    maintenanceCoinsPerStation: EconomySystem.unlocked(c, s) ? EconomySystem.maintenanceCoinsPerStation(c, s, h) : 0,
    bagFishSpoilActive: EconomySystem.unlocked(c, s) && c.economy.bagFishSpoilUnits > 0,
    prestigeUnlocked: PrestigeSystem.boardUnlocked(c, s),
    prestigeLockedReason: (() => {
      const missing = PrestigeSystem.missingBoardRequirement(c, s);
      return missing ? `Requires: ${missing}` : null;
    })(),
    harborRating: PrestigeSystem.harborRating(c, s),
    reputationScorePermille: ReputationSystem.scorePermille(c, s),
    reputationBand: ReputationSystem.band(c, s),
    reputationLabel: ReputationSystem.bandLabel(c, s),
    prestige: c.prestige.milestones.map((m) => {
      const completed = s.completedPrestige.has(m.id);
      const locked = !completed && !PrestigeSystem.requirementsMet(s, m);
      const progress = Math.min(s.stat(m.goal.stat), m.goal.atLeast);
      const missing = locked ? PrestigeSystem.missingRequirement(c, s, m) : null;
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        status: completed ? "completed" : locked ? "locked" : "active",
        progress: completed ? m.goal.atLeast : progress,
        goalAtLeast: m.goal.atLeast,
        rewardCoins: m.reward.coins,
        cosmetic: m.reward.cosmetic ?? null,
        catchSpeedPermille: m.reward.catchSpeedPermille,
        priceBonusPermille: m.reward.priceBonusPermille,
        reason: missing ? `Requires: ${missing}` : null,
      };
    }),
    achievements: c.achievements.entries.map((a) => {
      const unlocked = s.unlockedAchievements.has(a.id);
      const progress = Math.min(s.stat(a.goal.stat), a.goal.atLeast);
      return {
        id: a.id,
        name: a.name,
        description: a.description,
        category: a.category,
        status: unlocked ? "unlocked" : "active",
        progress: unlocked ? a.goal.atLeast : progress,
        goalAtLeast: a.goal.atLeast,
        rewardCoins: a.rewardCoins,
      };
    }),
    unlockedAchievementsCount: s.unlockedAchievements.size,
    unlockedCosmetics: [...s.unlockedCosmetics].sort(compareStrings),
    decorOffers: c.decor.items.map((d) => {
      const owned = s.ownedDecor.has(d.id);
      const miss = DecorSystem.missingRequirement(c, s, d);
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        cost: d.cost,
        patienceBonusTicks: d.patienceBonusTicks,
        requiresCosmetic: d.requiresCosmetic ?? null,
        status: owned ? "owned" : miss ? "locked" : "available",
        reason: owned
          ? null
          : miss
            ? `Requires: ${miss}`
            : s.coins < d.cost
              ? `Need ${d.cost - s.coins} more coins`
              : null,
        canAfford: !owned && !miss && s.coins >= d.cost,
      };
    }),
    cosmeticIapOffers: CosmeticsIapSystem.CATALOG.map((sku) => ({
      id: sku.id,
      sku: sku.sku,
      grantsCosmetic: sku.grantsCosmetic,
      title: sku.title,
      description: sku.description,
      status: s.unlockedCosmetics.has(sku.grantsCosmetic) ? "owned" : "available",
    })),
    decorPatienceBonusTicks: DecorSystem.patienceBonusTicks(c, s),
    trophies: [...s.trophies.entries()]
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([id, rec]) => ({
        speciesId: id,
        name: c.itemName(id),
        sizePermille: rec.sizePermille,
        valueCoins: rec.valueCoins,
        tick: rec.tick,
      })),
    trophySets: c.raw.trophies.sets.map((set) => {
      const mounted = set.species.filter((id) => s.trophies.has(id)).length;
      return {
        id: set.id,
        name: set.name,
        description: set.description,
        mounted,
        total: set.species.length,
        completed: mounted >= set.species.length,
      };
    }),
    transferAnchors: buildTransferAnchors(sim),
    warehouse: Warehouse.build(c, s, h),
    speciesBook: SpeciesBook.build(c, s),
    businessDashboard: BusinessDashboard.build(c, s, automationIssueViews, topSpeciesViews),
  };
}

function buildTransferAnchors(sim: Simulation): TransferAnchorView[] {
  const s = sim.state;
  const h = sim.harbor;
  const out: TransferAnchorView[] = [
    { inventoryId: "inv.player_bag", xMm: s.player.x, zMm: s.player.z },
  ];
  for (const st of h.stations) {
    const input = h.zones.find((z) => z.id === st.inputZone)!;
    const output = h.zones.find((z) => z.id === st.outputZone)!;
    out.push({
      inventoryId: `inv.${st.id}.input`,
      xMm: rectCenterX(input),
      zMm: rectCenterZ(input),
    });
    out.push({
      inventoryId: `inv.${st.id}.output`,
      xMm: rectCenterX(output),
      zMm: rectCenterZ(output),
    });
  }
  for (const c of h.counters) {
    const z = h.zones.find((zone) => zone.id === c.zone)!;
    out.push({
      inventoryId: `inv.${c.id}`,
      xMm: rectCenterX(z),
      zMm: rectCenterZ(z),
    });
  }
  for (const w of s.workers) {
    out.push({ inventoryId: `inv.${w.id}.bag`, xMm: w.x, zMm: w.z });
  }
  return out;
}
