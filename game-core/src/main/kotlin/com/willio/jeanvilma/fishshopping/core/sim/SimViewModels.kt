package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Finish 4.0 Phase 5 — presentation view-model types extracted from SimView.kt.
 * Immutable; nothing here mutates game state.
 */

data class SimView(
    val tick: Long,
    val coins: Long,
    val harborId: String,
    val harborName: String,
    /** Phase 22 active harbor specialty name. */
    val harborSpecializationName: String? = null,
    val harborSpecializationDescription: String? = null,
    /** GLB under models/ for the active harbor blockout. */
    val blockoutAsset: String,
    val harbors: List<HarborMapEntryView>,
    /** Phase 23: one-time IAP unlocked every harbor (power-neutral). */
    val fullHarborUnlock: Boolean = false,
    val player: PlayerView,
    val bag: List<ItemCount>,
    val bagUsedUnits: Int,
    val bagCapacityUnits: Int,
    val fishingProgress: Float?,
    /** True while casting and progress is inside the Good or Perfect reel window. */
    val fishingTimingWindow: Boolean,
    /** Current reel tier while casting: perfect / good / null outside the window. */
    val fishingTimingTier: String?,
    /** Phase 19: Good reel window as 0..1 of cast duration (presentation). */
    val timingGoodStart01: Float = 0.65f,
    val timingGoodEnd01: Float = 0.85f,
    /** Phase 19: Perfect reel window as 0..1 of cast duration (presentation). */
    val timingPerfectStart01: Float = 0.72f,
    val timingPerfectEnd01: Float = 0.78f,
    /** True while casting and the player can still attempt Reel. */
    val fishingCanReel: Boolean,
    /** True when standing on an unlocked fishing spot with zero stock. */
    val fishingSpotEmpty: Boolean,
    /** Progress toward the next restocked fish when the current spot is regenerating. */
    val fishingRegenProgress: Float?,
    /** Current harbor day-part id (dawn/day/dusk/night). */
    val dayPartId: String,
    val dayPartName: String,
    /** True when tide chart is owned (night regen eases + dawn/dusk cast bonus). */
    val tideChartOwned: Boolean,
    /** Finish 2.0 Phase 13 — current weather pattern. */
    val weatherId: String = "",
    val weatherName: String = "",
    val weatherDescription: String = "",
    val weatherTicksRemaining: Int = 0,
    /** Finish 2.0 Phase 13 — current tide phase. */
    val tidePhaseId: String = "",
    val tidePhaseName: String = "",
    val tideTicksRemaining: Int = 0,
    /** Finish 2.0 Phase 14 — active rod technique. */
    val activeTechniqueId: String = "",
    val activeTechniqueName: String = "",
    val masteryGlobalLevel: Int = 0,
    val techniques: List<TechniqueView> = emptyList(),
    /** Preferred bait id for new casts (null = auto). */
    val preferredBaitId: String?,
    /** Active cast bait id, if any. */
    val activeBaitId: String?,
    /** Bait for sale while standing in a kiosk (empty elsewhere). */
    val baitOffers: List<BaitOfferView>,
    val context: ContextCard?,
    val stations: List<StationView>,
    val counters: List<CounterView>,
    val customersWaiting: Int,
    /** Every customer in the harbor, walking or queued, in queue order per counter. */
    val customers: List<CustomerView>,
    /** Where customers enter and leave (renderers walk departing customers back here). */
    val customerEntryXMm: Int,
    val customerEntryZMm: Int,
    /**
     * Approach waypoints between entry and the queue (presentation leave path uses
     * these in reverse). Empty when the approach is a straight line.
     */
    val customerPathWaypoints: List<PathPointView>,
    val tutorialText: String?,
    /** Phase 30 HUD objective: tutorial, active quest, or empty-state tip. */
    val objective: ObjectiveView?,
    val upgrades: List<UpgradeView>,
    /** Non-null while a harbor rush window is active. */
    val rush: RushBannerView?,
    /** Non-null while a Phase 24 seasonal event window is active. */
    val seasonalEvent: SeasonalEventBannerView? = null,
    /** Phase 26 pier bank + coin goals for the Goals panel. */
    val bank: BankView,
    /** Phase 27 derived balance rates for the in-dev strip / Settings preview. */
    val telemetryRates: TelemetryRatesView,
    /** True while a hired supervisor is posted (boosts haul demand scoring). */
    val supervisorOnDuty: Boolean,
    /** Coins charged per hired worker each simulated hour (0 = unpaid). */
    val workerWagePerWorkerPerHour: Int,
    /** Free standard-wage on-shift slots right now (Phase 17). */
    val freeOnShiftSlots: Int,
    /** Hired workers currently marked on shift. */
    val onShiftCount: Int,
    /** On-shift workers beyond [freeOnShiftSlots] (pay overtime). */
    val overtimeOnShiftCount: Int,
    val workers: List<WorkerView>,
    val staff: List<StaffHireView>,
    /** Owned assignable staff gear (boots/satchel/tackle) — Phase 19. */
    val staffGear: List<StaffGearView>,
    /** Active machine/worker bottlenecks for the Staff panel (Phase 20). */
    val automationIssues: List<AutomationIssueView>,
    val quests: List<QuestView>,
    val contractsUnlocked: Boolean,
    val contractsLockedReason: String?,
    val contractOffers: List<ContractOfferView>,
    val activeContracts: List<ActiveContractView>,
    val contractRefreshTicksLeft: Int,
    /** Finish 2.0 Phase 17 — consecutive contract fails (board pressure). */
    val contractFailStreak: Int = 0,
    val contractFailStreakThreshold: Int = 3,
    /** Finish 2.0 Phase 18 — local login streak + today's dailies (Goals panel). */
    val dailyLoginStreak: Int = 0,
    val dailyGoals: List<DailyGoalView> = emptyList(),
    /** Soft sinks unlocked (maintenance + spoilage). */
    val economyUnlocked: Boolean,
    val economyLockedReason: String?,
    /** Effective coins charged per station each maintenance cycle (0 if none/locked). */
    val maintenanceCoinsPerStation: Int,
    /** True while bag fish spoilage is active. */
    val bagFishSpoilActive: Boolean,
    val prestigeUnlocked: Boolean,
    val prestigeLockedReason: String?,
    /** Harbor rating stars 0..5 from lifetime revenue. */
    val harborRating: Int,
    /** Service reputation score permille from served vs abandoned (Phase 13). */
    val reputationScorePermille: Int,
    /** Reputation band index (0 = poor … higher = better). */
    val reputationBand: Int,
    /** Short band label for the HUD strip. */
    val reputationLabel: String,
    /** Finish 3.0 Phase 14 — active rival NPC market ids at this harbor. */
    val activeRivalIds: List<String>,
    /** True when rivals are siphoning demand / undercutting. */
    val rivalPressureActive: Boolean,
    val prestige: List<PrestigeView>,
    /** Finish 3.0 Phase 15 — endgame deepen board. */
    val endgameUnlocked: Boolean,
    val endgameLockedReason: String?,
    val beatenRivalCount: Int,
    val endgameMarkCount: Int,
    val endgameMarks: List<String>,
    val endgameTiers: List<EndgameTierView>,
    val endgameChallenges: List<EndgameChallengeView>,
    /** Finish 2.0 Phase 11 — lifetime achievements for Settings / HUD. */
    val achievements: List<AchievementView>,
    val unlockedAchievementsCount: Int,
    val unlockedCosmetics: List<String>,
    /** Phase 23 shop decor offers for the Goals panel. */
    val decorOffers: List<DecorOfferView>,
    /** Phase 24 optional IAP cosmetics (power-neutral). */
    val cosmeticIapOffers: List<CosmeticIapOfferView>,
    /** Summed patience bonus from owned decor. */
    val decorPatienceBonusTicks: Int,
    /** Museum personal bests (sorted by species id). */
    val trophies: List<TrophyEntryView>,
    /** Curated gallery progress for the Goals panel. */
    val trophySets: List<TrophySetView>,
    /**
     * World anchors for inventory ids used by flying-transfer VFX
     * ([GameEvent.ItemsTransferred] from/to). Presentation only.
     */
    val transferAnchors: List<TransferAnchorView>,
    /** Phase 7 warehouse: available vs reserved across bag/stations/counters/workers. */
    val warehouse: WarehouseView,
    /** Phase 8 species collection book (linked from Goals). */
    val speciesBook: SpeciesBookView,
    /** Phase 9 business dashboard (committed sales + rates + bottlenecks). */
    val businessDashboard: BusinessDashboardView,
)

