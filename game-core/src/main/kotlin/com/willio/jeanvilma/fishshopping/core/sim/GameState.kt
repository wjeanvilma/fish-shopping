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
}

class PlayerState(
    var x: Int,
    var z: Int,
    val bag: Inventory,
    /** 1000 = normal; rebuilt from content + owned catch_speed upgrades on load. */
    var catchSpeedPermille: Int = 1000,
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
    val ownedUpgrades = TreeSet<String>()
    val completedQuests = TreeSet<String>()
    val stats = TreeMap<String, Long>()

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
    data class ItemsTransferred(override val tick: Long, val from: String, val to: String, val itemId: String, val count: Int) : GameEvent
    data class BatchStarted(override val tick: Long, val batchId: String, val stationId: String, val recipeId: String) : GameEvent
    data class BatchCompleted(override val tick: Long, val batchId: String, val stationId: String) : GameEvent
    data class CustomerArrived(override val tick: Long, val customerId: String, val counterId: String) : GameEvent
    data class CustomerLeft(override val tick: Long, val customerId: String, val paid: Boolean) : GameEvent
    data class SaleCommitted(
        override val tick: Long,
        val saleId: String,
        val customerId: String,
        /** Basket lines in sorted product-id order. */
        val items: List<ItemQuantity>,
        val coins: Long,
    ) : GameEvent {
        val quantity: Int get() = items.sumOf { it.quantity }
    }
    data class UpgradePurchased(override val tick: Long, val upgradeId: String, val receipt: Receipt, val replayed: Boolean) : GameEvent
    data class PurchaseRejected(override val tick: Long, val upgradeId: String, val requestId: String, val reason: String) : GameEvent
    data class QuestCompleted(override val tick: Long, val questId: String) : GameEvent
    data class TutorialAdvanced(override val tick: Long, val stepIndex: Int) : GameEvent
    data class CheckpointRequested(override val tick: Long, val reason: String) : GameEvent
}
