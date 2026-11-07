package com.willio.jeanvilma.fishshopping.core.content

/*
 * Immutable, validated game content. Mirrors shared/schema/content-pack.schema.json.
 * Distances are integer millimetres, durations integer ticks, money integer coins.
 */

data class ContentPack(
    val contentVersion: String,
    val ticksPerSecond: Int,
    val player: PlayerDef,
    val species: List<SpeciesDef>,
    val products: List<ProductDef>,
    /** Consumable pier bait (Phase 9). */
    val bait: List<BaitDef>,
    val recipes: List<RecipeDef>,
    val machines: List<MachineDef>,
    val upgrades: List<UpgradeDef>,
    val quests: List<QuestDef>,
    val workers: List<WorkerDef>,
    /** Per-worker XP, levels, and hire-time traits (Phase 16). */
    val staffProgression: StaffProgressionDef,
    /** Task scoring weights for worker haul routing (Phase 13). */
    val routing: RoutingDef,
    /** Staff automation blocked reasons + rush idle ticker alerts (Phase 20). */
    val automationAlerts: AutomationAlertsDef,
    /** Offline catch-up policy (Phase 14). */
    val offline: OfflineDef,
    /** Soft coin/stock sinks after early progression (Phase 19). */
    val economy: EconomyDef,
    /** Day-part fishing ecology (Phase 7). */
    val ecology: EcologyDef,
    /** Museum / trophy board (Phase 10). */
    val trophies: TrophiesDef,
    /** End-of-run prestige milestones (Phase 20); additive, never wipes the save. */
    val prestige: PrestigeDef,
    /** Service reputation from served vs abandoned (Phase 13). */
    val reputation: ReputationDef,
    /** Timed delivery contracts board (Phase 17). */
    val contracts: ContractsDef,
    val customers: List<CustomerDef>,
    val tutorial: List<TutorialStepDef>,
    /** Phase 23 shop decor / placable cosmetics. */
    val decor: DecorCatalog,
    /** Phase 24 time-boxed overlays driven by the sim clock. */
    val seasonalEvents: SeasonalEventsCatalog,
    /** Phase 26 short-term loans and coin-goal presets. */
    val bank: BankDef,
    val harbors: List<HarborDef>,
) {
    val speciesById = species.associateBy { it.id }
    val productsById = products.associateBy { it.id }
    val baitById = bait.associateBy { it.id }
    val recipesById = recipes.associateBy { it.id }
    val machinesById = machines.associateBy { it.id }
    val upgradesById = upgrades.associateBy { it.id }
    val questsById = quests.associateBy { it.id }
    val workersById = workers.associateBy { it.id }
    val workerTraitsById = staffProgression.traits.associateBy { it.id }
    val prestigeMilestonesById = prestige.milestones.associateBy { it.id }
    val trophySetsById = trophies.sets.associateBy { it.id }
    val contractTemplatesById = contracts.templates.associateBy { it.id }
    val customersById = customers.associateBy { it.id }
    val decorById = decor.items.associateBy { it.id }
    val seasonalEventsById = seasonalEvents.events.associateBy { it.id }
    val harborsById = harbors.associateBy { it.id }

    /** Carry units for any item (species, product, or bait). Throws on unknown IDs. */
    fun carryUnits(itemId: String): Int =
        speciesById[itemId]?.carryUnits
            ?: productsById[itemId]?.carryUnits
            ?: baitById[itemId]?.carryUnits
            ?: error("Unknown item $itemId")

    fun itemName(itemId: String): String =
        speciesById[itemId]?.name ?: productsById[itemId]?.name ?: baitById[itemId]?.name ?: itemId

    fun isKnownItem(itemId: String) = itemId in speciesById || itemId in productsById || itemId in baitById
}

data class PlayerDef(
    val startCoins: Long,
    val startCarryCapacityUnits: Int,
    val moveSpeedMmPerTick: Int,
    val transferIntervalTicks: Int,
    /** 1000 = normal catch duration; higher finishes casts faster. */
    val startCatchSpeedPermille: Int,
    /** 1000 = normal spot regen; higher restocks empty spots faster. */
    val startFishRegenPermille: Int,
    /** Cast progress (0..1000) where the Good reel window opens. */
    val timingWindowStartPermille: Int,
    /** Cast progress (0..1000) where the Good reel window closes (exclusive). */
    val timingWindowEndPermille: Int,
    /** Perfect zone start; must sit inside the Good window. */
    val timingPerfectStartPermille: Int,
    /** Perfect zone end (exclusive). */
    val timingPerfectEndPermille: Int,
    /** Tip payout for a Good reel as permille of species baseValue. */
    val timingGoodBonusPermille: Int,
    /** Tip payout for a Perfect reel as permille of species baseValue. */
    val timingPerfectBonusPermille: Int,
)

