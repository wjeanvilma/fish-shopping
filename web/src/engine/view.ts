/** Immutable presentation snapshot for the HUD and renderer. Mirrors game-core sim/SimView.kt. */
import { coachingObjective, type ObjectiveView } from "./coaching";
import { queueSlot, rectCenterX, rectCenterZ } from "./content";
import { compareStrings } from "./foundations";
import type { MachineStatus } from "./state";
import type { Simulation } from "./simulation";
import { BaitSystem, ContractSystem, CustomerSystem, EconomySystem, FishingSystem, HarborTravelSystem, PrestigeSystem, ProductionSystem, ProgressionSystem, ReputationSystem, UpgradeSystem, WorkerSystem } from "./systems";

export interface ItemCount { itemId: string; name: string; count: number }
export interface ContextCard {
  title: string;
  lines: string[];
  progress: number | null;
  stationId?: string | null;
  recipeModeLabel?: string | null;
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
/** Presentation-only position: interpolated along the canonical walk, then the current queue slot. */
export interface CustomerView {
  id: string; counterId: string; queueIndex: number; xMm: number; zMm: number; arrived: boolean; wants: number; reserved: number;
  typeId: string; typeName: string; kind: string;
  preferredProductId: string | null; preferredProductName: string | null; preferenceMet: boolean;
}
export interface UpgradeView { id: string; name: string; description: string; cost: number; owned: boolean; purchasable: boolean; reason: string | null }
export interface RushBannerView { rushId: string; name: string; ticksRemaining: number }
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
}

export interface HarborMapEntryView {
  harborId: string;
  name: string;
  blockoutAsset: string;
  current: boolean;
  unlocked: boolean;
  travelEnabled: boolean;
  reason: string | null;
}

