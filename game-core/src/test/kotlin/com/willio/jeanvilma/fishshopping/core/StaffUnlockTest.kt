package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.ContentLoader
import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StaffTrees
import com.willio.jeanvilma.fishshopping.core.ship.StaffUnlock
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 10 — staff unlock. */
class StaffUnlockTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/staff-unlock.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, StaffUnlock.CATALOG).readText()).jsonObject
        assertEquals(StaffUnlock.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StaffUnlock.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(StaffUnlock.MARKER, json.getValue("staffUnlockMarker").jsonPrimitive.content)
        assertEquals(
            StaffUnlock.STAFF_BRANCH_TARGET,
            json.getValue("staffBranchTarget").jsonPrimitive.int,
        )
        assertEquals(5, json.getValue("newBranchIds").jsonArray.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(10, listing.getValue("staffUnlockPhase").jsonPrimitive.content.toInt())
        assertEquals(StaffUnlock.CATALOG, listing.getValue("staffUnlockCatalog").jsonPrimitive.content)
    }

    @Test
    fun comingSoonClosedAndBranchesCoverAllRoles() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertEquals(
            0,
            kickoff.getValue("baseline").jsonObject
                .getValue("staffComingSoonReasons").jsonPrimitive.content.toInt(),
        )
        assertFalse(
            kickoff.getValue("gaps").jsonObject
                .getValue("staffComingSoonPresent").jsonPrimitive.content.toBoolean(),
        )
        assertEquals(0, Finish3Kickoff.BASELINE_STAFF_COMING_SOON)
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("staffComingSoonPresent"))
        assertEquals(10, StaffTrees.BRANCH_COUNT)

        val content = ContentLoader.load(
            File(root, "shared/content/content-pack.json").readText(),
        )
        val state = GameState.newGame(content, content.harbors.first().id, seed = 1)
        assertEquals(0, WorkerSystem.countComingSoonReasons(content, state))
        for (id in StaffUnlock.NEW_BRANCH_IDS) {
            assertTrue(content.staffBranchesById.containsKey(id))
        }
        val roles = content.staffTrees.branches.map { it.role }.toSet()
        for (role in StaffUnlock.HIREABLE_ROLES) {
            assertTrue("missing branch for $role", role in roles)
        }
    }
}
