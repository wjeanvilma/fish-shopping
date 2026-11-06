package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import java.util.TreeMap
import java.util.TreeSet

/** Stat keys referenced by content (quests, tutorial). */
object Stats {
    const val FISH_CAUGHT = "stat.fish_caught"
    const val MACHINE_INPUTS = "stat.machine_inputs"
    const val OUTPUTS_COLLECTED = "stat.outputs_collected"
    const val COUNTER_STOCKED = "stat.counter_stocked"
    const val SALES = "stat.sales"
    const val ITEMS_SOLD = "stat.items_sold"
    const val REVENUE = "stat.revenue"
    const val LOST_CUSTOMERS = "stat.lost_customers"
    const val UPGRADES_BOUGHT = "stat.upgrades_bought"
    const val TIMING_BONUSES = "stat.timing_bonuses"
    const val RARE_CATCHES = "stat.rare_catches"
    const val PREMIUM_SALES = "stat.premium_sales"
    const val BULK_SALES = "stat.bulk_sales"
    const val UNMET_PREFERENCE_SALES = "stat.unmet_preference_sales"
    const val WORKERS_HIRED = "stat.workers_hired"
    const val WORKER_FISH_CAUGHT = "stat.worker_fish_caught"
    const val WORKER_ITEMS_MOVED = "stat.worker_items_moved"
    const val LEASES_EXPIRED = "stat.leases_expired"
    const val WAGES_PAID = "stat.wages_paid"
}

enum class WorkerTaskPhase {
    NONE,
    WALK_TO_WORK,
    WORK,
    PICKUP,
    WALK_TO_DROP,
    DROP,
}

/**
 * Hired staff. Fishers catch into [bag] and deliver to machines; porters haul
 * machine output to counters under a short lease/reservation.
 */
class WorkerState(
    val id: String,
    val roleId: String,
    var x: Int,
    var z: Int,
    val bag: Inventory,
) {
    var walkTicksLeft = 0
    var walkTicksTotal = 0
    var walkFromX = 0
    var walkFromZ = 0
    var walkToX = 0
    var walkToZ = 0
    var transferCooldown = 0
    var phase = WorkerTaskPhase.NONE
    var taskId: String? = null
    var taskZoneId: String? = null
    var taskSourceInvId: String? = null
    var taskDestInvId: String? = null
    var taskItemId: String? = null
    var taskQuantity = 0
    var leaseExpiresAt = 0L
    var fishingSpecies: String? = null
    var fishingProgress = 0
    var fishingCatchTicks = 0

    val busyWalking get() = walkTicksLeft > 0
}

class PlayerState(
    var x: Int,
    var z: Int,
    val bag: Inventory,
    /** 1000 = normal; rebuilt from content + owned catch_speed upgrades on load. */
    var catchSpeedPermille: Int = 1000,
    /** 1000 = normal; rebuilt from content + owned fish_regen upgrades on load. */
    var fishRegenPermille: Int = 1000,
) {
    var facingX = 0
    var facingZ = SimConstants.INPUT_SCALE
    var inputX = 0
    var inputZ = 0
    var zoneId: String? = null
    var transferCooldown = 0
    var fishingSpecies: String? = null
    var fishingProgress = 0
    /** Duration of the active cast after catch-speed scaling; 0 when not casting. */
    var fishingCatchTicks = 0
    /** True after the player has attempted Reel on the current cast. */
    var reelAttemptedThisCast = false
    /** Set by Command.Reel; consumed by FishingSystem on the same tick. */
    var reelRequested = false
}

class FishingSpotState(val zoneId: String, var stock: Int) {
    var regenProgress = 0
}

enum class MachineStatus { WAITING_FOR_INPUT, PROCESSING, OUTPUT_FULL, PAUSED }

/**
 * In-progress batch. Inputs were removed from the machine at batch start and are
 * recorded here; outputs are created exactly once at completion under this ID.
 */
class Batch(
    val id: String,
    val recipeId: String,
    val durationTicks: Int,
    var remainingTicks: Int,
    val consumed: List<ItemQuantity>,
)

class MachineState(
    val stationId: String,
    val machineId: String,
    val input: Inventory,
    val output: Inventory,
) {
    var activeBatch: Batch? = null
    var paused = false
    var status = MachineStatus.WAITING_FOR_INPUT
    /**
     * When set, only this recipe may start (waits even if other inputs are ready).
     * Null = auto: first ready recipe in content order.
     */
    var preferredRecipeId: String? = null

    /** Recipe duration overrides from upgrades; applied to the next batch. */
    val recipeDurations = TreeMap<String, Int>()
}