/** Phase 7 warehouse rollup for the management panel. */
data class WarehouseView(
    val lines: List<WarehouseLineView>,
    val quantity: Int,
    val available: Int,
    val reserved: Int,
    val empty: Boolean,
    val reconcileOk: Boolean,
    val reconcileError: String?,
)

/** Phase 8 species book + Finish 2.0 Phase 12 codex/journal. */
data class SpeciesBookView(
    val entries: List<SpeciesBookEntryView>,
    val discovered: Int,
    val total: Int,
    val empty: Boolean,
    /** Codex family filter chips (Phase 12). */
    val families: List<String> = emptyList(),
)

data class SpeciesBookEntryView(
    val speciesId: String,
    val name: String,
    val discovered: Boolean,
    val catches: Long,
    val harborNames: List<String>,
    val recipeNames: List<String>,
    val trophyBestSizePermille: Int?,
    val trophyBestValueCoins: Long?,
    val rarityWeight: Int,
    /** When this species is a rare upgrade form, the base species id. */
    val baseSpeciesId: String?,
    /** Codex family id (pier/cove/…/trophy). */
    val family: String = "pier",
    /** Lore blurb when discovered. */
    val lore: String? = null,
    /** Habitat hint — shown even before discovery. */
    val habitatHint: String? = null,
    /** Coaching tip when discovered. */
    val journalTip: String? = null,
    /** common | uncommon | rare | epic | legendary */
    val rarityBand: String = "common",
    val baseValue: Long = 0,
    /** Estimated lifetime dock value from catch count × baseValue. */
    val catchValueEstimate: Long = 0,
    /** Finish 2.0 Phase 14 — species mastery level (0 when undiscovered). */
    val masteryLevel: Int = 0,
    val masteryXp: Int = 0,
    val masteryXpToNext: Int? = null,
)

