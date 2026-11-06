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
    val recipes: List<RecipeDef>,
    val machines: List<MachineDef>,
    val upgrades: List<UpgradeDef>,
    val quests: List<QuestDef>,
    val customers: List<CustomerDef>,
    val tutorial: List<TutorialStepDef>,
    val harbors: List<HarborDef>,
) {
    val speciesById = species.associateBy { it.id }
    val productsById = products.associateBy { it.id }
    val recipesById = recipes.associateBy { it.id }
    val machinesById = machines.associateBy { it.id }
    val upgradesById = upgrades.associateBy { it.id }
    val questsById = quests.associateBy { it.id }
    val harborsById = harbors.associateBy { it.id }

    /** Carry units for any item (species or product). Throws on unknown IDs. */
    fun carryUnits(itemId: String): Int =
        speciesById[itemId]?.carryUnits
            ?: productsById[itemId]?.carryUnits
            ?: error("Unknown item $itemId")

    fun itemName(itemId: String): String =
        speciesById[itemId]?.name ?: productsById[itemId]?.name ?: itemId

    fun isKnownItem(itemId: String) = itemId in speciesById || itemId in productsById
}

data class PlayerDef(
    val startCoins: Long,
    val startCarryCapacityUnits: Int,
    val moveSpeedMmPerTick: Int,
    val transferIntervalTicks: Int,
    /** 1000 = normal catch duration; higher finishes casts faster. */
    val startCatchSpeedPermille: Int,
    /** Cast progress (0..1000) where the Reel timing window opens. */
    val timingWindowStartPermille: Int,
    /** Cast progress (0..1000) where the Reel timing window closes (exclusive). */
    val timingWindowEndPermille: Int,
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
)

data class ProductDef(
    val id: String,
    val name: String,
    val carryUnits: Int,
    val unitPrice: Long,
    val asset: String?,
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

data class QuestDef(val id: String, val name: String, val goal: StatGoal)

data class CustomerDef(
    val id: String,
    val name: String,
    val basketMin: Int,
    val basketMax: Int,
    val patienceTicks: Int,
    val spawnWeight: Int,
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
    FISHING("fishing"), MACHINE_INPUT("machine_input"), MACHINE_OUTPUT("machine_output"), COUNTER("counter");

    companion object {
        fun fromWire(s: String) = entries.firstOrNull { it.wire == s }
    }
}

data class ZoneDef(val id: String, val kind: ZoneKind, val rect: RectMm)

data class FishingSpotDef(val zone: String, val species: List<String>, val stockMax: Int, val regenTicks: Int)

data class StationDef(val id: String, val machine: String, val inputZone: String, val outputZone: String)

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

data class HarborDef(
    val id: String,
    val name: String,
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
) {
    val zonesById = zones.associateBy { it.id }
}