data class RareUpgradeDef(val to: String, val chancePermille: Int)

data class SpeciesDef(
    val id: String,
    val name: String,
    val carryUnits: Int,
    val catchTicks: Int,
    val baseValue: Long,
    val rarityWeight: Int,
    val asset: String?,
    val rareUpgrade: RareUpgradeDef? = null,
    /** Bag spoil priority: 3 fragile first, 1 hardy last. */
    val spoilTier: Int = 2,
)

data class ProductDef(
    val id: String,
    val name: String,
    val carryUnits: Int,
    val unitPrice: Long,
    val asset: String?,
    /** Counter spoil priority: 3 fragile first, 1 preserved last. */
    val spoilTier: Int = 2,
)

/** Pier bait consumable; bought at kiosk zones, carried in the player bag. */
data class BaitDef(
    val id: String,
    val name: String,
    val description: String,
    val carryUnits: Int,
    val packQuantity: Int,
    val cost: Long,
    /** Weight multiplier for species that have a rareUpgrade chain. */
    val rareSpeciesWeightMultPermille: Int,
    /** Added to the rare-upgrade roll when this bait is active on the cast. */
    val rareChanceBonusPermille: Int,
    val requires: List<String>,
)

data class ItemQuantity(val item: String, val quantity: Int)

data class RecipeDef(
    val id: String,
    val machine: String,
    val inputs: List<ItemQuantity>,
    val outputs: List<ItemQuantity>,
    val durationTicks: Int,
)

data class MachineDef(
    val id: String,
    val name: String,
    val recipes: List<String>,
    val inputCapacityUnits: Int,
    val outputCapacityUnits: Int,
)

sealed interface UpgradeEffect {
    data class CarryCapacity(val capacityUnits: Int) : UpgradeEffect
    data class RecipeDuration(val machine: String, val recipe: String, val durationTicks: Int) : UpgradeEffect
    /** Catch speed multiplier in permille (1250 = 25% faster). */
    data class CatchSpeed(val speedPermille: Int) : UpgradeEffect
    /** Grants bait into the bag on purchase only (applyEffect is a no-op on load). */
    data class GrantBait(val bait: String, val quantity: Int) : UpgradeEffect
    /**
     * Widens reel timing windows idempotently: Good/Perfect starts take min,
     * ends take max (same pattern as catch_speed floors).
     */
    data class TimingWindow(
        val windowStartPermille: Int,
        val windowEndPermille: Int,
        val perfectStartPermille: Int,
        val perfectEndPermille: Int,
    ) : UpgradeEffect
    /** Spot regen multiplier in permille (1250 = 25% faster restock). */
    data class FishRegen(val speedPermille: Int) : UpgradeEffect
    /** Ownership unlocks the fishing spot for [zone]; apply is a no-op. */
    data class UnlockFishingSpot(val zone: String) : UpgradeEffect
    /** Ownership unlocks stations whose machine is [machine]; apply is a no-op. */
    data class UnlockMachine(val machine: String) : UpgradeEffect
    /**
     * Ownership unlocks counters whose [CounterDef.kind] matches [pad]
     * (and list this upgrade as requiresUpgrade); apply is a no-op.
     */
    data class UnlockCounter(val pad: String) : UpgradeEffect
    /** Staff walk-speed multiplier in permille (1250 = 25% faster). */
    data class WorkerMoveSpeed(val speedPermille: Int) : UpgradeEffect
    /** Minimum bag capacity for hired staff. */
    data class WorkerCarry(val capacityUnits: Int) : UpgradeEffect
    /** Minimum fisher catch-speed permille (used when higher than the role default). */
    data class WorkerCatchSpeed(val speedPermille: Int) : UpgradeEffect
    /** Coins charged per hired worker each simulated hour. */
    data class WorkerWage(val coinsPerWorkerPerHour: Int) : UpgradeEffect
    /** Subtracted from economy.maintenanceCoinsPerStation (floored at 0). */
    data class MaintenanceDiscount(val coinsOffPerStation: Int) : UpgradeEffect
    /** Multiplies bag fish spoilage period (2000 = half as fast). */
    data class BagSpoilResist(val periodMultPermille: Int) : UpgradeEffect
    /** Multiplies counter product spoilage period (2000 = half as fast). */
    data class CounterSpoilResist(val periodMultPermille: Int) : UpgradeEffect
}