export interface SimView {
  tick: number;
  coins: number;
  harborId: string;
  harborName: string;
  /** GLB under models/ for the active harbor blockout. */
  blockoutAsset: string;
  harbors: HarborMapEntryView[];
  player: { xMm: number; zMm: number; facingX: number; facingZ: number; zoneId: string | null };
  bag: ItemCount[];
  bagUsedUnits: number;
  bagCapacityUnits: number;
  fishingProgress: number | null;
  fishingTimingWindow: boolean;
  fishingTimingTier: "perfect" | "good" | null;
  fishingCanReel: boolean;
  fishingSpotEmpty: boolean;
  fishingRegenProgress: number | null;
  dayPartId: string;
  dayPartName: string;
  tideChartOwned: boolean;
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
  /** True while a hired supervisor is posted (boosts haul demand scoring). */
  supervisorOnDuty: boolean;
  /** Coins charged per hired worker each simulated hour (0 = unpaid). */
  workerWagePerWorkerPerHour: number;
  workers: WorkerView[];
  staff: StaffHireView[];
  quests: QuestView[];
  contractsUnlocked: boolean;
  contractsLockedReason: string | null;
  contractOffers: ContractOfferView[];
  activeContracts: ActiveContractView[];
  contractRefreshTicksLeft: number;
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
  unlockedCosmetics: string[];
  /** Museum personal bests (sorted by species id). */
  trophies: TrophyEntryView[];
  /** Curated gallery progress for the Goals panel. */
  trophySets: TrophySetView[];
  /**
   * World anchors for inventory ids used by flying-transfer VFX
   * (items_transferred from/to). Presentation only.
   */
  transferAnchors: TransferAnchorView[];
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
    const status = unlocked ? m.status : "LOCKED" as const;
    return {
      stationId: m.stationId,
      status,
      inputCount: m.input.usedUnits(),
      outputCount: m.output.usedUnits(),
      progress: unlocked && m.activeBatch ? 1 - m.activeBatch.remainingTicks / m.activeBatch.durationTicks : null,
      statusText: unlocked
        ? ProductionSystem.statusText(m, c)
        : `Locked — buy ${lockName}`,
      preferredRecipeId: m.preferredRecipeId,
      nextRecipeId: unlocked
        ? (ProductionSystem.nextStartable(c, m)?.id ?? m.activeBatch?.recipeId ?? null)
        : null,
    };
  });

  let context: ContextCard | null = null;
  if (zone?.kind === "fishing") {
    const spotDef = h.fishingSpots.find((f) => f.zone === zone.id)!;
    const spot = s.fishingSpots.find((f) => f.zoneId === zone.id)!;
    const unlocked = FishingSystem.isUnlocked(spotDef, s);
    const full = p.bag.freeUnits() === 0;
    const casting = p.fishingSpecies !== null && p.fishingCatchTicks > 0;
    const inWindow = casting && FishingSystem.inTimingWindow(
      p.fishingProgress, p.fishingCatchTicks,
      p.timingWindowStartPermille, p.timingWindowEndPermille,
    );
    const empty = unlocked && spot.stock <= 0;
    const part = FishingSystem.dayPartAt(c, s.tick);
    const tideOwned = FishingSystem.hasTideChart(s);
    const tier = casting ? FishingSystem.timingTierAt(p, p.fishingProgress, p.fishingCatchTicks) : "miss";
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
      title: `${label} counter`,
      lines,
      progress: counter.checkoutProgress > 0 ? counter.checkoutProgress / def.checkoutTicks : null,
    };
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
      };
    }),
    player: { xMm: p.x, zMm: p.z, facingX: p.facingX, facingZ: p.facingZ, zoneId: p.zoneId },
    bag: p.bag.contents().map(([id, n]) => ({ itemId: id, name: c.itemName(id), count: n })),
    bagUsedUnits: p.bag.usedUnits(),
    bagCapacityUnits: p.bag.capacityUnits,
    fishingProgress: p.fishingSpecies
      ? p.fishingProgress / Math.max(1, p.fishingCatchTicks)
      : null,
    fishingTimingWindow: p.fishingSpecies !== null && p.fishingCatchTicks > 0 &&
      FishingSystem.inTimingWindow(
        p.fishingProgress, p.fishingCatchTicks,
        p.timingWindowStartPermille, p.timingWindowEndPermille,
      ),
    fishingTimingTier: (() => {
      if (p.fishingSpecies === null || p.fishingCatchTicks <= 0) return null;
      const tier = FishingSystem.timingTierAt(p, p.fishingProgress, p.fishingCatchTicks);
      return tier === "miss" ? null : tier;
    })(),
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
      return {
        id: u.id, name: u.name, description: u.description, cost: u.cost,
        owned: a.kind === "owned",
        purchasable: a.kind === "purchasable",
        reason: a.kind === "locked" ? a.reason : a.kind === "too_expensive" ? `Need ${a.missing} more coins` : null,
      };
    }),
    rush: (() => {
      const r = CustomerSystem.activeRush(h, s.tick);
      return r ? { rushId: r.id, name: r.name, ticksRemaining: CustomerSystem.ticksRemaining(r, s.tick) } : null;
    })(),
    supervisorOnDuty: WorkerSystem.supervisorOnDuty(c, s),
    workerWagePerWorkerPerHour: s.workerWagePerWorkerPerHour,
    workers: s.workers.map((w) => {
      const def = c.workersById.get(w.roleId);
      return {
        id: w.id, roleId: w.roleId, roleName: def?.name ?? w.roleId, roleKind: def?.role ?? "fisher",
        xMm: w.x, zMm: w.z, bagUsedUnits: w.bag.usedUnits(), bagCapacityUnits: w.bag.capacityUnits, phase: w.phase,
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
      };
    }),
    activeContracts: s.activeContracts.map((job) => {
      const t = c.contractTemplatesById.get(job.templateId);
      const bag = s.player.bag.available(job.itemId);
      const standing = ContractSystem.isStanding(t);
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
      };
    }),
    contractRefreshTicksLeft: s.contractBoardRefreshAt <= 0 ? 0 : Math.max(0, s.contractBoardRefreshAt - s.tick),
    economyUnlocked: EconomySystem.unlocked(c, s),
    economyLockedReason: (() => {
      const missing = EconomySystem.missingRequirement(c, s);
      return missing ? `Requires: ${missing}` : null;
    })(),
    maintenanceCoinsPerStation: EconomySystem.unlocked(c, s) ? EconomySystem.maintenanceCoinsPerStation(c, s) : 0,
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
    unlockedCosmetics: [...s.unlockedCosmetics].sort(compareStrings),
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
