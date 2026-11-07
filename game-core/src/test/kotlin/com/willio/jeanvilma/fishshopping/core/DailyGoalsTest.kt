package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem
import com.willio.jeanvilma.fishshopping.core.ship.OfflineJournalDailyGoals
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 18 — offline journal + daily goals. */
class DailyGoalsTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/offline-journal-daily-goals.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, OfflineJournalDailyGoals.CATALOG).readText()).jsonObject
        assertEquals(OfflineJournalDailyGoals.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(OfflineJournalDailyGoals.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertTrue(Shared.content.dailyGoals.objectives.size >= 6)
        assertEquals(3, Shared.content.dailyGoals.boardSlots)
        for (id in OfflineJournalDailyGoals.OBJECTIVE_IDS) {
            assertTrue(id, Shared.content.dailyObjectivesById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(18, listing.getValue("offlineJournalDailyGoalsPhase").jsonPrimitive.content.toInt())
        assertEquals(
            OfflineJournalDailyGoals.CATALOG,
            listing.getValue("offlineJournalDailyGoalsCatalog").jsonPrimitive.content,
        )
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(6, dod.getValue("quotas").jsonObject.getValue("dailyObjectives").jsonPrimitive.int)
    }

    @Test
    fun syncClaimAndJournal() {
        val fx = Json.parseToJsonElement(File(root, OfflineJournalDailyGoals.PARITY_FIXTURE).readText()).jsonObject
        val expect = fx.getValue("expect").jsonObject
        val content = Shared.content
        val epoch = fx.getValue("epochMs").jsonPrimitive.long
        val objectiveId = fx.getValue("objectiveId").jsonPrimitive.content
        val objective = content.dailyObjectivesById.getValue(objectiveId)

        val sim = Simulation(
            content,
            GameState.newGame(
                content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        sim.step(listOf(Command.SyncWallClock(epoch)))
        assertEquals(expect.getValue("dayId").jsonPrimitive.long, DailyGoalsSystem.currentDayId(content, sim.state))
        assertEquals(expect.getValue("streakAfterSync").jsonPrimitive.int, DailyGoalsSystem.streak(sim.state))

        // Force catch_five onto slot 0 for a deterministic claim path.
        val idx = content.dailyGoals.objectives.indexOfFirst { it.id == objectiveId }
        assertTrue(idx >= 0)
        sim.state.stats[DailyGoalsSystem.boardSlotKey(0)] = (idx + 1).toLong()
        for (i in 1 until content.dailyGoals.boardSlots) {
            sim.state.stats.remove(DailyGoalsSystem.boardSlotKey(i))
        }

        val baseline = DailyGoalsSystem.progress(content, sim.state, objective)
        sim.state.stats[Stats.FISH_CAUGHT] =
            sim.state.stat(Stats.FISH_CAUGHT) + (objective.goal.atLeast - baseline)
        assertTrue(DailyGoalsSystem.isComplete(content, sim.state, objective))

        sim.step(listOf(Command.ClaimDailyGoal(objectiveId, "claim-daily-1")))
        assertTrue(DailyGoalsSystem.isClaimed(content, sim.state, objective))
        val view = sim.view()
        assertEquals(1, view.dailyLoginStreak)
        assertTrue(view.dailyGoals.any { it.objectiveId == objectiveId && it.claimed })

        val report = OfflineReport(
            elapsedMillis = 60_000,
            ticksCredited = 100,
            capped = false,
            coinsDelta = 12,
            fishCaught = 2,
            sales = 1,
            itemsSold = 1,
            workerFishCaught = 0,
            workerItemsMoved = 0,
        )
        val lines = DailyGoalsSystem.journalLines(content, sim.state, report)
        assertTrue(lines.any { it.contains("fish") || it.contains("sales") || it.contains("streak") })
    }
}