class CounterState(val counterId: String, val stock: Inventory) {
    var checkoutProgress = 0
}

/**
 * A customer queued at a counter. The items they intend to buy are held as
 * reservations on the counter stock (possibly across multiple products), so they
 * cannot be sold twice; on abandonment every reservation is released back to stock.
 */
class CustomerState(
    val id: String,
    val typeId: String,
    val counterId: String,
    val wants: Int,
    var patienceLeft: Int,
    /** Ticks needed to walk from the harbor entry to the queue (fixed at spawn). */
    val walkTicksTotal: Int = 0,
    /** Preferred product rolled at spawn; null means any accepted product. */
    var preferredProductId: String? = null,
) {
    /** Reserved quantities by product id (sorted). [reserved] is the total count. */
    val reservedItems = TreeMap<String, Int>()
    val reserved: Int get() = reservedItems.values.sum()

    fun addReservation(itemId: String, count: Int) {
        require(count > 0)
        reservedItems[itemId] = (reservedItems[itemId] ?: 0) + count
    }

    fun clearReservations() {
        reservedItems.clear()
    }

    /** True when there is no preference, or every reserved unit is the preferred product. */
    fun preferenceMet(): Boolean {
        val pref = preferredProductId ?: return true
        if (reserved == 0) return false
        return reservedItems.keys.all { it == pref }
    }

    /** Ticks still walking. A walking customer is not yet queued: no reservations, no patience loss. */
    var walkTicksLeft = walkTicksTotal
    val arrived get() = walkTicksLeft == 0
}

/** Ledger entry for any coin movement or idempotent grant. */
data class Receipt(
    val id: String,
    val type: String,
    val coinDelta: Long,
    val tick: Long,
    val reference: String,
)

class GameState(
    val harborId: String,
    val rng: Prng,
    val player: PlayerState,
    val fishingSpots: List<FishingSpotState>,
    val machines: List<MachineState>,
    val counters: List<CounterState>,
) {
    var tick = 0L
    var coins = 0L
    var nextSerial = 1L
    var tutorialIndex = 0
    var customerSpawnProgress = 0
    val customers = mutableListOf<CustomerState>()
    val workers = mutableListOf<WorkerState>()
    val ownedUpgrades = TreeSet<String>()
    val completedQuests = TreeSet<String>()
    val stats = TreeMap<String, Long>()

    /** Staff walk multiplier (1000 = content speeds). Rebuilt from owned upgrades on load. */
    var workerMoveSpeedPermille = 1000
    /** Minimum fisher catch speed; 0 means use each role's content default only. */
    var workerCatchSpeedPermille = 0
    /** Minimum bag capacity for hired staff. */
    var workerCarryCapacityFloor = 0
    /** Coins charged per hired worker each simulated hour. */
    var workerWagePerWorkerPerHour = 0
    /** Progress toward the next wage payday (not persisted). */
    var workerWageAccrualTicks = 0

    /** Purchase receipts keyed by client request ID: a retried request returns the same receipt. */
    val purchaseReceipts = TreeMap<String, Receipt>()

    /** Recent coin movements for debugging discrepancies (bounded). */
    val ledger = ArrayDeque<Receipt>()

    fun stat(key: String) = stats[key] ?: 0L
    fun bumpStat(key: String, by: Long = 1) {
        stats[key] = SafeMath.add(stat(key), by)
    }

    fun newId(prefix: String): String = "$prefix.${nextSerial++}"

    fun record(r: Receipt) {
        ledger.addLast(r)
        while (ledger.size > LEDGER_LIMIT) ledger.removeFirst()
    }

    companion object {
        const val LEDGER_LIMIT = 64

        fun newGame(content: ContentPack, harborId: String, seed: Int): GameState {
            val harbor = content.harborsById[harborId] ?: error("Unknown harbor $harborId")
            val units = content::carryUnits
            val player = PlayerState(
                harbor.playerSpawn.x, harbor.playerSpawn.z,
                Inventory("inv.player_bag", content.player.startCarryCapacityUnits, units),
                catchSpeedPermille = content.player.startCatchSpeedPermille,
                fishRegenPermille = content.player.startFishRegenPermille,
            )
            return GameState(
                harborId = harborId,
                rng = Prng(seed),
                player = player,
                fishingSpots = harbor.fishingSpots.map { FishingSpotState(it.zone, it.stockMax) },
                machines = createMachines(content, harbor),
                counters = harbor.counters.map {
                    CounterState(it.id, Inventory("inv.${it.id}", it.capacityUnits, units))
                },
            ).also { it.coins = content.player.startCoins }
        }

        private fun createMachines(content: ContentPack, harbor: HarborDef) = harbor.stations.map { s ->
            val def = content.machinesById.getValue(s.machine)
            MachineState(
                s.id, s.machine,
                Inventory("inv.${s.id}.input", def.inputCapacityUnits, content::carryUnits),
                Inventory("inv.${s.id}.output", def.outputCapacityUnits, content::carryUnits),
            )
        }
    }
}

