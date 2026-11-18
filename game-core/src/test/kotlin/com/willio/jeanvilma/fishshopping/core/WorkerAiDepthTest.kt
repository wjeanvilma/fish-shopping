package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.WorkerAiDepth
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 11 — worker AI depth. */
class WorkerAiDepthTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/worker-ai-depth.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, WorkerAiDepth.CATALOG).readText()).jsonObject
        assertEquals(WorkerAiDepth.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(WorkerAiDepth.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(WorkerAiDepth.MARKER, json.getValue("workerAiDepthMarker").jsonPrimitive.content)
        assertEquals(
            WorkerAiDepth.DEPTH_BEHAVIOR_COUNT,
            json.getValue("depthBehaviors").jsonArray.size,
        )
        assertEquals(
            WorkerAiDepth.DEPTH_STAT_COUNT,
            json.getValue("depthStats").jsonArray.size,
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(11, listing.getValue("workerAiDepthPhase").jsonPrimitive.content.toInt())
        assertEquals(WorkerAiDepth.CATALOG, listing.getValue("workerAiDepthCatalog").jsonPrimitive.content)
    }

    @Test
    fun workersContainDepthMarkersAndStats() {
        val root = repoRoot()
        // Finish 4.0 Phase 19 soft-floor: wave-1 markers live in WorkerAi.kt after the Phase 5 split.
        val workers = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt",
        ).readText()
        for (marker in WorkerAiDepth.KOTLIN_MARKERS) {
            assertTrue("missing marker $marker", workers.contains(marker))
        }
        for (branch in WorkerAiDepth.DEPTH_BRANCH_IDS) {
            assertTrue("missing branch $branch", workers.contains(branch))
        }

        assertEquals(Stats.SUPERVISOR_PATROLS, WorkerAiDepth.DEPTH_STATS[0])
        assertEquals(Stats.GREETER_WELCOMES, WorkerAiDepth.DEPTH_STATS[1])
        assertEquals(Stats.ICE_RUNNER_MULTI_PICKUPS, WorkerAiDepth.DEPTH_STATS[2])
        assertTrue(Stats.ALL.contains(Stats.SUPERVISOR_PATROLS))
        assertTrue(Stats.ALL.contains(Stats.GREETER_WELCOMES))
        assertTrue(Stats.ALL.contains(Stats.ICE_RUNNER_MULTI_PICKUPS))

        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 11,
        )
        val phase11 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 11 }
        assertEquals("worker-ai-depth", phase11.getValue("id").jsonPrimitive.content)
        assertEquals("workerai:validate", phase11.getValue("validate").jsonPrimitive.content)
    }
}
