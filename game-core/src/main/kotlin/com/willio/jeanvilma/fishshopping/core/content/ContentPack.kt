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
    /** Task scoring weights for worker haul routing (Phase 13). */
    val routing: RoutingDef,
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
    val prestigeMilestonesById = prestige.milestones.associateBy { it.id }
    val trophySetsById = trophies.sets.associateBy { it.id }
    val contractTemplatesById = contracts.templates.associateBy { it.id }
    val customersById = customers.associateBy { it.id }
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
    SUPERVISOR("supervisor");

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

/** Weights for scoring worker haul candidates (urgency / distance / demand). */
data class RoutingDef(
    val urgencyWeight: Int,
    val distanceWeight: Int,
    val demandWeight: Int,
    /** Multiplies [demandWeight] while a supervisor is on duty (1000 = unchanged). */
    val supervisorDemandBoostPermille: Int,
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
    ;

    companion object {
        fun fromWire(s: String) = entries.firstOrNull { it.wire == s }
    }
}

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
) {
    val zonesById = zones.associateBy { it.id }
    val rushesById = rushes.associateBy { it.id }
    /** GLB filename under models/, matching generate_blockout.py. */
    val blockoutAsset: String get() = "${id.substringAfter('.')}_blockout.glb"
}
