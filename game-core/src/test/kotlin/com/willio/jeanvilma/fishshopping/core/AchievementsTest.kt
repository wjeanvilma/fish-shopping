package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.AchievementsShip
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 11 — achievements engine. */
class AchievementsTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/achievements.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/achievements.json").readText()).jsonObject
        assertEquals(AchievementsShip.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AchievementsShip.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(AchievementsShip.ACHIEVEMENT_COUNT, json.getValue("achievementCount").jsonPrimitive.content.toInt())
        assertEquals(14, json.getValue("entries").jsonArray.size)
        assertEquals(14, Shared.content.achievements.entries.size)
        for (id in AchievementsShip.ENTRY_IDS) {
            assertTrue(id, Shared.content.achievementsById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(11, listing.getValue("achievementsPhase").jsonPrimitive.content.toInt())
        assertEquals(AchievementsShip.CATALOG, listing.getValue("achievementsCatalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(14, dod.getValue("quotas").jsonObject.getValue("achievements").jsonPrimitive.int)
        val screens = dod.getValue("screensPresent").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(screens.contains("achievements"))
    }

    @Test
    fun parityFixtureGrantsFirstCatchAndSale() {
        val fx = Json.parseToJsonElement(File(root, AchievementsShip.PARITY_FIXTURE).readText()).jsonObject
        val setup = fx.getValue("setup").jsonObject
        val expect = fx.getValue("expect").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(
                Shared.content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        for ((stat, value) in setup.getValue("stats").jsonObject) {
            sim.state.stats[stat] = value.jsonPrimitive.long
        }
        val before = sim.state.coins
        val events = sim.checkedStep()
        for (idEl in expect.getValue("unlocked").jsonArray) {
            val id = idEl.jsonPrimitive.content
            assertTrue(id in sim.state.unlockedAchievements)
            assertTrue(events.filterIsInstance<GameEvent.AchievementUnlocked>().any { it.achievementId == id })
        }
        assertEquals(before + expect.getValue("coinsRewarded").jsonPrimitive.long, sim.state.coins)
        assertEquals(
            expect.getValue("achievementsUnlockedStat").jsonPrimitive.long,
            sim.state.stat(Stats.ACHIEVEMENTS_UNLOCKED),
        )
        val view = sim.view()
        assertEquals(expect.getValue("unlocked").jsonArray.size, view.unlockedAchievementsCount)
        assertEquals(expect.getValue("achievementCount").jsonPrimitive.int, view.achievements.size)
        assertEquals("unlocked", view.achievements.first { it.id == "achievement.first_catch" }.status)
        assertEquals("active", view.achievements.first { it.id == "achievement.pier_regular" }.status)

        val coinsAfter = sim.state.coins
        sim.checkedStep()
        assertEquals(coinsAfter, sim.state.coins)
        assertEquals(
            expect.getValue("achievementsUnlockedStat").jsonPrimitive.long,
            sim.state.stat(Stats.ACHIEVEMENTS_UNLOCKED),
        )
    }
}