data class UpgradeDef(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    /** Upgrade or quest IDs that must be owned / completed first. */
    val requires: List<String>,
    val effect: UpgradeEffect,
)

data class StatGoal(val stat: String, val atLeast: Long)

data class QuestReward(
    val coins: Long,
    /** Upgrade IDs granted on completion (idempotent with owned upgrades). */
    val unlockUpgrades: List<String>,
)

data class QuestDef(
    val id: String,
    val name: String,
    val description: String,
    /** Quest or upgrade IDs that must be completed / owned first. */
    val requires: List<String>,
    val goal: StatGoal,
    val reward: QuestReward,
)

enum class WorkerRoleKind(val wire: String) {
    FISHER("fisher"),
    PORTER("porter"),
    OPERATOR("operator"),
    CASHIER("cashier"),
    SUPERVISOR("supervisor"),
    /** Fast porter that prioritizes fragile / ice-packed stock (Phase 18). */
    ICE_RUNNER("ice_runner"),
    /** Machine hauler focused on the smoker + process-speed buff (Phase 18). */
    SMOKER_SPECIALIST("smoker_specialist"),
    /** Posts at the entry and slows customer patience drain (Phase 18). */
    GREETER("greeter");

    companion object {
        fun fromWire(s: String) = entries.firstOrNull { it.wire == s }
    }
}

data class WorkerDef(
    val id: String,
    val name: String,
    val role: WorkerRoleKind,
    val hireCost: Long,
    val maxHired: Int,
    val carryCapacityUnits: Int,
    val moveSpeedMmPerTick: Int,
    val catchSpeedPermille: Int,
    val transferIntervalTicks: Int,
    val leaseTicks: Int,
    /** Upgrade or quest IDs that must be owned / completed before hiring. */
    val requires: List<String> = emptyList(),
)

/** Hire-time trait that modifies a single worker's capabilities. */
data class WorkerTraitDef(
    val id: String,
    val name: String,
    val description: String,
    val weight: Int,
    val moveSpeedPermille: Int = 1000,
    val catchSpeedPermille: Int = 1000,
    val carryBonus: Int = 0,
    /** Multiplies transfer interval (1000 = unchanged; lower = faster). */
    val transferIntervalMultPermille: Int = 1000,
)

/** Hire-slot vs on-shift scheduling + overtime wages (Phase 17). */
data class StaffShiftsDef(
    /** Workers that can be on shift at the standard wage rate. */
    val baseOnShiftSlots: Int,
    /** Wage multiplier for on-shift workers beyond free slots (1500 = 1.5x). */
    val overtimeWagePermille: Int,
    /** Added free on-shift slots while a supervisor is posted on shift. */
    val supervisorExtraSlots: Int,
)

/** Passive buffs for Phase 18 specialized hireable roles. */
data class StaffRoleBuffsDef(
    /** Multiplies customer patience drain while a greeter is posted (700 = 30% slower). */
    val greeterPatienceDrainMultPermille: Int,
    /** Smoker batch speed while a smoker specialist is posted (1250 = 25% faster). */
    val smokerSpecialistProcessSpeedPermille: Int,
    /** Ice runners prioritize hauling products at or above this spoil tier. */
    val iceRunnerFragileSpoilTierMin: Int,
    /** Added haul score for ice_packed_crate or fragile spoil-tier items. */
    val iceRunnerSpoilScoreBonus: Int,
)

/** One equippable staff-gear slot (boots / satchel / tackle). */
data class StaffLoadoutSlotDef(
    val id: String,
    val name: String,
    /** Upgrade IDs that fill this slot (mutually exclusive across workers). */
    val upgradeIds: List<String>,
)

/** Assignable staff gear inventory (Phase 19). */
data class StaffLoadoutsDef(
    val slots: List<StaffLoadoutSlotDef>,
)

