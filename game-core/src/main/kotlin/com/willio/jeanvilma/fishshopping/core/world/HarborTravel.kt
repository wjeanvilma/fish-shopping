package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.sim.CounterState
import com.willio.jeanvilma.fishshopping.core.sim.CustomerState
import com.willio.jeanvilma.fishshopping.core.sim.FishingSpotState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MachineState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.WorkerState

/**
 * Per-harbor world parked when the player travels elsewhere (Phase 18).
 * Meta progression (coins, upgrades, quests, bag, contracts) stays on [GameState].
 */
class HarborWorldStash(
    val fishingSpots: List<FishingSpotState>,
    val machines: List<MachineState>,
    val counters: List<CounterState>,
    val customers: MutableList<CustomerState>,
    val workers: MutableList<WorkerState>,
    val customerSpawnProgress: Int,
    val playerX: Int,
    val playerZ: Int,
    val playerFacingX: Int,
    val playerFacingZ: Int,
    val playerZoneId: String?,
)

/**
 * Harbor map travel. Unlocks via [HarborDef.requires]; each visit stashes the
 * left-behind layout so machines, stock, customers, and staff resume on return.
 */
object HarborTravelSystem {

    fun unlocked(content: ContentPack, s: GameState, def: HarborDef): Boolean =
        def.requires.all {
            it in s.ownedUpgrades || it in s.completedQuests || it in s.completedPrestige
        }

    fun missingRequirement(content: ContentPack, s: GameState, def: HarborDef): String? {
        val missing = def.requires.firstOrNull {
            it !in s.ownedUpgrades && it !in s.completedQuests && it !in s.completedPrestige
        } ?: return null
        return content.upgradesById[missing]?.name
            ?: content.questsById[missing]?.name
            ?: content.prestigeMilestonesById[missing]?.name
            ?: missing
    }

    fun travel(ctx: StepContext, harborId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { existing ->
            ctx.emit(
                GameEvent.HarborTraveled(
                    s.tick, existing.reference, harborId, existing, replayed = true,
                ),
            )
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.TravelRejected(s.tick, harborId, requestId, reason))
        }
        if (harborId !in ctx.content.harborsById) {
            reject("Unknown harbor")
            return
        }
        if (harborId == s.harborId) {
            reject("Already here")
            return
        }
        val target = ctx.content.harborsById.getValue(harborId)
        if (!unlocked(ctx.content, s, target)) {
            reject("Requires: ${missingRequirement(ctx.content, s, target)}")
            return
        }

        val fromId = s.harborId
        s.harborStashes[fromId] = capture(s)
        val parked = s.harborStashes.remove(harborId)
        s.harborId = harborId
        if (parked != null) {
            restore(s, parked)
        } else {
            installFresh(ctx.content, s, target)
        }
        clearTransientPlayer(s)

        val receipt = Receipt(s.newId("travel"), "harbor_travel", 0, s.tick, harborId)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        s.bumpStat(Stats.HARBORS_TRAVELED)
        ctx.emit(GameEvent.HarborTraveled(s.tick, fromId, harborId, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "travel"))
    }

    fun capture(s: GameState) = HarborWorldStash(
        fishingSpots = s.fishingSpots,
        machines = s.machines,
        counters = s.counters,
        customers = s.customers.toMutableList(),
        workers = s.workers.toMutableList(),
        customerSpawnProgress = s.customerSpawnProgress,
        playerX = s.player.x,
        playerZ = s.player.z,
        playerFacingX = s.player.facingX,
        playerFacingZ = s.player.facingZ,
        playerZoneId = s.player.zoneId,
    )

    fun restore(s: GameState, stash: HarborWorldStash) {
        s.fishingSpots = stash.fishingSpots
        s.machines = stash.machines
        s.counters = stash.counters
        s.customers.clear()
        s.customers.addAll(stash.customers)
        s.workers.clear()
        s.workers.addAll(stash.workers)
        s.customerSpawnProgress = stash.customerSpawnProgress
        s.player.x = stash.playerX
        s.player.z = stash.playerZ
        s.player.facingX = stash.playerFacingX
        s.player.facingZ = stash.playerFacingZ
        s.player.zoneId = stash.playerZoneId
    }

    fun installFresh(content: ContentPack, s: GameState, harbor: HarborDef) {
        val units = content::carryUnits
        s.fishingSpots = harbor.fishingSpots.map { FishingSpotState(it.zone, it.stockMax) }
        s.machines = harbor.stations.map { st ->
            val def = content.machinesById.getValue(st.machine)
            MachineState(
                st.id, st.machine,
                Inventory("inv.${st.id}.input", def.inputCapacityUnits, units),
                Inventory("inv.${st.id}.output", def.outputCapacityUnits, units),
            )
        }
        s.counters = harbor.counters.map {
            CounterState(it.id, Inventory("inv.${it.id}", it.capacityUnits, units))
        }
        s.customers.clear()
        s.workers.clear()
        s.customerSpawnProgress = 0
        s.player.x = harbor.playerSpawn.x
        s.player.z = harbor.playerSpawn.z
        s.player.zoneId = null
    }

    private fun clearTransientPlayer(s: GameState) {
        val p = s.player
        p.inputX = 0
        p.inputZ = 0
        p.transferCooldown = 0
        p.fishingSpecies = null
        p.fishingProgress = 0
        p.fishingCatchTicks = 0
        p.reelAttemptedThisCast = false
        p.reelRequested = false
    }
}
