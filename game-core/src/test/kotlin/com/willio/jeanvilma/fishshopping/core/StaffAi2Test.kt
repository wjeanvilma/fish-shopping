package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StaffAi2
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
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

/** Finish 4.0 Phase 19 — staff/worker AI depth wave 2. */
class StaffAi2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, StaffAi2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, StaffAi2.CATALOG).readText()).jsonObject
        assertEquals(StaffAi2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StaffAi2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(StaffAi2.MARKER, json.getValue("staffAi2Marker").jsonPrimitive.content)
        assertEquals(StaffAi2.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 25)
        assertEquals(
            StaffAi2.DEPTH_BEHAVIOR_COUNT,
            json.getValue("depthBehaviors").jsonArray.size,
        )
        assertEquals(
            StaffAi2.DEPTH_STAT_COUNT,
            json.getValue("depthStats").jsonArray.size,
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(19, listing.getValue("staffAi2Phase").jsonPrimitive.content.toInt())
        assertEquals(StaffAi2.CATALOG, listing.getValue("staffAi2Catalog").jsonPrimitive.content)
    }

    @Test
    fun workersContainWave2MarkersAndStats() {
        val root = repoRoot()
        val workers = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt",
        ).readText()
        for (marker in StaffAi2.KOTLIN_MARKERS) {
            assertTrue("missing marker $marker", workers.contains(marker))
        }
        for (branch in StaffAi2.DEPTH_BRANCH_IDS) {
            assertTrue("missing branch $branch", workers.contains(branch))
        }
        for (reason in StaffAi2.DECISION_REASONS) {
            assertTrue("missing reason $reason", workers.contains(reason))
        }

        assertEquals(Stats.FISHER_TROPHY_CASTS, StaffAi2.DEPTH_STATS[0])
        assertEquals(Stats.PORTER_RELAY_PICKUPS, StaffAi2.DEPTH_STATS[1])
        assertEquals(Stats.CASHIER_QUICK_TILLS, StaffAi2.DEPTH_STATS[2])
        assertTrue(Stats.ALL.contains(Stats.FISHER_TROPHY_CASTS))
        assertTrue(Stats.ALL.contains(Stats.PORTER_RELAY_PICKUPS))
        assertTrue(Stats.ALL.contains(Stats.CASHIER_QUICK_TILLS))

        val kickoff = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        val phase19 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 19 }
        assertEquals("staff-ai-2", phase19.getValue("id").jsonPrimitive.content)
        assertEquals("staffai2:validate", phase19.getValue("validate").jsonPrimitive.content)

        val wave1 = Json.parseToJsonElement(File(root, StaffAi2.EXTENDS_WORKER_AI_DEPTH).readText()).jsonObject
        assertTrue(
            wave1.getValue("kotlinWorkersPath").jsonPrimitive.content.contains("WorkerAi.kt"),
        )
    }
}
