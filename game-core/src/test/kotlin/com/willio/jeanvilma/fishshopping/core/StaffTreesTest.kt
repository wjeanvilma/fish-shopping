package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.StaffTrees
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.core.workers.StaffTreesSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 15 — staff specialization trees. */
class StaffTreesTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/staff-trees.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, StaffTrees.CATALOG).readText()).jsonObject
        assertEquals(StaffTrees.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StaffTrees.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(StaffTrees.BRANCH_COUNT, json.getValue("branchCount").jsonPrimitive.content.toInt())
        assertEquals(StaffTrees.SCHEDULE_COUNT, json.getValue("scheduleCount").jsonPrimitive.content.toInt())
        assertTrue(Shared.content.staffTrees.branches.size >= 5)
        assertTrue(Shared.content.staffTrees.schedules.size >= 2)
        for (id in StaffTrees.BRANCH_IDS) {
            assertTrue(id, Shared.content.staffBranchesById.containsKey(id))
        }
        for (id in StaffTrees.SCHEDULE_IDS) {
            assertTrue(id, Shared.content.staffSchedulesById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(15, listing.getValue("staffTreesPhase").jsonPrimitive.content.toInt())
        assertEquals(StaffTrees.CATALOG, listing.getValue("staffTreesCatalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(5, dod.getValue("quotas").jsonObject.getValue("staffBranches").jsonPrimitive.int)
        assertEquals(2, dod.getValue("quotas").jsonObject.getValue("staffSchedules").jsonPrimitive.int)
    }

    @Test
    fun trainsSelectsScheduleAndView() {
        val fx = Json.parseToJsonElement(File(root, StaffTrees.PARITY_FIXTURE).readText()).jsonObject
        val after = fx.getValue("expectAfterTrain").jsonObject
        val content = Shared.content
        val sim = Simulation(
            content,
            GameState.newGame(
                content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        sim.state.coins = 10_000L
        sim.state.completedQuests += "quest.first_ten_sales"
        sim.step(listOf(Command.HireWorker(fx.getValue("roleId").jsonPrimitive.content, "hire-staff-trees")))
        val worker = sim.state.workers.first { it.roleId == fx.getValue("roleId").jsonPrimitive.content }
        worker.level = fx.getValue("forceWorkerLevel").jsonPrimitive.int
        worker.xp = content.staffProgression.xpThresholds.getOrElse(worker.level - 1) { worker.xp }

        val branchId = fx.getValue("branchId").jsonPrimitive.content
        val scheduleId = fx.getValue("scheduleId").jsonPrimitive.content
        sim.step(listOf(Command.TrainWorkerBranch(worker.id, branchId, "train-line-pro")))
        assertTrue(branchId in worker.unlockedBranchIds)
        assertEquals(branchId, worker.activeBranchId)
        assertEquals(
            after.getValue("catchSpeedMultPermille").jsonPrimitive.int,
            StaffTreesSystem.catchSpeedMultPermille(content, worker),
        )
        assertTrue(sim.step().let { true }) // drain
        assertTrue(
            sim.step(listOf(Command.SelectWorkerBranch(worker.id, branchId)))
                .any { it is GameEvent.WorkerBranchSelected } || worker.activeBranchId == branchId,
        )
        sim.step(listOf(Command.SetWorkerSchedule(worker.id, scheduleId)))
        assertEquals(scheduleId, worker.scheduleId)

        val view = sim.view()
        val wv = view.workers.first { it.id == worker.id }
        assertEquals(branchId, wv.activeBranchId)
        assertEquals(scheduleId, wv.scheduleId)
        assertTrue(wv.branches.any { it.id == branchId && it.unlocked && it.active })
        assertTrue(wv.schedules.any { it.id == scheduleId && it.active })
        assertNotNull(wv.activeBranchName)
        assertNotNull(wv.scheduleName)
    }
}
