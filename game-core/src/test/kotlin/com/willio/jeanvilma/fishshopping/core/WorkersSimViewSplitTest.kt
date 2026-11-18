package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.WorkersSimViewSplit
import com.willio.jeanvilma.fishshopping.core.workers.WorkerDecisionHooks
import com.willio.jeanvilma.fishshopping.core.workers.WorkerDecisionTrace
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 5 — Workers.kt + SimView.kt split + AI hooks. */
class WorkersSimViewSplitTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/workers-simview-split.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, WorkersSimViewSplit.CATALOG).readText()).jsonObject
        assertEquals(WorkersSimViewSplit.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(WorkersSimViewSplit.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(WorkersSimViewSplit.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            WorkersSimViewSplit.MARKER,
            json.getValue("workersSimViewSplitMarker").jsonPrimitive.content,
        )
        assertEquals(
            WorkersSimViewSplit.WORKERS_MAX_LINES,
            json.getValue("workersMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            WorkersSimViewSplit.SIM_VIEW_MAX_LINES,
            json.getValue("simViewMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            WorkersSimViewSplit.GAP_FLAG_CLOSED,
            json.getValue("gapFlagClosed").jsonPrimitive.content,
        )
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(WorkersSimViewSplit.REQUIRED_FILES, required)
    }

    @Test
    fun facadesSlimAndDecisionHooksWork() {
        val workers = File(root, WorkersSimViewSplit.WORKERS_PATH)
        val simView = File(root, WorkersSimViewSplit.SIM_VIEW_PATH)
        assertTrue(workers.isFile)
        assertTrue(simView.isFile)
        assertTrue(WorkersSimViewSplit.workersSlim(workers.readLines().size))
        assertTrue(WorkersSimViewSplit.simViewSlim(simView.readLines().size))
        assertTrue(workers.readLines().size < 1638)
        assertTrue(simView.readLines().size < 1517)

        for (name in WorkersSimViewSplit.REQUIRED_FILES) {
            assertTrue("missing $name", File(root, name).isFile)
        }

        val workersBody = workers.readText()
        assertTrue(workersBody.contains("WorkerAi.stepFisher"))
        assertFalse(workersBody.contains("fun stepFisher"))
        assertFalse(workersBody.contains("fun findHaul"))

        val simBody = simView.readText()
        assertTrue(simBody.contains("fun Simulation.view"))
        assertFalse(simBody.contains("data class WorkerView"))

        WorkerDecisionHooks.clear()
        WorkerDecisionHooks.record(
            WorkerDecisionTrace(
                workerId = "w1",
                role = "porter",
                kind = "haul",
                reason = "best_score",
                score = 42L,
                candidatesConsidered = 3,
                tick = 10L,
            ),
        )
        assertEquals("best_score", WorkerDecisionHooks.lastForWorker("w1")?.reason)
        assertEquals(1, WorkerDecisionHooks.lastTraces.size)

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-4.0-kickoff.json").readText(),
        ).jsonObject
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject
                .getValue("workersSimViewSplitIncomplete").jsonPrimitive.content.toBoolean(),
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(5, listing.getValue("workersSimViewSplitPhase").jsonPrimitive.content.toInt())
        assertEquals(
            WorkersSimViewSplit.CATALOG,
            listing.getValue("workersSimViewSplitCatalog").jsonPrimitive.content,
        )
        assertTrue(File(root, WorkersSimViewSplit.PARITY_FIXTURE).isFile)
    }
}
