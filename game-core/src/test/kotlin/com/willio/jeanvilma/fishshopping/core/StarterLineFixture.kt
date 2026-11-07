package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * shared/fixtures/starter-line.json: initial seed + timed commands + tick count + expected
 * canonical state. Both the Kotlin and TypeScript simulations must reproduce it exactly.
 *
 * Regenerate after an intentional rule or content change with:
 *   ./gradlew :game-core:test -PrecordFixtures=true
 * and commit the updated JSON with the change that caused it.
 */
object StarterLineFixture {
    const val PATH = "fixtures/starter-line.json"
    const val SEED = 20261105
    const val TICKS = 6000 // five minutes: the blueprint's first-session target window
    const val SNAPSHOT_PATH = "fixtures/snapshot-starter-line-t2500.json"
    const val SNAPSHOT_TICK = 2500L

    /** Plays the starter loop with a scripted player and returns the fixture JSON. */
    fun record(): String {
        val sim = newSim(SEED)
        val pilot = Autopilot(sim)
        val scripted = mutableListOf<Pair<Long, Command>>()
        val s = sim.state
        val bag = s.player.bag
        val machine = s.machines.first { it.stationId == "station.cutter_1" }
        val counter = s.counters.first { it.counterId == "counter.portions_1" }
        var requestSerial = 0
        val portion = "product.basic_portion"
        val fillet = "product.fillet"

        fun done() = s.tick >= TICKS
        fun issue(cmd: Command) {
            scripted += (s.tick + 1) to cmd
            pilot.tick(Command.Move(0, 0), listOf(cmd))
        }
        fun buyBagUpgrades() {
            // Keep cash for the Act II hire; bag_capacity_3 can wait until a porter is on payroll.
            val allowed = if (s.workers.isEmpty()) {
                listOf("upgrade.bag_capacity_2")
            } else {
                listOf("upgrade.bag_capacity_2", "upgrade.bag_capacity_3")
            }
            val next = allowed.firstOrNull {
                it !in s.ownedUpgrades && s.coins >= sim.content.upgradesById.getValue(it).cost
            } ?: return
            issue(Command.PurchaseUpgrade(next, "fixture-${++requestSerial}"))
        }
        fun fishCutStockOnce(stockCounter: Boolean) {
            if (done()) return
            pilot.walkTo(-7000, 0); if (done()) return
            pilot.walkTo(-14250, 0)
            pilot.waitUntil(TICKS - s.tick.toInt()) { bag.freeUnits() == 0 }; if (done()) return
            pilot.walkTo(-7000, 0)
            pilot.walkTo(1200, -4000)
            pilot.waitUntil(TICKS - s.tick.toInt()) { bag.isEmpty() || machine.input.freeUnits() == 0 }; if (done()) return
            pilot.walkTo(3000, -6000)
            pilot.walkTo(4800, -4000)
            pilot.waitUntil(TICKS - s.tick.toInt()) {
                bag.freeUnits() == 0 || (machine.output.isEmpty() && machine.activeBatch == null)
            }
            if (done()) return
            if (stockCounter) {
                pilot.walkTo(3000, 2750)
                pilot.waitUntil(TICKS - s.tick.toInt()) {
                    bag.isEmpty() && counter.stock.isEmpty() && s.customers.none { it.reserved > 0 } || s.tick % 600 == 0L
                }
            }
        }

        // Act I: core loop until buy-upgrade completes (tutorialIndex becomes 7 = first_contract).
        while (!done() && s.tutorialIndex < 7) {
            fishCutStockOnce(stockCounter = true)
            if (done()) break
            buyBagUpgrades()
        }

        // Act II: first contract → hire → grill pad (no staff until the job is done).
        while (!done() && s.tutorialIndex < sim.content.tutorial.size) {
            when {
                s.stat(com.willio.jeanvilma.fishshopping.core.sim.Stats.CONTRACTS_COMPLETED) == 0L -> {
                    if ("quest.first_ten_sales" !in s.completedQuests) {
                        fishCutStockOnce(stockCounter = true)
                    } else {
                        val job = s.activeContracts.firstOrNull()
                        if (job == null) {
                            val pick = s.contractOffers.firstOrNull { it.itemId == portion || it.itemId == fillet }
                                ?: s.contractOffers.firstOrNull { it.itemId.startsWith("species.") }
                                ?: s.contractOffers.firstOrNull { bag.available(it.itemId) >= it.quantity }
                            if (pick != null) {
                                issue(Command.AcceptContract(pick.id, "fixture-acc-${++requestSerial}"))
                            } else {
                                pilot.tick(Command.Move(0, 0))
                            }
                        } else {
                            val need = job.quantity - job.delivered
                            if (need > 0 && bag.available(job.itemId) > 0) {
                                issue(Command.DeliverContract(job.id, "fixture-del-${++requestSerial}"))
                            } else if (job.itemId.startsWith("species.")) {
                                if (bag.usedUnits() > 0) {
                                    pilot.walkTo(-7000, 0)
                                    if (!done()) pilot.walkTo(1200, -4000)
                                    if (!done()) {
                                        pilot.waitUntil(TICKS - s.tick.toInt()) {
                                            bag.isEmpty() || machine.input.freeUnits() == 0
                                        }
                                    }
                                }
                                if (!done()) {
                                    pilot.walkTo(-7000, 0)
                                    if (!done()) pilot.walkTo(-14250, 0)
                                    if (!done()) {
                                        pilot.waitUntil(TICKS - s.tick.toInt()) {
                                            bag.available(job.itemId) >= need || bag.freeUnits() == 0
                                        }
                                    }
                                }
                            } else if (bag.available(job.itemId) > 0) {
                                pilot.walkTo(4800, -4000)
                                if (!done()) {
                                    val before = bag.available(job.itemId)
                                    pilot.waitUntil(TICKS - s.tick.toInt()) {
                                        bag.available(job.itemId) > before ||
                                            (machine.output.isEmpty() && machine.activeBatch == null) ||
                                            bag.freeUnits() == 0
                                    }
                                }
                            } else {
                                fishCutStockOnce(stockCounter = false)
                            }
                        }
                    }
                }
                s.workers.isEmpty() -> {
                    val porter = sim.content.workersById.getValue("worker.porter")
                    if (s.coins >= porter.hireCost) {
                        issue(Command.HireWorker(porter.id, "fixture-hire-${++requestSerial}"))
                    } else {
                        fishCutStockOnce(stockCounter = true)
                    }
                }
                else -> {
                    if ("upgrade.harbor_grill" !in s.ownedUpgrades) {
                        fishCutStockOnce(stockCounter = true)
                    } else if (s.player.zoneId != "zone.grill_in" && s.tutorialIndex < sim.content.tutorial.size - 1) {
                        // Stay on the land strip (z≈0) then drop south to the grill pad.
                        pilot.walkTo(s.player.x, 0)
                        if (!done()) pilot.walkTo(10700, 0)
                        if (!done()) pilot.walkTo(10700, -4000)
                    } else if (s.player.zoneId != "zone.plot_grill") {
                        // Phase 6: finish tutorial on the expansion marker (route around machine footprints).
                        pilot.walkTo(9000, -4000)
                        if (!done()) pilot.walkTo(9000, -2500)
                        if (!done()) pilot.walkTo(12200, -2500)
                    } else {
                        pilot.tick(Command.Move(0, 0))
                    }
                }
            }
            if (s.tutorialIndex >= 7) buyBagUpgrades()
        }

        // Spend any remaining ticks on the core loop.
        while (!done()) {
            fishCutStockOnce(stockCounter = true)
            if (done()) break
            buyBagUpgrades()
        }

        val commands = (pilot.recorded.map { it.first to (it.second as Command) } + scripted)
            .sortedWith(compareBy({ it.first }, { if (it.second is Command.Move) 0 else 1 }))
        val fixture = buildJsonObject {
            put("name", "starter-line")
            put("description", "Five minutes of the Sunrise Pier loop: fish, cut, stock, serve, hire, contract, grill, bag upgrades.")
            put("contentVersion", sim.content.contentVersion)
            put("harborId", HARBOR)
            put("seed", SEED)
            put("ticks", s.tick)
            put("commands", buildJsonArray {
                commands.forEach { (tick, c) -> add(commandJson(tick, c)) }
            })
            put("expect", expectedState(s))
        }
        return prettyJson.encodeToString(JsonElement.serializer(), fixture) + "\n"
    }