/** Shared XP curve + trait table for hired staff (Phase 16). */
data class StaffProgressionDef(
    val maxLevel: Int,
    /** Cumulative XP for levels 1..N; index 0 must be 0. */
    val xpThresholds: List<Int>,
    val moveSpeedPermillePerLevel: Int,
    val catchSpeedPermillePerLevel: Int,
    /** +1 carry capacity every N levels above 1. */
    val carryBonusEveryLevels: Int,
    val xpFishCaught: Int,
    val xpItemMoved: Int,
    val xpSaleAssisted: Int,
    val traitsOnHire: Int,
    /** Shift slots / overtime (Phase 17). */
    val shifts: StaffShiftsDef,
    /** Specialized role passives (Phase 18). */
    val roleBuffs: StaffRoleBuffsDef,
    /** Equip slots for owned staff gear upgrades (Phase 19). */
    val loadouts: StaffLoadoutsDef,
    val traits: List<WorkerTraitDef>,
)

/** Weights for scoring worker haul candidates (urgency / distance / demand). */
data class RoutingDef(
    val urgencyWeight: Int,
    val distanceWeight: Int,
    val demandWeight: Int,
    /** Multiplies [demandWeight] while a supervisor is on duty (1000 = unchanged). */
    val supervisorDemandBoostPermille: Int,
)

/** Rush idle ticker thresholds for automated stations (Phase 20). */
data class AutomationAlertsDef(
    /** Ticks a station may stay idle during rush before alerting. */
    val machineIdleTicksDuringRush: Int,
    /** Minimum ticks between idle alerts for the same station. */
    val alertCooldownTicks: Int,
)

/** Offline catch-up: how long absence is simulated when loading / resuming. */
data class OfflineDef(
    val capHours: Int,
    /** Absences shorter than this do not show the summary screen. */
    val summaryMinSeconds: Int,
)

/** Soft economy pressure: station upkeep + counter/bag spoilage (Phase 19). */
data class EconomyDef(
    val requires: List<String>,
    val maintenancePeriodTicks: Int,
    val maintenanceCoinsPerStation: Int,
    val counterSpoilPeriodTicks: Int,
    val counterSpoilUnits: Int,
    val bagFishSpoilPeriodTicks: Int,
    val bagFishSpoilUnits: Int,
    /**
     * Phase 12 scarcity price curve: five bands for counter fill ratio 0–20% … 80–100%.
     * Low stock (early bands) should tip above 1000; full shelves sit near 1000.
     */
    val scarcityPriceCurvePermille: List<Int> = listOf(1150, 1100, 1050, 1000, 1000),
    /** Phase 25 machine wear / disasters (repair spend). */
    val wear: MachineWearDef,
)

/** Phase 25 machine wear rolls and repair costs. */
data class MachineWearDef(
    val requires: List<String>,
    val checkPeriodTicks: Int,
    val chancePermille: Int,
    /** When a wear roll hits, chance it breaks hard instead of slowing. */
    val breakChancePermille: Int,
    val slowDurationTicks: Int,
    /** Process duration multiplier while slowed (1000 = unchanged; >1000 = slower). */
    val slowProcessMultPermille: Int,
    val repairCoins: Long,
)

/** One curated museum set of species trophies. */
data class TrophySetDef(
    val id: String,
    val name: String,
    val description: String,
    val species: List<String>,
    /** Stat written to 1 when every listed species has a personal best. */
    val completeStat: String,
)

/** Size-roll bounds and museum sets for the trophy board (Phase 10). */
data class TrophiesDef(
    val sizeMinPermille: Int,
    val sizeMaxPermille: Int,
    val sets: List<TrophySetDef>,
)

data class PrestigeRewardDef(
    val coins: Long,
    /** 0 = none; otherwise permanent catch-speed floor in permille. */
    val catchSpeedPermille: Int,
    /** 0 = none; otherwise permanent sale price multiplier floor in permille. */
    val priceBonusPermille: Int,
    /** Optional cosmetic / banner id stored on the save. */
    val cosmetic: String? = null,
)

data class PrestigeMilestoneDef(
    val id: String,
    val name: String,
    val description: String,
    val requires: List<String>,
    val goal: StatGoal,
    val reward: PrestigeRewardDef,
)

