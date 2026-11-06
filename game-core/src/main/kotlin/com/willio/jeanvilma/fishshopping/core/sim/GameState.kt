package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.world.HarborWorldStash
import java.util.TreeMap
import java.util.TreeSet

/** Stat keys referenced by content (quests, tutorial) and privacy-safe telemetry. */
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
    const val PERFECT_REELS = "stat.perfect_reels"
    const val GOOD_REELS = "stat.good_reels"
    const val BAIT_BOUGHT = "stat.bait_bought"
    const val BAIT_USED = "stat.bait_used"
    const val RARE_CATCHES = "stat.rare_catches"
    const val PREMIUM_SALES = "stat.premium_sales"
    const val BULK_SALES = "stat.bulk_sales"
    const val TOURIST_SALES = "stat.tourist_sales"
    const val WHOLESALER_SALES = "stat.wholesaler_sales"
    const val CRITIC_SALES = "stat.critic_sales"
    const val NIGHT_SALES = "stat.night_sales"
    const val UNMET_PREFERENCE_SALES = "stat.unmet_preference_sales"
    const val WORKERS_HIRED = "stat.workers_hired"
    const val WORKER_FISH_CAUGHT = "stat.worker_fish_caught"
    const val WORKER_ITEMS_MOVED = "stat.worker_items_moved"
    const val WORKER_XP = "stat.worker_xp"
    const val WORKER_LEVEL_UPS = "stat.worker_level_ups"
    const val LEASES_EXPIRED = "stat.leases_expired"
    const val WAGES_PAID = "stat.wages_paid"
    const val OVERTIME_WAGES = "stat.overtime_wages"
    const val QUESTS_COMPLETED = "stat.quests_completed"
    const val CONTRACTS_COMPLETED = "stat.contracts_completed"
    const val CONTRACTS_FAILED = "stat.contracts_failed"
    const val CONTRACT_REVENUE = "stat.contract_revenue"
    const val CONTRACT_ITEMS_DELIVERED = "stat.contract_items_delivered"
    const val HARBORS_TRAVELED = "stat.harbors_traveled"
    const val MAINTENANCE_PAID = "stat.maintenance_paid"
    const val ITEMS_SPOILED = "stat.items_spoiled"
    const val PRESTIGE_COMPLETED = "stat.prestige_completed"
    const val TROPHY_SPECIES = "stat.trophy_species"
    const val TROPHY_RECORDS = "stat.trophy_records"
    const val TROPHY_SETS_COMPLETE = "stat.trophy_sets_complete"
    const val DECOR_BOUGHT = "stat.decor_bought"
    const val MACHINES_BROKEN = "stat.machines_broken"
    const val MACHINES_SLOWED = "stat.machines_slowed"
    const val MACHINES_REPAIRED = "stat.machines_repaired"
    const val REPAIR_SPENT = "stat.repair_spent"
    const val LOANS_TAKEN = "stat.loans_taken"
    const val LOAN_INTEREST_ACCRUED = "stat.loan_interest_accrued"
    const val LOAN_REPAID = "stat.loan_repaid"
    const val LOAN_COLLECTED = "stat.loan_collected"
    const val COIN_GOALS_REACHED = "stat.coin_goals_reached"

    /** Stable ordered list for telemetry exports (zeros included). */
    val ALL: List<String> = listOf(
        FISH_CAUGHT, MACHINE_INPUTS, OUTPUTS_COLLECTED, COUNTER_STOCKED,
        SALES, ITEMS_SOLD, REVENUE, LOST_CUSTOMERS, UPGRADES_BOUGHT,
        TIMING_BONUSES, PERFECT_REELS, GOOD_REELS, BAIT_BOUGHT, BAIT_USED, RARE_CATCHES,
        PREMIUM_SALES, BULK_SALES, TOURIST_SALES, WHOLESALER_SALES, CRITIC_SALES, NIGHT_SALES, UNMET_PREFERENCE_SALES,
        WORKERS_HIRED, WORKER_FISH_CAUGHT, WORKER_ITEMS_MOVED, WORKER_XP, WORKER_LEVEL_UPS,
        LEASES_EXPIRED, WAGES_PAID, OVERTIME_WAGES,
        QUESTS_COMPLETED, CONTRACTS_COMPLETED, CONTRACTS_FAILED, CONTRACT_REVENUE,
        CONTRACT_ITEMS_DELIVERED, HARBORS_TRAVELED, MAINTENANCE_PAID, ITEMS_SPOILED,
        PRESTIGE_COMPLETED, TROPHY_SPECIES, TROPHY_RECORDS, TROPHY_SETS_COMPLETE, DECOR_BOUGHT,
        MACHINES_BROKEN, MACHINES_SLOWED, MACHINES_REPAIRED, REPAIR_SPENT,
        LOANS_TAKEN, LOAN_INTEREST_ACCRUED, LOAN_REPAID, LOAN_COLLECTED, COIN_GOALS_REACHED,
    )
}