/** Phase 9 business dashboard — committed sales only (never wallet coins). */
data class BusinessDashboardView(
    val sessionTicks: Long,
    val sessionLabel: String,
    val rateIntervalLabel: String,
    val salesCount: Long,
    val itemsSold: Long,
    val committedRevenue: Long,
    val contractRevenue: Long,
    val lostCustomers: Long,
    val abandonPermille: Long,
    val wagesPaid: Long,
    val wageRatioPermille: Long,
    val revenuePerMinute: Long,
    val salesPerMinute: Long,
    val topSpecies: List<SpeciesCatchShareView>,
    val bottlenecks: List<AutomationIssueView>,
    val empty: Boolean,
    /** Finish 2.0 Phase 18 — local login streak. */
    val dailyLoginStreak: Int = 0,
    /** Today's daily objectives summary for the dashboard. */
    val dailyGoals: List<DailyGoalView> = emptyList(),
    /** Last offline journal lines (host may overlay pending report). */
    val offlineJournalLines: List<String> = emptyList(),
    /** Finish 4.0 Phase 20 — cashflow / ops surfaces. */
    val maintenancePaid: Long = 0,
    val repairSpent: Long = 0,
    val itemsSpoiled: Long = 0,
    val loanInterestAccrued: Long = 0,
    val loanCollected: Long = 0,
    val operatingCosts: Long = 0,
    val netOperatingProfit: Long = 0,
    val activeScarcityTipPermille: Int = 1000,
    val reputationScorePermille: Int = 0,
    val reputationLabel: String = "",
)