/** Prestige-lite board: permanent bonuses without wiping the run (Phase 20). */
data class PrestigeDef(
    val requires: List<String>,
    /** Revenue thresholds for harbor rating stars 1..5 (non-decreasing). */
    val ratingThresholds: List<Long>,
    /**
     * Phase 12 soft price multipliers for harbor rating stars 0..5 (length 6).
     * Applied on top of permanent prestige price bonuses.
     */
    val ratingPriceMultPermille: List<Int> = listOf(1000, 1000, 1020, 1040, 1070, 1100),
    val milestones: List<PrestigeMilestoneDef>,
)

/**
 * Service reputation (Phase 13): computed from lifetime sales vs lost customers.
 * Distinct from prestige harbor ★ (revenue). Softly biases customer spawn mix.
 */
data class ReputationDef(
    /** Encounters needed before the score leaves the neutral placeholder. */
    val minSample: Int,
    /** Score used while encounters &lt; minSample. */
    val neutralScorePermille: Int,
    /** Non-decreasing thresholds that split score into bands (length N → N+1 bands). */
    val scoreBandThresholdsPermille: List<Int>,
    /** Per-band customer-kind spawn multipliers (keys = CustomerKind.wire). */
    val kindSpawnMultPermille: List<Map<String, Int>>,
    /** Soft score penalty: unmetPreferenceSales * this / max(1, sales). */
    val unmetPreferencePenaltyPermille: Int,
    /** Lost/encounters ratio at or above this triggers a walkout coaching tip. */
    val coachingLostRatioPermille: Int,
    /** Score at or above this (with enough sample) triggers a praise tip. */
    val coachingPraiseScorePermille: Int,
)

enum class ContractKind(val wire: String) {
    STANDARD("standard"),
    STANDING("standing");

    companion object {
        fun fromWire(s: String) = entries.firstOrNull { it.wire == s }
    }
}

data class ContractTemplateDef(
    val id: String,
    val name: String,
    val description: String,
    val item: String,
    val quantity: Int,
    val durationTicks: Int,
    val payout: Long,
    val penalty: Long,
    val weight: Int,
    /** Phase 14: one-shot vs auto-refresh standing order. */
    val kind: ContractKind = ContractKind.STANDARD,
    /** Per completed standing cycle, multiply payout by this / 1000 (capped by maxStreak). */
    val payoutEscalatePermille: Int = 1000,
    val penaltyEscalatePermille: Int = 1000,
    /** Max escalate steps applied to payout/penalty. */
    val maxStreak: Int = 1,
    /** After a standing fail, template stays off the board until this many ticks pass. */
    val failCooldownTicks: Int = 1,
    /** Phase 24: only post while the named seasonal event is active. */
    val requiresSeasonalEvent: String? = null,
) {
    val isStanding: Boolean get() = kind == ContractKind.STANDING
}

/** Harbor contract board: rotating offers with timed deliveries. */
data class ContractsDef(
    val boardSlots: Int,
    val maxActive: Int,
    val refreshPeriodTicks: Int,
    /** Quest / upgrade IDs required before the board posts offers. */
    val requires: List<String>,
    val templates: List<ContractTemplateDef>,
)

enum class CustomerKind(val wire: String) {
    STANDARD("standard"),
    PREMIUM("premium"),
    BULK("bulk"),
    TOURIST("tourist"),
    WHOLESALER("wholesaler"),
    CRITIC("critic"),
    NIGHT_REGULAR("night_regular");

    companion object {
        fun fromWire(s: String) = entries.firstOrNull { it.wire == s }
    }
}

data class ProductWeight(val item: String, val weight: Int)

data class CustomerDef(
    val id: String,
    val name: String,
    val kind: CustomerKind,
    val basketMin: Int,
    val basketMax: Int,
    val patienceTicks: Int,
    val spawnWeight: Int,
    /** Sale multiplier in permille (1500 = +50% for premium visitors). */
    val priceMultPermille: Int,
    /** Weighted demand table; empty means any accepted counter product. */
    val preferredProducts: List<ProductWeight>,
    /** Applied on top of [priceMultPermille] when the basket is not all preferred product. */
    val unmetPriceMultPermille: Int,
    /** Patience drain per tick while preferred stock is missing (2000 = 2×). */
    val unmetPatienceDrainPermille: Int,
    /**
     * Optional day-part multipliers on [spawnWeight] (1000 = unchanged).
     * Missing keys default to 1000.
     */
    val dayPartSpawnMultPermille: Map<String, Int> = emptyMap(),
)