/** Personal-best specimen mounted on the museum board for one species. */
data class TrophyRecord(
    val sizePermille: Int,
    val valueCoins: Long,
    val tick: Long,
)

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
    /** Lifetime XP toward staff levels (Phase 16). */
    var xp = 0
    /** Derived from XP; starts at 1. */
    var level = 1
    /** Hire-time trait IDs from content staffProgression.traits. */
    val traits = mutableListOf<String>()
    /** When false the worker is hired but off shift (no AI, no wage) — Phase 17. */
    var onShift = true
    /** Equipped staff gear: loadout slot id → upgrade id (Phase 19). */
    val equipment = linkedMapOf<String, String>()

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
    /** Good reel window start; widened by timing_window upgrades. */
    var timingWindowStartPermille: Int = 650,
    var timingWindowEndPermille: Int = 850,
    var timingPerfectStartPermille: Int = 720,
    var timingPerfectEndPermille: Int = 780,
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
    /** Preferred bait id for new casts (null = auto first available). */
    var preferredBaitId: String? = null
    /** Bait attached to the active cast; consumed on a successful catch. */
    var activeBaitId: String? = null
}

/** Reel timing result for a cast (Phase 8). */
enum class TimingTier {
    MISS, GOOD, PERFECT;

    val wire: String get() = when (this) {
        MISS -> "miss"
        GOOD -> "good"
        PERFECT -> "perfect"
    }

    companion object {
        fun fromWire(s: String): TimingTier? = when (s) {
            "miss" -> MISS
            "good" -> GOOD
            "perfect" -> PERFECT
            else -> null
        }
    }
}

class FishingSpotState(val zoneId: String, var stock: Int) {
    var regenProgress = 0
}

enum class MachineStatus { WAITING_FOR_INPUT, PROCESSING, OUTPUT_FULL, PAUSED, LOCKED, NEEDS_REPAIR }

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
    /**
     * Ephemeral (not snapshotted): consecutive idle ticks while WAITING_FOR_INPUT / OUTPUT_FULL
     * during a rush — Phase 20 automation alerts.
     */
    var idleTicks = 0
    /** Ephemeral: tick when the last idle alert fired for this station (0 = never). */
    var lastIdleAlertTick = 0L
    /** Phase 25: hard break — no new batches until repaired. */
    var broken = false
    /** Phase 25: process duration mult applies while tick < this (0 = none). */
    var slowUntilTick = 0L
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

/** Posted board offer waiting to be accepted. */
data class ContractOffer(
    val id: String,
    val templateId: String,
    val itemId: String,
    val quantity: Int,
    val durationTicks: Int,
    val payout: Long,
    val penalty: Long,
)

/** Accepted timed delivery job. */
class ContractState(
    val id: String,
    val templateId: String,
    val itemId: String,
    val quantity: Int,
    var delivered: Int,
    var deadlineTick: Long,
    /** Mutable so standing orders can escalate mid-run (Phase 14). */
    var payout: Long,
    var penalty: Long,
)