/** Finish 2.0 Phase 18 — one daily board objective. */
data class DailyGoalView(
    val objectiveId: String,
    val name: String,
    val description: String,
    val progress: Long,
    val target: Long,
    val rewardCoins: Long,
    val complete: Boolean,
    val claimed: Boolean,
    val claimEnabled: Boolean,
)

data class WarehouseLineView(
    val itemId: String,
    val name: String,
    val quantity: Int,
    val available: Int,
    val reserved: Int,
    val locations: List<WarehouseLocationView>,
    val reconcileOk: Boolean,
)

data class WarehouseLocationView(
    val id: String,
    val label: String,
    val quantity: Int,
    val available: Int,
    val reserved: Int,
)

/** Inventory id → ground position for bag ↔ pad ↔ counter arcs. */
data class TransferAnchorView(val inventoryId: String, val xMm: Int, val zMm: Int)

/**
 * Presentation-only customer position: interpolated along the canonical walk, then the
 * customer's current queue slot (which moves forward as people ahead are served).
 */
data class CustomerView(
    val id: String,
    val counterId: String,
    val queueIndex: Int,
    val xMm: Float,
    val zMm: Float,
    val arrived: Boolean,
    val wants: Int,
    val reserved: Int,
    val typeId: String,
    val typeName: String,
    /** standard | premium | bulk */
    val kind: String,
    val preferredProductId: String?,
    val preferredProductName: String?,
    val preferenceMet: Boolean,
)

data class PlayerView(val xMm: Int, val zMm: Int, val facingX: Int, val facingZ: Int, val zoneId: String?)
data class ItemCount(val itemId: String, val name: String, val count: Int)
data class ContextCard(
    val title: String,
    val lines: List<String>,
    val progress: Float?,
    /** When set, HUD can cycle this station's preferred recipe. */
    val stationId: String? = null,
    /** Auto, or the locked recipe label. */
    val recipeModeLabel: String? = null,
    /** Phase 6 expansion marker underfoot. */
    val plotId: String? = null,
    /** Confirm-spend cost when [plotId] is set and not yet built. */
    val plotCost: Long? = null,
    /** True when the player can afford and unlock the plot's upgrade. */
    val plotBuildable: Boolean = false,
)

data class TechniqueView(
    val id: String,
    val name: String,
    val description: String,
    val requiresMasteryLevel: Int,
    val unlocked: Boolean,
    val active: Boolean,
)

data class BaitOfferView(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    val packQuantity: Int,
    val ownedCount: Int,
    val purchasable: Boolean,
    val reason: String?,
    val preferred: Boolean,
)
data class StationView(
    val stationId: String,
    val status: MachineStatus,
    val inputCount: Int,
    val outputCount: Int,
    val progress: Float?,
    val statusText: String,
    val preferredRecipeId: String?,
    val nextRecipeId: String?,
    /** Phase 25: machine is broken or still slowed. */
    val needsRepair: Boolean = false,
    val repairCost: Long = 0,
    val slowed: Boolean = false,
    val slowTicksRemaining: Int = 0,
)
data class CounterView(val counterId: String, val stock: Int, val capacityUnits: Int, val queue: Int)

data class UpgradeView(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    val owned: Boolean,
    val purchasable: Boolean,
    val reason: String?,
)

data class RushBannerView(
    val rushId: String,
    val name: String,
    val ticksRemaining: Int,
)

data class SeasonalEventBannerView(
    val eventId: String,
    val name: String,
    val description: String,
    val ticksRemaining: Int,
    val banner: String? = null,
    /** Finish 2.0 Phase 16 — crowd spawn tip while active (1000 = unchanged). */
    val customerSpawnMultPermille: Int = 1000,
    /** Harbor-wide sale tip while active (1000 = unchanged). */
    val priceMultPermille: Int = 1000,
)