sealed interface TutorialTrigger {
    data class EnterZone(val zone: String) : TutorialTrigger
    data class Stat(val goal: StatGoal) : TutorialTrigger
}

data class TutorialStepDef(val id: String, val text: String, val advanceOn: TutorialTrigger)

data class PointMm(val x: Int, val z: Int)

/** Axis-aligned rectangle on the ground plane; min inclusive, max exclusive. */
data class RectMm(val id: String, val minX: Int, val minZ: Int, val maxX: Int, val maxZ: Int) {
    fun contains(x: Int, z: Int) = x >= minX && x < maxX && z >= minZ && z < maxZ
    val centerX get() = (minX + maxX) / 2
    val centerZ get() = (minZ + maxZ) / 2
}

enum class ZoneKind(val wire: String) {
    FISHING("fishing"),
    MACHINE_INPUT("machine_input"),
    MACHINE_OUTPUT("machine_output"),
    COUNTER("counter"),
    KIOSK("kiosk"),
    /** Phase 6 expansion marker — walk-to-plot inspect / confirm build. */
    PLOT("plot"),
    ;

    companion object {
        fun fromWire(s: String) = entries.firstOrNull { it.wire == s }
    }
}

/** Harbor expansion marker that grants an unlock upgrade when built. */
data class PlotDef(
    val id: String,
    val name: String,
    val description: String,
    val zone: String,
    val grantsUpgrade: String,
)

data class ZoneDef(val id: String, val kind: ZoneKind, val rect: RectMm)

data class DayPartDef(
    val id: String,
    val name: String,
    /** Exclusive end of this part within the day cycle (1..1000); last part must be 1000. */
    val endPermille: Int,
    /** Regen duration multiplier (1000 = normal; higher = slower). */
    val regenMultPermille: Int,
    /** Player catch-speed multiplier when a tide chart is owned. */
    val catchSpeedMultPermille: Int,
)

data class EcologyDef(
    val dayLengthTicks: Int,
    val parts: List<DayPartDef>,
) {
    val partsById = parts.associateBy { it.id }
}

data class FishingSpotDef(
    val zone: String,
    val species: List<String>,
    val stockMax: Int,
    val regenTicks: Int,
    /** Duration multipliers at stock ratios 0..1 (length >= 2). Empty spots take longer. */
    val regenCurvePermille: List<Int>,
    /** Optional per-day-part regen overrides keyed by [DayPartDef.id]. */
    val dayPartRegenMultPermille: Map<String, Int> = emptyMap(),
    /** When set, the spot cannot be fished until this upgrade is owned. */
    val requiresUpgrade: String? = null,
)

data class StationDef(
    val id: String,
    val machine: String,
    val inputZone: String,
    val outputZone: String,
    val requiresUpgrade: String? = null,
)

enum class CounterKind(val wire: String) {
    RETAIL("retail"),
    WHOLESALE("wholesale");

    companion object {
        fun fromWire(s: String) = entries.firstOrNull { it.wire == s }
            ?: error("Unknown counter kind '$s'")
    }
}

data class CounterDef(
    val id: String,
    /** Products this counter accepts for stocking and sale (content order). */
    val products: List<String>,
    val capacityUnits: Int,
    val zone: String,
    val checkoutTicks: Int,
    val maxQueue: Int,
    /** Ground position of queue slot 0; slot i is queueAnchor + i * queueStep. */
    val queueAnchor: PointMm,
    val queueStep: PointMm,
    /** Retail vs wholesale B2B pad (Phase 15). */
    val kind: CounterKind = CounterKind.RETAIL,
    /** Optional upgrade gate before this counter accepts stock/spawns/cashiers. */
    val requiresUpgrade: String? = null,
) {
    val acceptedProducts: Set<String> = products.toSet()
    fun accepts(itemId: String) = itemId in acceptedProducts
    fun queueSlot(index: Int) = PointMm(queueAnchor.x + index * queueStep.x, queueAnchor.z + index * queueStep.z)
}