class GameState(
    var harborId: String,
    val rng: Prng,
    val player: PlayerState,
    var fishingSpots: List<FishingSpotState>,
    var machines: List<MachineState>,
    var counters: List<CounterState>,
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
    val completedPrestige = TreeSet<String>()
    val unlockedCosmetics = TreeSet<String>()
    /** Phase 23 owned shop decor (placable cosmetics). */
    val ownedDecor = TreeSet<String>()
    /** Best catch per species id (museum / trophy board). */
    val trophies = TreeMap<String, TrophyRecord>()
    /** Phase 27 lifetime catches per species id (telemetry v2). */
    val speciesCatches = TreeMap<String, Long>()
    val stats = TreeMap<String, Long>()
    /** Parked harbor worlds keyed by harbor id (active harbor is live on this state). */
    val harborStashes = TreeMap<String, HarborWorldStash>()

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

    /** Subtracted from content maintenance rate (from upgrades; rebuilt on load). */
    var maintenanceDiscountPerStation = 0
    /** Multiplies bag fish spoil period (1000 = content default; rebuilt on load). */
    var bagSpoilPeriodMultPermille = 1000
    /** Multiplies counter product spoil period (1000 = content default; rebuilt on load). */
    var counterSpoilPeriodMultPermille = 1000
    /** Permanent catch-speed floor from prestige (rebuilt on load). */
    var prestigeCatchSpeedPermille = 1000
    /** Permanent sale price multiplier from prestige (rebuilt on load). */
    var prestigePriceBonusPermille = 1000
    /** Progress toward next station upkeep (not persisted). */
    var maintenanceAccrualTicks = 0
    /** Progress toward next counter spoilage (not persisted). */
    var counterSpoilAccrualTicks = 0
    /** Progress toward next bag fish spoilage (not persisted). */
    var bagSpoilAccrualTicks = 0
    /** Progress toward next machine wear check (not persisted). */
    var wearAccrualTicks = 0
    /** Progress toward next overdue loan collection (not persisted). */
    var loanCollectionAccrualTicks = 0

    /** Phase 26 outstanding loan repayment (0 = none). */
    var loanOwed = 0L
    /** Tick when the outstanding loan becomes overdue (0 when no loan). */
    var loanDueTick = 0L
    /** Phase 26 player coin goal (0 = none). */
    var coinGoal = 0L
    /** True after [coinGoal] has been celebrated for the current target. */
    var coinGoalCelebrated = false

    /** Tick when the contract board next refreshes (0 = needs immediate refresh when unlocked). */
    var contractBoardRefreshAt = 0L
    val contractOffers = mutableListOf<ContractOffer>()
    val activeContracts = mutableListOf<ContractState>()

    /** Purchase receipts keyed by client request ID: a retried request returns the same receipt. */
    val purchaseReceipts = TreeMap<String, Receipt>()

    /** Recent coin movements for debugging discrepancies (bounded). */
    val ledger = ArrayDeque<Receipt>()

    fun stat(key: String) = stats[key] ?: 0L
    fun bumpStat(key: String, by: Long = 1) {
        stats[key] = SafeMath.add(stat(key), by)
    }

    /** Record a landed catch for telemetry species shares (Phase 27). */
    fun recordSpeciesCatch(speciesId: String, by: Long = 1) {
        if (by <= 0L) return
        speciesCatches[speciesId] = SafeMath.add(speciesCatches[speciesId] ?: 0L, by)
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
                timingWindowStartPermille = content.player.timingWindowStartPermille,
                timingWindowEndPermille = content.player.timingWindowEndPermille,
                timingPerfectStartPermille = content.player.timingPerfectStartPermille,
                timingPerfectEndPermille = content.player.timingPerfectEndPermille,
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
    /** Put a hired worker on or off shift (Phase 17). */
    data class SetWorkerShift(val workerId: String, val onShift: Boolean) : Command
    /** Equip an owned staff-gear upgrade onto a worker (Phase 19). */
    data class AssignWorkerGear(val workerId: String, val upgradeId: String) : Command
    /** Remove gear from a worker loadout slot (Phase 19). */
    data class UnequipWorkerGear(val workerId: String, val slotId: String) : Command
    /** Accept a posted contract offer; [requestId] makes retries idempotent. */
    data class AcceptContract(val offerId: String, val requestId: String) : Command
    /** Deliver matching items from the player bag toward an active contract. */
    data class DeliverContract(val contractId: String, val requestId: String) : Command
    /** Travel to another harbor; [requestId] makes retries idempotent. */
    data class TravelToHarbor(val harborId: String, val requestId: String) : Command
    /** Buy a bait pack at a kiosk zone; [requestId] makes retries idempotent. */
    data class BuyBait(val baitId: String, val requestId: String) : Command
    /** Set preferred bait for future casts, or null to clear (auto). */
    data class SelectBait(val baitId: String?) : Command
    /** Buy shop decor; [requestId] makes retries idempotent (Phase 23). */
    data class PurchaseDecor(val decorId: String, val requestId: String) : Command
    /** Pay to clear machine wear (Phase 25); [requestId] makes retries idempotent. */
    data class RepairMachine(val stationId: String, val requestId: String) : Command
    /** Take the content bank loan (Phase 26); [requestId] makes retries idempotent. */
    data class TakeLoan(val requestId: String) : Command
    /** Repay as much outstanding loan as coins allow (Phase 26). */
    data class RepayLoan(val requestId: String) : Command
    /** Set or clear a coin goal from bank presets (0 clears). */
    data class SetCoinGoal(val amount: Long) : Command
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
        val timingTier: TimingTier = TimingTier.MISS,
        val rareUpgrade: Boolean = false,
        val sizePermille: Int = 0,
        val valueCoins: Long = 0,
        val personalBest: Boolean = false,
    ) : GameEvent
    data class TrophyRecorded(
        override val tick: Long,
        val speciesId: String,
        val sizePermille: Int,
        val valueCoins: Long,
        val personalBest: Boolean,
    ) : GameEvent
    data class TrophySetCompleted(override val tick: Long, val setId: String) : GameEvent
    /** Soft feedback when a fishing spot's stock hits zero. */
    data class FishingSpotDepleted(override val tick: Long, val zoneId: String) : GameEvent
    data class ItemsTransferred(override val tick: Long, val from: String, val to: String, val itemId: String, val count: Int) : GameEvent
    data class BatchStarted(override val tick: Long, val batchId: String, val stationId: String, val recipeId: String) : GameEvent
    data class BatchCompleted(override val tick: Long, val batchId: String, val stationId: String) : GameEvent
    data class CustomerArrived(override val tick: Long, val customerId: String, val counterId: String) : GameEvent
    data class CustomerLeft(override val tick: Long, val customerId: String, val paid: Boolean) : GameEvent
    data class RushStarted(override val tick: Long, val rushId: String, val name: String) : GameEvent
    data class RushEnded(override val tick: Long, val rushId: String, val name: String) : GameEvent
    /** Phase 24 seasonal overlay became active on the sim clock. */
    data class SeasonalEventStarted(override val tick: Long, val eventId: String, val name: String) : GameEvent
    data class SeasonalEventEnded(override val tick: Long, val eventId: String, val name: String) : GameEvent
    /** Station stayed WAITING_FOR_INPUT / OUTPUT_FULL too long during a rush (Phase 20). */
    data class MachineIdleAlert(
        override val tick: Long,
        val stationId: String,
        val machineId: String,
        val reason: String,
    ) : GameEvent
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
    data class DecorPurchased(override val tick: Long, val decorId: String, val receipt: Receipt, val replayed: Boolean) : GameEvent
    data class DecorPurchaseRejected(override val tick: Long, val decorId: String, val requestId: String, val reason: String) : GameEvent
    data class MachineBroke(override val tick: Long, val stationId: String, val machineId: String) : GameEvent
    data class MachineSlowed(override val tick: Long, val stationId: String, val machineId: String, val untilTick: Long) : GameEvent
    data class MachineRepaired(
        override val tick: Long,
        val stationId: String,
        val machineId: String,
        val receipt: Receipt,
        val replayed: Boolean,
    ) : GameEvent
    data class MachineRepairRejected(
        override val tick: Long,
        val stationId: String,
        val requestId: String,
        val reason: String,
    ) : GameEvent
    data class LoanTaken(
        override val tick: Long,
        val principal: Long,
        val owed: Long,
        val dueTick: Long,
        val receipt: Receipt,
        val replayed: Boolean,
    ) : GameEvent
    data class LoanRepaid(
        override val tick: Long,
        val paid: Long,
        val remaining: Long,
        val receipt: Receipt,
        val replayed: Boolean,
    ) : GameEvent
    data class LoanCollected(override val tick: Long, val seized: Long, val remaining: Long) : GameEvent
    data class LoanRejected(override val tick: Long, val requestId: String, val reason: String) : GameEvent
    data class CoinGoalSet(override val tick: Long, val amount: Long) : GameEvent
    data class CoinGoalReached(override val tick: Long, val amount: Long, val coins: Long) : GameEvent
    data class WorkerHired(override val tick: Long, val roleId: String, val receipt: Receipt, val replayed: Boolean) : GameEvent
    data class WorkerLeveledUp(
        override val tick: Long,
        val workerId: String,
        val roleId: String,
        val level: Int,
    ) : GameEvent
    data class WorkerShiftChanged(
        override val tick: Long,
        val workerId: String,
        val roleId: String,
        val onShift: Boolean,
    ) : GameEvent
    data class WorkerGearAssigned(
        override val tick: Long,
        val workerId: String,
        val upgradeId: String,
        val slotId: String,
    ) : GameEvent
    data class WorkerGearUnequipped(
        override val tick: Long,
        val workerId: String,
        val upgradeId: String,
        val slotId: String,
    ) : GameEvent
    data class HireRejected(override val tick: Long, val roleId: String, val requestId: String, val reason: String) : GameEvent
    data class LeaseExpired(override val tick: Long, val workerId: String, val itemId: String?, val sourceInvId: String?) : GameEvent
    data class WagesPaid(override val tick: Long, val workers: Int, val coins: Long) : GameEvent
    data class QuestCompleted(
        override val tick: Long,
        val questId: String,
        val coinsRewarded: Long = 0,
        val unlockUpgrades: List<String> = emptyList(),
    ) : GameEvent
    data class TutorialAdvanced(override val tick: Long, val stepIndex: Int) : GameEvent
    data class CheckpointRequested(override val tick: Long, val reason: String) : GameEvent
    data class ContractBoardRefreshed(override val tick: Long, val offerIds: List<String>) : GameEvent
    data class ContractAccepted(
        override val tick: Long,
        val contractId: String,
        val offerId: String,
        val receipt: Receipt,
        val replayed: Boolean,
    ) : GameEvent
    data class ContractDelivered(
        override val tick: Long,
        val contractId: String,
        val count: Int,
        val completed: Boolean,
        val receipt: Receipt,
        val replayed: Boolean,
    ) : GameEvent
    data class ContractCompleted(
        override val tick: Long,
        val contractId: String,
        val templateId: String,
        val payout: Long,
    ) : GameEvent
    data class ContractFailed(
        override val tick: Long,
        val contractId: String,
        val templateId: String,
        val penaltyPaid: Long,
    ) : GameEvent
    data class ContractRejected(
        override val tick: Long,
        val referenceId: String,
        val requestId: String,
        val reason: String,
    ) : GameEvent
    data class HarborTraveled(
        override val tick: Long,
        val fromHarborId: String,
        val toHarborId: String,
        val receipt: Receipt,
        val replayed: Boolean,
    ) : GameEvent
    data class TravelRejected(
        override val tick: Long,
        val harborId: String,
        val requestId: String,
        val reason: String,
    ) : GameEvent
    data class BaitPurchased(
        override val tick: Long,
        val baitId: String,
        val quantity: Int,
        val receipt: Receipt,
        val replayed: Boolean,
    ) : GameEvent
    data class BaitPurchaseRejected(
        override val tick: Long,
        val baitId: String,
        val requestId: String,
        val reason: String,
    ) : GameEvent
    data class MaintenancePaid(
        override val tick: Long,
        val stations: Int,
        val coins: Long,
    ) : GameEvent
    data class ItemsSpoiled(
        override val tick: Long,
        /** "counter" or "bag" */
        val location: String,
        val items: List<ItemQuantity>,
    ) : GameEvent
    data class PrestigeUnlocked(
        override val tick: Long,
        val prestigeId: String,
        val coinsRewarded: Long = 0,
        val cosmetic: String? = null,
        val catchSpeedPermille: Int = 0,
        val priceBonusPermille: Int = 0,
    ) : GameEvent
}