    private val prettyJson = Json { prettyPrint = true }

    private fun commandJson(tick: Long, c: Command) = buildJsonObject {
        put("tick", tick)
        when (c) {
            is Command.Move -> { put("type", "move"); put("x", c.x); put("z", c.z) }
            is Command.PurchaseUpgrade -> { put("type", "purchase_upgrade"); put("upgradeId", c.upgradeId); put("requestId", c.requestId) }
            is Command.BuildPlot -> { put("type", "build_plot"); put("plotId", c.plotId); put("requestId", c.requestId) }
            is Command.SetMachinePaused -> { put("type", "set_machine_paused"); put("stationId", c.stationId); put("paused", c.paused) }
            is Command.Reel -> put("type", "reel")
            is Command.SelectMachineRecipe -> {
                put("type", "select_machine_recipe")
                put("stationId", c.stationId)
                put("recipeId", c.recipeId)
            }
            is Command.HireWorker -> {
                put("type", "hire_worker")
                put("roleId", c.roleId)
                put("requestId", c.requestId)
            }
            is Command.SetWorkerShift -> {
                put("type", "set_worker_shift")
                put("workerId", c.workerId)
                put("onShift", c.onShift)
            }
            is Command.AssignWorkerGear -> {
                put("type", "assign_worker_gear")
                put("workerId", c.workerId)
                put("upgradeId", c.upgradeId)
            }
            is Command.UnequipWorkerGear -> {
                put("type", "unequip_worker_gear")
                put("workerId", c.workerId)
                put("slotId", c.slotId)
            }
            is Command.AcceptContract -> {
                put("type", "accept_contract")
                put("offerId", c.offerId)
                put("requestId", c.requestId)
            }
            is Command.DeliverContract -> {
                put("type", "deliver_contract")
                put("contractId", c.contractId)
                put("requestId", c.requestId)
            }
            is Command.TravelToHarbor -> {
                put("type", "travel_to_harbor")
                put("harborId", c.harborId)
                put("requestId", c.requestId)
            }
            is Command.BuyBait -> {
                put("type", "buy_bait")
                put("baitId", c.baitId)
                put("requestId", c.requestId)
            }
            is Command.SelectBait -> {
                put("type", "select_bait")
                put("baitId", c.baitId)
            }
            is Command.PurchaseDecor -> {
                put("type", "purchase_decor")
                put("decorId", c.decorId)
                put("requestId", c.requestId)
            }
            is Command.GrantFullHarborUnlock -> {
                put("type", "grant_full_harbor_unlock")
                put("requestId", c.requestId)
            }
            is Command.GrantIapCosmetic -> {
                put("type", "grant_iap_cosmetic")
                put("cosmeticId", c.cosmeticId)
                put("requestId", c.requestId)
            }
            is Command.RepairMachine -> {
                put("type", "repair_machine")
                put("stationId", c.stationId)
                put("requestId", c.requestId)
            }
            is Command.TakeLoan -> {
                put("type", "take_loan")
                put("requestId", c.requestId)
            }
            is Command.RepayLoan -> {
                put("type", "repay_loan")
                put("requestId", c.requestId)
            }
            is Command.SetCoinGoal -> {
                put("type", "set_coin_goal")
                put("amount", c.amount)
            }
        }
    }