/**
 * Periodic customer rush. Active when `(tick % periodTicks)` is in
 * `[startTick, startTick + durationTicks)`. Windows must not wrap the period.
 */
data class RushWindowDef(
    val id: String,
    val name: String,
    val periodTicks: Int,
    val startTick: Int,
    val durationTicks: Int,
    /** Spawn rate multiplier (1000 = normal). */
    val spawnSpeedPermille: Int,
    /** Extra counter queue slots while active. */
    val queueBonus: Int,
    /** Phase 12 sale price multiplier while this rush is active (1000 = unchanged). */
    val priceMultPermille: Int = 1000,
) {
    val endTick: Int get() = startTick + durationTicks
}

/** Phase 26 pier bank: one short-term loan at a time + coin-goal presets. */
data class BankDef(
    val requires: List<String>,
    val loanPrincipal: Long,
    /** Total repayment = principal * repayPermille / 1000. */
    val repayPermille: Int,
    val termTicks: Int,
    /** While overdue, seize owed coins this often. */
    val collectionPeriodTicks: Int,
    val goalPresets: List<Long>,
) {
    fun repayAmount(): Long =
        (loanPrincipal * repayPermille.toLong()) / 1000L
}

/** Phase 24 seasonal event catalog (sim-clock overlays). */
data class SeasonalEventsCatalog(
    val events: List<SeasonalEventDef>,
)

data class SeasonalEventDef(
    val id: String,
    val name: String,
    val description: String,
    val periodTicks: Int,
    val startTick: Int,
    val durationTicks: Int,
    /** Cosmetic / banner id unlocked when the event first becomes active. */
    val banner: String? = null,
    /** Catch-weight multipliers while active (1000 = unchanged). */
    val speciesWeightMultPermille: Map<String, Int> = emptyMap(),
) {
    val endTick: Int get() = startTick + durationTicks
}

/** Phase 23 shop decor catalog. */
data class DecorCatalog(
    val items: List<DecorDef>,
)

data class DecorDef(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    /** Prestige cosmetic / banner id that must already be unlocked, if any. */
    val requiresCosmetic: String? = null,
    /** Added to newly spawned customer patience while owned. */
    val patienceBonusTicks: Int = 0,
)

/** Phase 22 per-harbor passive applied while the player is at this harbor. */
data class HarborSpecializationDef(
    val id: String,
    val name: String,
    val description: String,
    /** Subtracted from economy.maintenanceCoinsPerStation (with upgrade discounts). */
    val maintenanceDiscountPerStation: Int = 0,
    /** Added to rare-upgrade rolls while fishing here. */
    val rareChanceBonusPermille: Int = 0,
    /** Customer-kind spawn multipliers (keys = [CustomerKind.wire]). */
    val kindSpawnMultPermille: Map<String, Int> = emptyMap(),
)

data class HarborDef(
    val id: String,
    val name: String,
    /** Quest / upgrade IDs required before the player may travel here. */
    val requires: List<String> = emptyList(),
    val playerSpawn: PointMm,
    val walkable: List<RectMm>,
    val obstacles: List<RectMm>,
    val zones: List<ZoneDef>,
    val fishingSpots: List<FishingSpotDef>,
    val stations: List<StationDef>,
    val counters: List<CounterDef>,
    /** Phase 6 expansion markers (walk-to-plot construction). */
    val plots: List<PlotDef> = emptyList(),
    val customerSpawnTicks: Int,
    /** Where customers enter and leave the harbor. */
    val customerEntry: PointMm,
    val customerWalkMmPerTick: Int,
    /**
     * Intermediate points on the customer approach polyline
     * (entry → waypoints → queue slot). Empty = straight line.
     */
    val customerPathWaypoints: List<PointMm> = emptyList(),
    val rushes: List<RushWindowDef> = emptyList(),
    /** Phase 22 passive while present at this harbor. */
    val specialization: HarborSpecializationDef? = null,
) {
    val zonesById = zones.associateBy { it.id }
    val rushesById = rushes.associateBy { it.id }
    val plotsById = plots.associateBy { it.id }
    val plotsByZone = plots.associateBy { it.zone }
    val plotsByUpgrade = plots.associateBy { it.grantsUpgrade }
    /** GLB filename under models/, matching generate_blockout.py. */
    val blockoutAsset: String get() = "${id.substringAfter('.')}_blockout.glb"
}
