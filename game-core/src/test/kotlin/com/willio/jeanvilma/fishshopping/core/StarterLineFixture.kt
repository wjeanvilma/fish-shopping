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
        val purchases = mutableListOf<Pair<Long, Command.PurchaseUpgrade>>()
        val s = sim.state
        val bag = s.player.bag
        val machine = s.machines.first { it.stationId == "station.cutter_1" }
        val counter = s.counters.single()
        var requestSerial = 0

        fun done() = s.tick >= TICKS
        while (!done()) {
            pilot.walkTo(-7000, 0); if (done()) break
            pilot.walkTo(-14250, 0)
            pilot.waitUntil(TICKS - s.tick.toInt()) { bag.freeUnits() == 0 }; if (done()) break
            pilot.walkTo(-7000, 0)
            pilot.walkTo(1200, -4000)
            pilot.waitUntil(TICKS - s.tick.toInt()) { bag.isEmpty() || machine.input.freeUnits() == 0 }; if (done()) break
            pilot.walkTo(3000, -6000)
            pilot.walkTo(4800, -4000)
            pilot.waitUntil(TICKS - s.tick.toInt()) { bag.freeUnits() == 0 || (machine.output.isEmpty() && machine.activeBatch == null) }
            if (done()) break
            pilot.walkTo(3000, 2750)
            pilot.waitUntil(TICKS - s.tick.toInt()) { bag.isEmpty() && counter.stock.isEmpty() && s.customers.none { it.reserved > 0 } || s.tick % 600 == 0L }
            if (done()) break
            // Buy the next affordable bag upgrade.
            val next = listOf("upgrade.bag_capacity_2", "upgrade.bag_capacity_3")
                .firstOrNull { it !in s.ownedUpgrades && s.coins >= sim.content.upgradesById.getValue(it).cost }
            if (next != null) {
                val cmd = Command.PurchaseUpgrade(next, "fixture-${++requestSerial}")
                purchases += (s.tick + 1) to cmd
                pilot.tick(Command.Move(0, 0), listOf(cmd))
            }
        }

        val commands = (pilot.recorded.map { it.first to (it.second as Command) } + purchases)
            .sortedWith(compareBy({ it.first }, { if (it.second is Command.Move) 0 else 1 }))
        val fixture = buildJsonObject {
            put("name", "starter-line")
            put("description", "Five minutes of the Sunrise Pier loop: fish, cut, stock, serve, buy bag upgrades.")
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
            is Command.SetMachinePaused -> { put("type", "set_machine_paused"); put("stationId", c.stationId); put("paused", c.paused) }
            is Command.Reel -> put("type", "reel")
        }
    }

    fun parseCommand(o: JsonObject): Command = when (o["type"]!!.jsonPrimitive.content) {
        "move" -> Command.Move(o["x"]!!.jsonPrimitive.int, o["z"]!!.jsonPrimitive.int)
        "purchase_upgrade" -> Command.PurchaseUpgrade(o["upgradeId"]!!.jsonPrimitive.content, o["requestId"]!!.jsonPrimitive.content)
        "set_machine_paused" -> Command.SetMachinePaused(o["stationId"]!!.jsonPrimitive.content, o["paused"]!!.jsonPrimitive.content == "true")
        "reel" -> Command.Reel
        else -> error("unknown command ${o["type"]}")
    }

    /** The canonical economy/task state both clients must match. */
    fun expectedState(s: GameState): JsonObject = buildJsonObject {
        put("tick", s.tick)
        put("coins", s.coins)
        put("rngState", s.rng.state)
        put("playerX", s.player.x)
        put("playerZ", s.player.z)
        put("bag", JsonObject(s.player.bag.contents().mapValues { JsonPrimitive(it.value) }))
        put("bagCapacityUnits", s.player.bag.capacityUnits)
        val cutter = s.machines.first { it.stationId == "station.cutter_1" }
        put("machineInput", JsonObject(cutter.input.contents().mapValues { JsonPrimitive(it.value) }))
        put("machineOutput", JsonObject(cutter.output.contents().mapValues { JsonPrimitive(it.value) }))
        put("activeBatchRemaining", cutter.activeBatch?.remainingTicks ?: -1)
        put("counterStock", JsonObject(s.counters.single().stock.contents().mapValues { JsonPrimitive(it.value) }))
        put("customers", s.customers.size)
        put("fishingStock", s.fishingSpots.single().stock)
        put("ownedUpgrades", buildJsonArray { s.ownedUpgrades.forEach { add(JsonPrimitive(it)) } })
        put("completedQuests", buildJsonArray { s.completedQuests.forEach { add(JsonPrimitive(it)) } })
        put("tutorialIndex", s.tutorialIndex)
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