/** Finish 4.0 Phase 20 — one selectable bank loan product. */
data class BankLoanProductView(
    val id: String,
    val name: String,
    val description: String,
    val principal: Long,
    val repayAmount: Long,
    val termTicks: Int,
    val unlocked: Boolean,
    val lockedReason: String?,
    val canTake: Boolean,
)

/** Phase 26 Goals-panel bank / coin-goal presentation. */
data class BankView(
    val unlocked: Boolean,
    val lockedReason: String?,
    val loanPrincipal: Long,
    val repayAmount: Long,
    val termTicks: Int,
    val loanOwed: Long,
    val loanDueTicksLeft: Int,
    val loanOverdue: Boolean,
    val canTakeLoan: Boolean,
    val canRepayLoan: Boolean,
    val coinGoal: Long,
    val coinGoalCelebrated: Boolean,
    val goalPresets: List<Long>,
    /** Finish 4.0 Phase 20 — authored loan products. */
    val loanProducts: List<BankLoanProductView> = emptyList(),
)

/** Phase 27 compact telemetry rates for HUD / Settings. */
data class TelemetryRatesView(
    val abandonPermille: Long,
    val wageRatioPermille: Long,
    val topSpecies: List<SpeciesCatchShareView>,
)

data class SpeciesCatchShareView(
    val speciesId: String,
    val name: String,
    val sharePermille: Long,
    val catches: Long,
)

data class PathPointView(val xMm: Int, val zMm: Int)

data class WorkerEquipmentView(
    val slotId: String,
    val slotName: String,
    val upgradeId: String,
    val upgradeName: String,
)

data class WorkerView(
    val id: String,
    val roleId: String,
    val roleName: String,
    val roleKind: String,
    val xMm: Int,
    val zMm: Int,
    val bagUsedUnits: Int,
    val bagCapacityUnits: Int,
    val phase: String,
    val level: Int,
    val xp: Int,
    val xpToNext: Int?,
    val traitNames: List<String>,
    val onShift: Boolean,
    val equipment: List<WorkerEquipmentView>,
    /** Why this worker is stuck idle, if any (Phase 20). */
    val blockedReason: String?,
    /** Finish 2.0 Phase 15 — active specialization + schedule. */
    val activeBranchId: String?,
    val activeBranchName: String?,
    val scheduleId: String?,
    val scheduleName: String?,
    val branches: List<StaffBranchOfferView>,
    val schedules: List<StaffScheduleOfferView>,
)

/** Finish 2.0 Phase 15 — specialization branch row for one worker. */
data class StaffBranchOfferView(
    val id: String,
    val name: String,
    val description: String,
    val parentId: String?,
    val requiresWorkerLevel: Int,
    val trainingCostCoins: Int,
    val unlocked: Boolean,
    val active: Boolean,
    val canTrain: Boolean,
    val trainReason: String?,
    val catchSpeedMultPermille: Int,
    val moveSpeedMultPermille: Int,
    val carryBonus: Int,
    val wageMultPermille: Int,
)

/** Finish 2.0 Phase 15 — automation schedule row for one worker. */
data class StaffScheduleOfferView(
    val id: String,
    val name: String,
    val description: String,
    val dayParts: List<String>,
    val wageMultPermille: Int,
    val active: Boolean,
)

/** Station or worker bottleneck shown in the Staff panel (Phase 20). */
data class AutomationIssueView(
    val id: String,
    /** machine | worker */
    val kind: String,
    val label: String,
    val reason: String,
)

data class StaffHireView(
    val roleId: String,
    val name: String,
    val roleKind: String,
    val cost: Long,
    val hired: Int,
    val maxHired: Int,
    val purchasable: Boolean,
    val reason: String?,
)

/** Owned staff-gear upgrade and whether it is currently equipped (Phase 19). */
data class StaffGearView(
    val upgradeId: String,
    val name: String,
    val slotId: String,
    val slotName: String,
    val equippedOnWorkerId: String?,
    val equippedOnRoleName: String?,
)