    fun parseCommand(o: JsonObject): Command = when (o["type"]!!.jsonPrimitive.content) {
        "move" -> Command.Move(o["x"]!!.jsonPrimitive.int, o["z"]!!.jsonPrimitive.int)
        "purchase_upgrade" -> Command.PurchaseUpgrade(o["upgradeId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "build_plot" -> Command.BuildPlot(o["plotId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "set_machine_paused" -> Command.SetMachinePaused(o["stationId"]!!.jsonPrimitive.content, o["paused"]!!.jsonPrimitive.content == "true")
        "reel" -> Command.Reel
        "select_machine_recipe" -> Command.SelectMachineRecipe(
            o["stationId"]!!.jsonPrimitive.content,
            o["recipeId"]?.takeIf { it !is kotlinx.serialization.json.JsonNull }?.jsonPrimitive?.content,
        )
        "hire_worker" -> Command.HireWorker(o["roleId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "set_worker_shift" -> Command.SetWorkerShift(
            o["workerId"]!!.jsonPrimitive.content,
            o["onShift"]!!.jsonPrimitive.content == "true",
        )
        "assign_worker_gear" -> Command.AssignWorkerGear(
            o["workerId"]!!.jsonPrimitive.content,
            o["upgradeId"]!!.jsonPrimitive.content,
        )
        "unequip_worker_gear" -> Command.UnequipWorkerGear(
            o["workerId"]!!.jsonPrimitive.content,
            o["slotId"]!!.jsonPrimitive.content,
        )
        "accept_contract" -> Command.AcceptContract(o["offerId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "deliver_contract" -> Command.DeliverContract(o["contractId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "travel_to_harbor" -> Command.TravelToHarbor(o["harborId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "buy_bait" -> Command.BuyBait(o["baitId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "select_bait" -> Command.SelectBait(
            o["baitId"]?.takeIf { it !is kotlinx.serialization.json.JsonNull }?.jsonPrimitive?.content,
        )
        "purchase_decor" -> Command.PurchaseDecor(o["decorId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "grant_full_harbor_unlock" -> Command.GrantFullHarborUnlock(o["requestId"]!!.jsonPrimitive.content)
        "grant_iap_cosmetic" -> Command.GrantIapCosmetic(
            o["cosmeticId"]!!.jsonPrimitive.content,
            o["requestId"]!!.jsonPrimitive.content,
        )
        "repair_machine" -> Command.RepairMachine(o["stationId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "take_loan" -> Command.TakeLoan(o["requestId"]!!.jsonPrimitive.content)
        "repay_loan" -> Command.RepayLoan(o["requestId"]!!.jsonPrimitive.content)
        "set_coin_goal" -> Command.SetCoinGoal(o["amount"]!!.jsonPrimitive.long)
        else -> error("unknown command ${o["type"]}")
    }

    /**
     * The canonical economy / unlock / tutorial / entitlement state both clients must match.
     * Phase 27 expands polish-era fields (harbor, IAP unlocks, bank, cosmetics, workers).
     */
    fun expectedState(s: GameState): JsonObject = buildJsonObject {
        put("tick", s.tick)
        put("coins", s.coins)
        put("rngState", s.rng.state)
        put("harborId", s.harborId)
        put("playerX", s.player.x)
        put("playerZ", s.player.z)
        put("bag", JsonObject(s.player.bag.contents().mapValues { JsonPrimitive(it.value) }))
        put("bagCapacityUnits", s.player.bag.capacityUnits)
        val cutter = s.machines.first { it.stationId == "station.cutter_1" }
        put("machineInput", JsonObject(cutter.input.contents().mapValues { JsonPrimitive(it.value) }))
        put("machineOutput", JsonObject(cutter.output.contents().mapValues { JsonPrimitive(it.value) }))
        put("activeBatchRemaining", cutter.activeBatch?.remainingTicks ?: -1)
        put("counterStock", JsonObject(s.counters.first { it.counterId == "counter.portions_1" }.stock.contents().mapValues { JsonPrimitive(it.value) }))
        put("customers", s.customers.size)
        put(
            "fishingStock",
            JsonObject(s.fishingSpots.associate { it.zoneId to JsonPrimitive(it.stock) }),
        )
        put("ownedUpgrades", buildJsonArray { s.ownedUpgrades.forEach { add(JsonPrimitive(it)) } })
        put("completedQuests", buildJsonArray { s.completedQuests.forEach { add(JsonPrimitive(it)) } })
        put("tutorialIndex", s.tutorialIndex)
        put("fullHarborUnlock", s.fullHarborUnlock)
        put("unlockedCosmetics", buildJsonArray { s.unlockedCosmetics.forEach { add(JsonPrimitive(it)) } })
        put("ownedDecor", buildJsonArray { s.ownedDecor.forEach { add(JsonPrimitive(it)) } })
        put("loanOwed", s.loanOwed)
        put("coinGoal", s.coinGoal)
        put("workers", s.workers.size)
        put("stats", JsonObject(s.stats.mapValues { JsonPrimitive(it.value) }))
    }
}

class StarterLineFixtureTest {

    private fun recording() = System.getProperty("recordFixtures") == "true"

    private fun fixture() = Json.parseToJsonElement(Shared.text(StarterLineFixture.PATH)).jsonObject

    /** Replays the fixture's commands up to [untilTick] with invariant checks every tick. */
    private fun replay(untilTick: Long): Simulation {
        val f = fixture()
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, f["seed"]!!.jsonPrimitive.int))
        val byTick = f["commands"]!!.jsonArray.map { it.jsonObject }
            .groupBy({ it["tick"]!!.jsonPrimitive.long }, { StarterLineFixture.parseCommand(it) })
        while (sim.state.tick < untilTick) sim.checkedStep(byTick[sim.state.tick + 1].orEmpty())
        return sim
    }

    /**
     * When recording, rewrite starter-line.json and the mid-run snapshot in one test so
     * test order cannot leave the snapshot paired with stale commands.
     */
    @Test
    fun replayMatchesSharedFixture() {
        if (recording()) {
            File(Shared.root, StarterLineFixture.PATH).writeText(StarterLineFixture.record())
            val mid = replay(StarterLineFixture.SNAPSHOT_TICK)
            File(Shared.root, StarterLineFixture.SNAPSHOT_PATH)
                .writeText(SnapshotCodec.encode(mid.content, mid.state) + "\n")
        }
        val f = fixture()
        assertEquals(Shared.content.contentVersion, f["contentVersion"]!!.jsonPrimitive.content)
        val sim = replay(f["ticks"]!!.jsonPrimitive.long)
        assertEquals(f["expect"], StarterLineFixture.expectedState(sim.state))
    }

    /**
     * The complete save snapshot mid-run (active batch, queued customers, reservations)
     * must be byte-identical across clients, so either client can load the other's saves.
     */
    @Test
    fun midRunSnapshotMatchesSharedFixture() {
        // If this test runs before replayMatchesSharedFixture while recording, still refresh
        // the snapshot from the (possibly just-written) starter-line commands.
        if (recording()) {
            val mid = replay(StarterLineFixture.SNAPSHOT_TICK)
            File(Shared.root, StarterLineFixture.SNAPSHOT_PATH)
                .writeText(SnapshotCodec.encode(mid.content, mid.state) + "\n")
        }
        val sim = replay(StarterLineFixture.SNAPSHOT_TICK)
        val encoded = SnapshotCodec.encode(sim.content, sim.state)
        val file = File(Shared.root, StarterLineFixture.SNAPSHOT_PATH)
        assertEquals(file.readText().trimEnd(), encoded)
        // And it loads back to the same bytes.
        assertEquals(encoded, SnapshotCodec.encode(sim.content, SnapshotCodec.decode(sim.content, encoded)))
    }

    @Test
    fun firstSessionPromiseIsMet() {
        // Blueprint: within five minutes catch, process, stock, get paid, and buy an upgrade.
        val expect = fixture()["expect"]!!.jsonObject
        val owned = expect["ownedUpgrades"]!!.jsonArray.map { it.jsonPrimitive.content }
        assertTrue("bought at least one upgrade", owned.isNotEmpty())
        assertTrue("finished the scripted tutorial", expect["tutorialIndex"]!!.jsonPrimitive.int >= Shared.content.tutorial.size)
    }
}