/** Player intent. The simulation validates every command. */
sealed interface Command {
    /** Joystick / keyboard direction, each axis in -INPUT_SCALE..INPUT_SCALE. Persists until changed. */
    data class Move(val x: Int, val z: Int) : Command
    data class PurchaseUpgrade(val upgradeId: String, val requestId: String) : Command
    data class SetMachinePaused(val stationId: String, val paused: Boolean) : Command
    /** Attempt a timing-bonus reel while casting. */
    data object Reel : Command
    /**
     * Lock a station to [recipeId], or pass null for Auto.
     * Prefer [com.willio.jeanvilma.fishshopping.core.production.ProductionSystem.cyclePreferredRecipe]
     * from the HUD; this command sets an absolute preference.
     */
    data class SelectMachineRecipe(val stationId: String, val recipeId: String?) : Command
    /** Hire a content worker role; [requestId] makes retries idempotent. */
    data class HireWorker(val roleId: String, val requestId: String) : Command
}

/** Results of simulation. UI effects consume these but never change economic state. */
sealed interface GameEvent {
    val tick: Long

    data class ZoneEntered(override val tick: Long, val zoneId: String?) : GameEvent
    data class FishCaught(
        override val tick: Long,
        val speciesId: String,
        val zoneId: String,
        val timingBonus: Boolean = false,
        val rareUpgrade: Boolean = false,
    ) : GameEvent
    /** Soft feedback when a fishing spot's stock hits zero. */
    data class FishingSpotDepleted(override val tick: Long, val zoneId: String) : GameEvent
    data class ItemsTransferred(override val tick: Long, val from: String, val to: String, val itemId: String, val count: Int) : GameEvent
    data class BatchStarted(override val tick: Long, val batchId: String, val stationId: String, val recipeId: String) : GameEvent
    data class BatchCompleted(override val tick: Long, val batchId: String, val stationId: String) : GameEvent
    data class CustomerArrived(override val tick: Long, val customerId: String, val counterId: String) : GameEvent
    data class CustomerLeft(override val tick: Long, val customerId: String, val paid: Boolean) : GameEvent
    data class RushStarted(override val tick: Long, val rushId: String, val name: String) : GameEvent
    data class RushEnded(override val tick: Long, val rushId: String, val name: String) : GameEvent
    data class SaleCommitted(
        override val tick: Long,
        val saleId: String,
        val customerId: String,
        /** Basket lines in sorted product-id order. */
        val items: List<ItemQuantity>,
        val coins: Long,
        val customerTypeId: String = "",
        val priceMultPermille: Int = 1000,
        val preferenceMet: Boolean = true,
        val preferredProductId: String? = null,
    ) : GameEvent {
        val quantity: Int get() = items.sumOf { it.quantity }
        val tipped: Boolean get() = priceMultPermille > 1000
    }
    data class UpgradePurchased(override val tick: Long, val upgradeId: String, val receipt: Receipt, val replayed: Boolean) : GameEvent
    data class PurchaseRejected(override val tick: Long, val upgradeId: String, val requestId: String, val reason: String) : GameEvent
    data class WorkerHired(override val tick: Long, val roleId: String, val receipt: Receipt, val replayed: Boolean) : GameEvent
    data class HireRejected(override val tick: Long, val roleId: String, val requestId: String, val reason: String) : GameEvent
    data class LeaseExpired(override val tick: Long, val workerId: String, val itemId: String?, val sourceInvId: String?) : GameEvent
    data class WagesPaid(override val tick: Long, val workers: Int, val coins: Long) : GameEvent
    data class QuestCompleted(override val tick: Long, val questId: String) : GameEvent
    data class TutorialAdvanced(override val tick: Long, val stepIndex: Int) : GameEvent
    data class CheckpointRequested(override val tick: Long, val reason: String) : GameEvent
}