/** completed | active | locked */
data class QuestView(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val progress: Long,
    val goalAtLeast: Long,
    val rewardCoins: Long,
    val rewardUnlockNames: List<String>,
    val reason: String?,
)

data class ContractOfferView(
    val offerId: String,
    val templateId: String,
    val name: String,
    val description: String,
    val itemId: String,
    val itemName: String,
    val quantity: Int,
    val durationTicks: Int,
    val payout: Long,
    val penalty: Long,
    val acceptEnabled: Boolean,
    val reason: String?,
    /** Phase 14 standing order flag. */
    val standing: Boolean = false,
    /** Current standing streak shown on the board (0 for standard). */
    val standingStreak: Int = 0,
    /** Finish 2.0 Phase 17 delivery chain metadata. */
    val chainId: String? = null,
    val chainStep: Int = 0,
    val chainLength: Int = 0,
    val requiresReputationBand: Int? = null,
)

data class ActiveContractView(
    val contractId: String,
    val templateId: String,
    val name: String,
    val itemId: String,
    val itemName: String,
    val delivered: Int,
    val quantity: Int,
    val ticksRemaining: Int,
    val payout: Long,
    val penalty: Long,
    val bagAvailable: Int,
    val deliverEnabled: Boolean,
    /** Phase 14 standing order flag. */
    val standing: Boolean = false,
    /** Completions in the current standing run. */
    val standingStreak: Int = 0,
    val chainId: String? = null,
    val chainStep: Int = 0,
    val chainLength: Int = 0,
)

data class HarborMapEntryView(
    val harborId: String,
    val name: String,
    val blockoutAsset: String,
    val current: Boolean,
    val unlocked: Boolean,
    val travelEnabled: Boolean,
    val reason: String?,
    /** Phase 22 specialty name, or null when content omits specialization. */
    val specializationName: String? = null,
    val specializationDescription: String? = null,
)

/** Phase 23 shop decor offer row. */
data class DecorOfferView(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    val patienceBonusTicks: Int,
    val requiresCosmetic: String?,
    val status: String,
    val reason: String?,
    val canAfford: Boolean,
)

/** Phase 24 optional IAP cosmetic row (power-neutral). */
data class CosmeticIapOfferView(
    val id: String,
    val sku: String,
    val grantsCosmetic: String,
    val title: String,
    val description: String,
    val status: String,
)

/** completed | active | locked */
data class PrestigeView(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val progress: Long,
    val goalAtLeast: Long,
    val rewardCoins: Long,
    val cosmetic: String?,
    val catchSpeedPermille: Int,
    val priceBonusPermille: Int,
    val reason: String?,
)

/** unlocked | ready | locked — Finish 3.0 Phase 15 endgame tiers. */
data class EndgameTierView(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val requiresPrestigeCount: Int,
    val requiresRivalBeats: Int,
    val requiresChallenges: Int,
    val requiresMarks: Int,
    val catchSpeedPermille: Int,
    val priceBonusPermille: Int,
    val coins: Long,
)

/** completed | active — Finish 3.0 Phase 15 endgame challenges. */
data class EndgameChallengeView(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val progress: Long,
    val goalAtLeast: Long,
    val rewardCoins: Long,
    val grantsMark: String?,
)

/** unlocked | active — Finish 2.0 Phase 11 achievements. */
data class AchievementView(
    val id: String,
    val name: String,
    val description: String,
    val category: String,
    val status: String,
    val progress: Long,
    val goalAtLeast: Long,
    val rewardCoins: Long,
)

data class TrophyEntryView(
    val speciesId: String,
    val name: String,
    val sizePermille: Int,
    val valueCoins: Long,
    val tick: Long,
)

data class TrophySetView(
    val id: String,
    val name: String,
    val description: String,
    val mounted: Int,
    val total: Int,
    val completed: Boolean,
)

