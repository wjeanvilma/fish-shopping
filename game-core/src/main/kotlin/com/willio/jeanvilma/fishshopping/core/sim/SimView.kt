package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.progression.PrestigeSystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.workers.StaffTreesSystem
import com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem
import com.willio.jeanvilma.fishshopping.core.world.HarborTravelSystem

/**
 * Immutable presentation snapshot built on the simulation thread and handed to
 * the HUD and renderer. Nothing here can mutate game state.
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
    val prestige: List<PrestigeView>,
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

private fun Simulation.customerViews(): List<CustomerView> {
    return harbor.counters.flatMap { def ->
        state.customers.filter { it.counterId == def.id }.mapIndexed { index, c ->
            val slot = def.queueSlot(index)
            val path = CustomerSystem.approachPath(harbor, slot)
            val elapsed = (c.walkTicksTotal - c.walkTicksLeft).coerceAtLeast(0)
            val (x, z) = CustomerSystem.pointAlongPath(path, elapsed, c.walkTicksTotal)
            val type = content.customersById[c.typeId]
            val prefName = c.preferredProductId?.let { content.itemName(it) }
            CustomerView(
                c.id, def.id, index,
                x, z,
                c.arrived, c.wants, c.reserved,
                typeId = c.typeId,
                typeName = type?.name ?: c.typeId,
                kind = type?.kind?.wire ?: "standard",
                preferredProductId = c.preferredProductId,
                preferredProductName = prefName,
                preferenceMet = c.preferenceMet(),
            )
        }
    }
}

fun Simulation.view(): SimView {
    val s = state
    val c = content
    val p = s.player
    val zone = p.zoneId?.let { harbor.zonesById[it] }

    val stationViews = s.machines.map { m ->
        val stDef = harbor.stations.first { it.id == m.stationId }
        val unlocked = ProductionSystem.isUnlocked(stDef, s)
        val lockName = stDef.requiresUpgrade?.let { c.upgradesById[it]?.name ?: it } ?: "an upgrade"
        val status = when {
            !unlocked -> MachineStatus.LOCKED
            m.broken -> MachineStatus.NEEDS_REPAIR
            else -> m.status
        }
        val batch = m.activeBatch
        val progress = if (unlocked && !m.broken) batch?.let { 1f - it.remainingTicks.toFloat() / it.durationTicks } else null
        val slowed = unlocked && EconomySystem.isSlowed(m, s.tick)
        val needsRepair = unlocked && EconomySystem.needsRepair(m, s.tick)
        val statusText = when {
            !unlocked -> "Locked — buy $lockName"
            m.broken -> "Needs repair"
            slowed -> "Running slow"
            else -> ProductionSystem.statusText(m, c)
        }
        StationView(
            m.stationId, status, m.input.usedUnits(), m.output.usedUnits(), progress,
            statusText = statusText,
            preferredRecipeId = m.preferredRecipeId,
            nextRecipeId = if (unlocked && !m.broken) {
                ProductionSystem.nextStartable(c, m)?.id ?: m.activeBatch?.recipeId
            } else null,
            needsRepair = needsRepair,
            repairCost = if (needsRepair) EconomySystem.repairCost(c) else 0,
            slowed = slowed,
            slowTicksRemaining = if (slowed) (m.slowUntilTick - s.tick).toInt().coerceAtLeast(0) else 0,
        )
    }
    val topSpeciesViews = topSpeciesCatchShareViews()
    val automationIssueViews = automationIssueViews(stationViews)

    val context: ContextCard? = when (zone?.kind) {
        ZoneKind.FISHING -> {
            val spotDef = harbor.fishingSpots.first { it.zone == zone.id }
            val spot = s.fishingSpots.first { it.zoneId == zone.id }
            val unlocked = FishingSystem.isUnlocked(spotDef, s)
            val full = p.bag.freeUnits() == 0
            val casting = p.fishingSpecies != null && p.fishingCatchTicks > 0
            val windows = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s)
            val inWindow = casting && FishingSystem.inTimingWindow(
                p.fishingProgress, p.fishingCatchTicks,
                windows.goodStart, windows.goodEnd,
            )
            val empty = unlocked && spot.stock <= 0
            val part = FishingSystem.dayPartAt(c, s.tick)
            val tideOwned = FishingSystem.hasTideChart(s)
            val lines = mutableListOf(
                when {
                    !unlocked -> {
                        val name = spotDef.requiresUpgrade?.let { c.upgradesById[it]?.name } ?: "an upgrade"
                        "Locked — buy $name"
                    }
                    full -> "Bag full - deliver your catch"
                    empty -> "Pier empty — fish are returning"
                    casting && inWindow && !p.reelAttemptedThisCast -> {
                        when (FishingSystem.timingTierAt(p, p.fishingProgress, p.fishingCatchTicks)) {
                            TimingTier.PERFECT -> "Perfect — reel now!"
                            TimingTier.GOOD -> "Good — reel for a tip!"
                            TimingTier.MISS -> "Reel now for a bonus!"
                        }
                    }
                    else -> "Fishing..."
                },
                "Fish here: ${spot.stock}/${spotDef.stockMax}",
                if (tideOwned) "${part.name} · tide chart" else part.name,
            )
            if (casting) lines += "Hooked: ${c.speciesById.getValue(p.fishingSpecies!!).name}"
            val regenNeeded = FishingSystem.regenTicksFor(c, s, spotDef, spot.stock)
            val progress = when {
                casting -> p.fishingProgress.toFloat() / p.fishingCatchTicks
                unlocked && spot.stock < spotDef.stockMax -> spot.regenProgress.toFloat() / regenNeeded
                else -> null
            }
            ContextCard("Fishing spot", lines, progress)
        }
        ZoneKind.MACHINE_INPUT, ZoneKind.MACHINE_OUTPUT -> {
            val station = harbor.stations.first { it.inputZone == zone.id || it.outputZone == zone.id }
            val m = s.machines.first { it.stationId == station.id }
            val v = stationViews.first { it.stationId == station.id }
            val queue = ProductionSystem.queuedReady(c, m)
            val queuePreview = when {
                queue.isEmpty() -> "Queue: empty"
                else -> "Queue: " + queue.take(3).joinToString(" → ") { ProductionSystem.recipeLabel(it.id) } +
                    if (queue.size > 3) "…" else ""
            }
            val mode = m.preferredRecipeId?.let { ProductionSystem.recipeLabel(it) } ?: "Auto"
            ContextCard(
                title = c.machinesById.getValue(m.machineId).name,
                lines = listOf(
                    v.statusText,
                    "In: ${m.input.usedUnits()}/${m.input.capacityUnits}   Out: ${m.output.usedUnits()}/${m.output.capacityUnits}",
                    queuePreview,
                    "Recipe: $mode",
                ),
                progress = v.progress,
                stationId = m.stationId,
                recipeModeLabel = mode,
            )
        }
        ZoneKind.COUNTER -> {
            val def = harbor.counters.first { it.zone == zone.id }
            val counter = s.counters.first { it.counterId == def.id }
            val unlocked = CustomerSystem.isUnlocked(def, s)
            val padLabel = if (def.kind.wire == "wholesale") "Wholesale" else "Counter"
            if (!unlocked) {
                val lockName = def.requiresUpgrade?.let { c.upgradesById[it]?.name ?: it } ?: "an upgrade"
                ContextCard(
                    "$padLabel locked",
                    listOf("Buy $lockName to open this B2B pad"),
                    null,
                )
            } else {
                val queued = s.customers.filter { it.counterId == def.id }
                val front = queued.firstOrNull { it.arrived }
                val label = def.products.joinToString(" / ") { c.productsById.getValue(it).name }
                val demandMult = CustomerSystem.demandPriceMultPermille(c, s, harbor, def, counter)
                val lines = mutableListOf(
                    "Stock: ${counter.stock.usedUnits()}/${def.capacityUnits}",
                    "Queue: ${queued.size}",
                )
                if (demandMult != 1000) {
                    val pct = ((demandMult - 1000) * 100) / 1000
                    lines += if (pct >= 0) "Demand prices +$pct%" else "Demand prices $pct%"
                }
                if (front != null) {
                    val type = c.customersById[front.typeId]
                    val who = type?.name ?: front.typeId
                    val kindNote = when (type?.kind?.wire) {
                        "premium" -> " · tips well"
                        "bulk" -> " · bulk order"
                        "tourist" -> " · tourist tip"
                        "wholesaler" -> " · wholesale order"
                        "critic" -> " · picky critic"
                        "night_regular" -> " · night regular"
                        else -> ""
                    }
                    val wantLabel = front.preferredProductId?.let { c.itemName(it) } ?: "anything"
                    val subNote = when {
                        front.preferredProductId == null -> ""
                        front.reserved == 0 -> ""
                        front.preferenceMet() -> ""
                        else -> " · substituting"
                    }
                    lines += "Front: $who wants ${front.wants} $wantLabel$kindNote$subNote"
                }
                ContextCard(
                    if (def.kind.wire == "wholesale") "Wholesale · $label" else "$label counter",
                    lines,
                    if (counter.checkoutProgress > 0) counter.checkoutProgress.toFloat() / def.checkoutTicks else null,
                )
            }
        }
        ZoneKind.KIOSK -> {
            val preferred = p.preferredBaitId?.let { c.baitById[it]?.name } ?: "Auto"
            ContextCard(
                title = "Bait kiosk",
                lines = listOf(
                    "Buy chum packs for rare bites",
                    "Preferred: $preferred",
                    "Bag: ${p.bag.usedUnits()}/${p.bag.capacityUnits}",
                ),
                progress = null,
            )
        }
        ZoneKind.PLOT -> {
            val plot = harbor.plotsByZone.getValue(zone.id)
            val u = c.upgradesById.getValue(plot.grantsUpgrade)
            val owned = plot.grantsUpgrade in s.ownedUpgrades
            val avail = UpgradeSystem.availability(c, s, u)
            val reqLine = when (avail) {
                UpgradeSystem.Availability.Owned -> "Built — station registered"
                is UpgradeSystem.Availability.Locked -> avail.reason
                is UpgradeSystem.Availability.TooExpensive -> "Need ${avail.missing} more coins"
                UpgradeSystem.Availability.Purchasable -> "Confirm spend to register"
            }
            ContextCard(
                title = plot.name,
                lines = listOf(plot.description, "Cost: ${u.cost}", reqLine),
                progress = null,
                plotId = plot.id,
                plotCost = if (owned) null else u.cost,
                plotBuildable = avail == UpgradeSystem.Availability.Purchasable,
            )
        }
        null -> null
    }

    val atKiosk = zone?.kind == ZoneKind.KIOSK
    val baitOffers = if (atKiosk) {
        c.bait.map { b ->
            val locked = !com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem.requirementsMet(s, b)
            val miss = com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem.missingRequirement(c, s, b)
            val room = p.bag.roomFor(b.id)
            val reason = when {
                locked -> "Requires: ${miss ?: "an unlock"}"
                s.coins < b.cost -> "Need ${b.cost - s.coins} more coins"
                room < 1 -> "Bag full"
                else -> null
            }
            BaitOfferView(
                id = b.id,
                name = b.name,
                description = b.description,
                cost = b.cost,
                packQuantity = b.packQuantity,
                ownedCount = p.bag.quantity(b.id),
                purchasable = reason == null,
                reason = reason,
                preferred = p.preferredBaitId == b.id,
            )
        }
    } else {
        emptyList()
    }

    return SimView(
        tick = s.tick,
        coins = s.coins,
        harborId = s.harborId,
        harborName = harbor.name,
        harborSpecializationName = harbor.specialization?.name,
        harborSpecializationDescription = harbor.specialization?.description,
        blockoutAsset = harbor.blockoutAsset,
        harbors = c.harbors.map { h ->
            val unlocked = HarborTravelSystem.unlocked(c, s, h)
            val current = h.id == s.harborId
            HarborMapEntryView(
                harborId = h.id,
                name = h.name,
                blockoutAsset = h.blockoutAsset,
                current = current,
                unlocked = unlocked,
                travelEnabled = unlocked && !current,
                reason = when {
                    current -> "You are here"
                    !unlocked -> HarborTravelSystem.missingRequirement(c, s, h)?.let { "Requires: $it" }
                    else -> null
                },
                specializationName = h.specialization?.name,
                specializationDescription = h.specialization?.description,
            )
        },
        fullHarborUnlock = s.fullHarborUnlock,
        player = PlayerView(p.x, p.z, p.facingX, p.facingZ, p.zoneId),
        bag = p.bag.contents().map { (id, n) -> ItemCount(id, c.itemName(id), n) },
        bagUsedUnits = p.bag.usedUnits(),
        bagCapacityUnits = p.bag.capacityUnits,
        fishingProgress = p.fishingSpecies?.let {
            val dur = p.fishingCatchTicks.coerceAtLeast(1)
            p.fishingProgress.toFloat() / dur
        },
        fishingTimingWindow = run {
            if (p.fishingSpecies == null || p.fishingCatchTicks <= 0) return@run false
            val w = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s)
            FishingSystem.inTimingWindow(p.fishingProgress, p.fishingCatchTicks, w.goodStart, w.goodEnd)
        },
        fishingTimingTier = run {
            if (p.fishingSpecies == null || p.fishingCatchTicks <= 0) return@run null
            when (FishingSystem.timingTierAt(c, s, p.fishingProgress, p.fishingCatchTicks)) {
                TimingTier.PERFECT -> "perfect"
                TimingTier.GOOD -> "good"
                TimingTier.MISS -> null
            }
        },
        timingGoodStart01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).goodStart / 1000f,
        timingGoodEnd01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).goodEnd / 1000f,
        timingPerfectStart01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).perfectStart / 1000f,
        timingPerfectEnd01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).perfectEnd / 1000f,
        fishingCanReel = p.fishingSpecies != null && !p.reelAttemptedThisCast,
        fishingSpotEmpty = run {
            val z = zone ?: return@run false
            if (z.kind != ZoneKind.FISHING) return@run false
            val def = harbor.fishingSpots.first { it.zone == z.id }
            val spot = s.fishingSpots.first { it.zoneId == z.id }
            FishingSystem.isUnlocked(def, s) && spot.stock <= 0
        },
        fishingRegenProgress = run {
            val z = zone ?: return@run null
            if (z.kind != ZoneKind.FISHING) return@run null
            val def = harbor.fishingSpots.first { it.zone == z.id }
            val spot = s.fishingSpots.first { it.zoneId == z.id }
            if (!FishingSystem.isUnlocked(def, s) || spot.stock >= def.stockMax) return@run null
            val needed = FishingSystem.regenTicksFor(c, s, def, spot.stock)
            spot.regenProgress.toFloat() / needed
        },
        dayPartId = FishingSystem.dayPartAt(c, s.tick).id,
        dayPartName = FishingSystem.dayPartAt(c, s.tick).name,
        tideChartOwned = FishingSystem.hasTideChart(s),
        weatherId = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.weatherAt(c, s.tick).id,
        weatherName = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.weatherAt(c, s.tick).name,
        weatherDescription = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.weatherAt(c, s.tick).description,
        weatherTicksRemaining = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.ticksUntilWeatherChange(c, s.tick),
        tidePhaseId = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.tidePhaseAt(c, s.tick).id,
        tidePhaseName = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.tidePhaseAt(c, s.tick).name,
        tideTicksRemaining = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.ticksUntilTideChange(c, s.tick),
        activeTechniqueId = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.technique(c, s).id,
        activeTechniqueName = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.technique(c, s).name,
        masteryGlobalLevel = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.globalLevel(c, s),
        techniques = c.fishingMastery.techniques.map { tech ->
            val unlocked = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.isUnlocked(c, s, tech)
            val active = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.technique(c, s).id == tech.id
            TechniqueView(
                id = tech.id,
                name = tech.name,
                description = tech.description,
                requiresMasteryLevel = tech.requiresMasteryLevel,
                unlocked = unlocked,
                active = active,
            )
        },
        preferredBaitId = p.preferredBaitId,
        activeBaitId = p.activeBaitId,
        baitOffers = baitOffers,
        context = context,
        stations = stationViews,
        counters = s.counters.map { ct ->
            CounterView(ct.counterId, ct.stock.usedUnits(), ct.stock.capacityUnits, s.customers.count { it.counterId == ct.counterId })
        },
        customersWaiting = s.customers.size,
        customers = customerViews(),
        customerEntryXMm = harbor.customerEntry.x,
        customerEntryZMm = harbor.customerEntry.z,
        customerPathWaypoints = harbor.customerPathWaypoints.map { PathPointView(it.x, it.z) },
        tutorialText = c.tutorial.getOrNull(s.tutorialIndex)?.text,
        objective = Coaching.objective(c, s),
        upgrades = c.upgrades.map { u ->
            val a = UpgradeSystem.availability(c, s, u)
            val needsPlot = com.willio.jeanvilma.fishshopping.core.world.PlotSystem.requiresPlotPresence(harbor, u.id)
            val onPlot = com.willio.jeanvilma.fishshopping.core.world.PlotSystem.standingOnUpgradePlot(harbor, s, u.id)
            val plotReady = a is UpgradeSystem.Availability.Purchasable && (!needsPlot || onPlot)
            UpgradeView(
                u.id, u.name, u.description, u.cost,
                owned = a is UpgradeSystem.Availability.Owned,
                purchasable = plotReady,
                reason = when {
                    a is UpgradeSystem.Availability.Locked -> a.reason
                    a is UpgradeSystem.Availability.TooExpensive -> "Need ${a.missing} more coins"
                    a is UpgradeSystem.Availability.Purchasable && needsPlot && !onPlot ->
                        "Stand on the expansion marker"
                    else -> null
                },
            )
        },
        rush = CustomerSystem.activeRush(harbor, s.tick)?.let { r ->
            RushBannerView(r.id, r.name, CustomerSystem.ticksRemaining(r, s.tick))
        },
        seasonalEvent = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.active(c, s.tick)?.let { e ->
            SeasonalEventBannerView(
                eventId = e.id,
                name = e.name,
                description = e.description,
                ticksRemaining = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.ticksRemaining(e, s.tick),
                banner = e.banner,
                customerSpawnMultPermille = e.customerSpawnMultPermille,
                priceMultPermille = e.priceMultPermille,
            )
        },
        bank = run {
            val BS = com.willio.jeanvilma.fishshopping.core.economy.BankSystem
            val unlocked = BS.unlocked(c, s)
            val hasLoan = BS.hasLoan(s)
            BankView(
                unlocked = unlocked,
                lockedReason = BS.missingRequirement(c, s)?.let { "Requires: $it" },
                loanPrincipal = c.bank.loanPrincipal,
                repayAmount = BS.repayAmount(c),
                termTicks = c.bank.termTicks,
                loanOwed = s.loanOwed,
                loanDueTicksLeft = BS.ticksRemaining(s),
                loanOverdue = BS.overdue(s),
                canTakeLoan = unlocked && !hasLoan,
                canRepayLoan = hasLoan && s.coins > 0L,
                coinGoal = s.coinGoal,
                coinGoalCelebrated = s.coinGoalCelebrated,
                goalPresets = c.bank.goalPresets,
            )
        },
        telemetryRates = TelemetryRatesView(
            abandonPermille = Telemetry.abandonPermille(s),
            wageRatioPermille = Telemetry.wageRatioPermille(s),
            topSpecies = topSpeciesViews,
        ),
        supervisorOnDuty = WorkerSystem.supervisorOnDuty(c, s),
        workerWagePerWorkerPerHour = s.workerWagePerWorkerPerHour,
        freeOnShiftSlots = WorkerSystem.freeOnShiftSlots(c, s),
        onShiftCount = s.workers.count { it.onShift },
        overtimeOnShiftCount = (s.workers.count { it.onShift } - WorkerSystem.freeOnShiftSlots(c, s)).coerceAtLeast(0),
        workers = s.workers.map { w ->
            val def = c.workersById[w.roleId]
            val prog = c.staffProgression
            val xpToNext = if (w.level >= prog.maxLevel) null
            else prog.xpThresholds.getOrNull(w.level)?.let { (it - w.xp).coerceAtLeast(0) }
            val roleWire = def?.role?.wire ?: "fisher"
            val activeBranch = w.activeBranchId?.let { c.staffBranchesById[it] }
            val activeSchedule = w.scheduleId?.let { c.staffSchedulesById[it] }
            WorkerView(
                w.id, w.roleId, def?.name ?: w.roleId, roleWire,
                w.x, w.z, w.bag.usedUnits(), w.bag.capacityUnits, w.phase.name,
                level = w.level,
                xp = w.xp,
                xpToNext = xpToNext,
                traitNames = w.traits.map { tid -> c.workerTraitsById[tid]?.name ?: tid },
                onShift = w.onShift,
                equipment = prog.loadouts.slots.mapNotNull { slot ->
                    val uid = w.equipment[slot.id] ?: return@mapNotNull null
                    WorkerEquipmentView(
                        slotId = slot.id,
                        slotName = slot.name,
                        upgradeId = uid,
                        upgradeName = c.upgradesById[uid]?.name ?: uid,
                    )
                },
                blockedReason = WorkerSystem.blockedReason(c, s, harbor, w),
                activeBranchId = activeBranch?.id,
                activeBranchName = activeBranch?.name,
                scheduleId = activeSchedule?.id,
                scheduleName = activeSchedule?.name,
                branches = c.staffTrees.branches.filter { it.role == roleWire }.map { branch ->
                    val unlocked = branch.id in w.unlockedBranchIds
                    val reason = if (unlocked) null
                    else StaffTreesSystem.canTrain(c, s, w, branch.id)
                    StaffBranchOfferView(
                        id = branch.id,
                        name = branch.name,
                        description = branch.description,
                        parentId = branch.parentId,
                        requiresWorkerLevel = branch.requiresWorkerLevel,
                        trainingCostCoins = branch.trainingCostCoins,
                        unlocked = unlocked,
                        active = w.activeBranchId == branch.id,
                        canTrain = reason == null,
                        trainReason = reason,
                        catchSpeedMultPermille = branch.catchSpeedMultPermille,
                        moveSpeedMultPermille = branch.moveSpeedMultPermille,
                        carryBonus = branch.carryBonus,
                        wageMultPermille = branch.wageMultPermille,
                    )
                },
                schedules = c.staffTrees.schedules.map { sch ->
                    StaffScheduleOfferView(
                        id = sch.id,
                        name = sch.name,
                        description = sch.description,
                        dayParts = sch.dayParts,
                        wageMultPermille = sch.wageMultPermille,
                        active = w.scheduleId == sch.id,
                    )
                },
            )
        },
        staff = c.workers.map { def ->
            val a = WorkerSystem.availability(c, s, def)
            val hired = s.workers.count { it.roleId == def.id }
            StaffHireView(
                def.id, def.name, def.role.wire, def.hireCost, hired, def.maxHired,
                purchasable = a is WorkerSystem.WorkerHireAvailability.Purchasable,
                reason = when (a) {
                    is WorkerSystem.WorkerHireAvailability.Locked -> a.reason
                    is WorkerSystem.WorkerHireAvailability.TooExpensive -> "Need ${a.missing} more coins"
                    is WorkerSystem.WorkerHireAvailability.Maxed -> "Max hired"
                    else -> null
                },
            )
        },
        staffGear = c.staffProgression.loadouts.slots.flatMap { slot ->
            slot.upgradeIds.mapNotNull { uid ->
                if (uid !in s.ownedUpgrades) return@mapNotNull null
                val wearer = s.workers.firstOrNull { it.equipment[slot.id] == uid }
                StaffGearView(
                    upgradeId = uid,
                    name = c.upgradesById[uid]?.name ?: uid,
                    slotId = slot.id,
                    slotName = slot.name,
                    equippedOnWorkerId = wearer?.id,
                    equippedOnRoleName = wearer?.let { c.workersById[it.roleId]?.name ?: it.roleId },
                )
            }
        },
        automationIssues = automationIssueViews,
        quests = c.quests.map { q ->
            val completed = q.id in s.completedQuests
            val locked = !completed && !ProgressionSystem.requirementsMet(s, q)
            val progress = s.stat(q.goal.stat).coerceAtMost(q.goal.atLeast)
            QuestView(
                id = q.id,
                name = q.name,
                description = q.description,
                status = when {
                    completed -> "completed"
                    locked -> "locked"
                    else -> "active"
                },
                progress = if (completed) q.goal.atLeast else progress,
                goalAtLeast = q.goal.atLeast,
                rewardCoins = q.reward.coins,
                rewardUnlockNames = q.reward.unlockUpgrades.map { uid -> c.upgradesById[uid]?.name ?: uid },
                reason = if (locked) ProgressionSystem.missingRequirement(c, s, q)?.let { "Requires: $it" } else null,
            )
        },
        contractsUnlocked = ContractSystem.boardUnlocked(c, s),
        contractsLockedReason = ContractSystem.missingBoardRequirement(c, s)?.let { "Requires: $it" },
        contractOffers = s.contractOffers.map { o ->
            val t = c.contractTemplatesById[o.templateId]
            val maxed = s.activeContracts.size >= c.contracts.maxActive
            val standing = t?.isStanding == true
            val chainId = t?.chainId
            ContractOfferView(
                offerId = o.id,
                templateId = o.templateId,
                name = t?.name ?: o.templateId,
                description = t?.description ?: "",
                itemId = o.itemId,
                itemName = c.itemName(o.itemId),
                quantity = o.quantity,
                durationTicks = o.durationTicks,
                payout = o.payout,
                penalty = o.penalty,
                acceptEnabled = !maxed,
                reason = if (maxed) "Max active contracts" else null,
                standing = standing,
                standingStreak = if (standing) ContractSystem.standingStreak(s, o.templateId) else 0,
                chainId = chainId,
                chainStep = t?.chainStep ?: 0,
                chainLength = chainId?.let { ContractSystem.chainLength(c, it) } ?: 0,
                requiresReputationBand = t?.requiresReputationBand,
            )
        },
        activeContracts = s.activeContracts.map { job ->
            val t = c.contractTemplatesById[job.templateId]
            val bag = s.player.bag.available(job.itemId)
            val standing = t?.isStanding == true
            val chainId = t?.chainId
            ActiveContractView(
                contractId = job.id,
                templateId = job.templateId,
                name = t?.name ?: job.templateId,
                itemId = job.itemId,
                itemName = c.itemName(job.itemId),
                delivered = job.delivered,
                quantity = job.quantity,
                ticksRemaining = (job.deadlineTick - s.tick).coerceAtLeast(0).toInt(),
                payout = job.payout,
                penalty = job.penalty,
                bagAvailable = bag,
                deliverEnabled = bag > 0 && job.delivered < job.quantity,
                standing = standing,
                standingStreak = if (standing) ContractSystem.standingStreak(s, job.templateId) else 0,
                chainId = chainId,
                chainStep = t?.chainStep ?: 0,
                chainLength = chainId?.let { ContractSystem.chainLength(c, it) } ?: 0,
            )
        },
        contractRefreshTicksLeft = if (s.contractBoardRefreshAt <= 0L) 0
        else (s.contractBoardRefreshAt - s.tick).coerceAtLeast(0L).toInt(),
        contractFailStreak = ContractSystem.failStreak(s),
        contractFailStreakThreshold = c.contracts.failStreakThreshold,
        dailyLoginStreak = com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem.streak(s),
        dailyGoals = run {
            val DG = com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem
            DG.boardObjectives(c, s).map { o ->
                val progress = DG.progress(c, s, o)
                val complete = DG.isComplete(c, s, o)
                val claimed = DG.isClaimed(c, s, o)
                DailyGoalView(
                    objectiveId = o.id,
                    name = o.name,
                    description = o.description,
                    progress = progress,
                    target = o.goal.atLeast,
                    rewardCoins = DG.claimRewardCoins(c, s, o),
                    complete = complete,
                    claimed = claimed,
                    claimEnabled = complete && !claimed,
                )
            }
        },
        economyUnlocked = EconomySystem.unlocked(c, s),
        economyLockedReason = EconomySystem.missingRequirement(c, s)?.let { "Requires: $it" },
        maintenanceCoinsPerStation = if (EconomySystem.unlocked(c, s)) {
            EconomySystem.maintenanceCoinsPerStation(c, s, harbor)
        } else 0,
        bagFishSpoilActive = EconomySystem.unlocked(c, s) && c.economy.bagFishSpoilUnits > 0,
        prestigeUnlocked = PrestigeSystem.boardUnlocked(c, s),
        prestigeLockedReason = PrestigeSystem.missingBoardRequirement(c, s)?.let { "Requires: $it" },
        harborRating = PrestigeSystem.harborRating(c, s),
        reputationScorePermille = ReputationSystem.scorePermille(c, s),
        reputationBand = ReputationSystem.band(c, s),
        reputationLabel = ReputationSystem.bandLabel(c, s),
        prestige = c.prestige.milestones.map { m ->
            val completed = m.id in s.completedPrestige
            val locked = !completed && !PrestigeSystem.requirementsMet(s, m)
            val progress = s.stat(m.goal.stat).coerceAtMost(m.goal.atLeast)
            PrestigeView(
                id = m.id,
                name = m.name,
                description = m.description,
                status = when {
                    completed -> "completed"
                    locked -> "locked"
                    else -> "active"
                },
                progress = if (completed) m.goal.atLeast else progress,
                goalAtLeast = m.goal.atLeast,
                rewardCoins = m.reward.coins,
                cosmetic = m.reward.cosmetic,
                catchSpeedPermille = m.reward.catchSpeedPermille,
                priceBonusPermille = m.reward.priceBonusPermille,
                reason = if (locked) PrestigeSystem.missingRequirement(c, s, m)?.let { "Requires: $it" } else null,
            )
        },
        achievements = c.achievements.entries.map { a ->
            val unlocked = a.id in s.unlockedAchievements
            val progress = s.stat(a.goal.stat).coerceAtMost(a.goal.atLeast)
            AchievementView(
                id = a.id,
                name = a.name,
                description = a.description,
                category = a.category,
                status = if (unlocked) "unlocked" else "active",
                progress = if (unlocked) a.goal.atLeast else progress,
                goalAtLeast = a.goal.atLeast,
                rewardCoins = a.rewardCoins,
            )
        },
        unlockedAchievementsCount = s.unlockedAchievements.size,
        unlockedCosmetics = s.unlockedCosmetics.toList(),
        decorOffers = c.decor.items.map { d ->
            val owned = d.id in s.ownedDecor
            val miss = com.willio.jeanvilma.fishshopping.core.world.DecorSystem.missingRequirement(c, s, d)
            DecorOfferView(
                id = d.id,
                name = d.name,
                description = d.description,
                cost = d.cost,
                patienceBonusTicks = d.patienceBonusTicks,
                requiresCosmetic = d.requiresCosmetic,
                status = when {
                    owned -> "owned"
                    miss != null -> "locked"
                    else -> "available"
                },
                reason = when {
                    owned -> null
                    miss != null -> "Requires: $miss"
                    s.coins < d.cost -> "Need ${d.cost - s.coins} more coins"
                    else -> null
                },
                canAfford = !owned && miss == null && s.coins >= d.cost,
            )
        },
        cosmeticIapOffers = com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem.CATALOG.map { sku ->
            CosmeticIapOfferView(
                id = sku.id,
                sku = sku.sku,
                grantsCosmetic = sku.grantsCosmetic,
                title = sku.title,
                description = sku.description,
                status = if (sku.grantsCosmetic in s.unlockedCosmetics) "owned" else "available",
            )
        },
        decorPatienceBonusTicks = com.willio.jeanvilma.fishshopping.core.world.DecorSystem.patienceBonusTicks(c, s),
        trophies = s.trophies.entries.map { (id, rec) ->
            TrophyEntryView(
                speciesId = id,
                name = c.itemName(id),
                sizePermille = rec.sizePermille,
                valueCoins = rec.valueCoins,
                tick = rec.tick,
            )
        },
        trophySets = c.trophies.sets.map { set ->
            val mounted = set.species.count { it in s.trophies }
            TrophySetView(
                id = set.id,
                name = set.name,
                description = set.description,
                mounted = mounted,
                total = set.species.size,
                completed = mounted >= set.species.size,
            )
        },
        transferAnchors = buildTransferAnchors(),
        warehouse = com.willio.jeanvilma.fishshopping.core.inventory.Warehouse.build(c, s, harbor),
        speciesBook = com.willio.jeanvilma.fishshopping.core.inventory.SpeciesBook.build(c, s),
        businessDashboard = BusinessDashboard.build(c, s, automationIssueViews, topSpeciesViews),
    )
}

private fun Simulation.topSpeciesCatchShareViews(limit: Int = 3): List<SpeciesCatchShareView> {
    val shares = Telemetry.speciesCatchSharePermille(state)
    return shares.entries
        .sortedWith(compareByDescending<Map.Entry<String, Long>> { it.value }.thenBy { it.key })
        .take(limit)
        .map { (id, share) ->
            SpeciesCatchShareView(
                speciesId = id,
                name = content.itemName(id),
                sharePermille = share,
                catches = state.speciesCatches[id] ?: 0L,
            )
        }
}

private fun Simulation.automationIssueViews(stationViews: List<StationView>): List<AutomationIssueView> {
    val c = content
    val s = state
    val out = ArrayList<AutomationIssueView>()
    for (st in stationViews) {
        val reason = when {
            st.needsRepair && st.status == MachineStatus.NEEDS_REPAIR -> "Needs repair"
            st.needsRepair && st.slowed -> "Running slow"
            st.status == MachineStatus.OUTPUT_FULL -> "Output full"
            st.status == MachineStatus.WAITING_FOR_INPUT -> "No input"
            else -> null
        } ?: continue
        val name = harbor.stations.firstOrNull { it.id == st.stationId }?.let { pad ->
            c.machinesById[pad.machine]?.name ?: st.stationId
        } ?: st.stationId
        out += AutomationIssueView(st.stationId, "machine", name, reason)
    }
    for (w in s.workers) {
        val reason = WorkerSystem.blockedReason(c, s, harbor, w) ?: continue
        if (reason == "Off shift") continue
        val def = c.workersById[w.roleId]
        out += AutomationIssueView(w.id, "worker", def?.name ?: w.roleId, reason)
    }
    return out
}

private fun Simulation.buildTransferAnchors(): List<TransferAnchorView> {
    val s = state
    val h = harbor
    val out = ArrayList<TransferAnchorView>(4 + h.stations.size * 2 + h.counters.size + s.workers.size)
    out += TransferAnchorView("inv.player_bag", s.player.x, s.player.z)
    for (st in h.stations) {
        val input = h.zonesById.getValue(st.inputZone).rect
        val output = h.zonesById.getValue(st.outputZone).rect
        out += TransferAnchorView("inv.${st.id}.input", input.centerX, input.centerZ)
        out += TransferAnchorView("inv.${st.id}.output", output.centerX, output.centerZ)
    }
    for (c in h.counters) {
        val z = h.zonesById.getValue(c.zone).rect
        out += TransferAnchorView("inv.${c.id}", z.centerX, z.centerZ)
    }
    for (w in s.workers) {
        out += TransferAnchorView("inv.${w.id}.bag", w.x, w.z)
    }
    return out
}
