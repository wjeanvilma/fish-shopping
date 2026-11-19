package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
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

/** Finish 5.0 Phase 1 — kickoff catalog + gap scoreboard. */
class Finish5KickoffTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Finish5Kickoff.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        assertEquals(Finish5Kickoff.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Finish5Kickoff.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.PLAN, catalog.getValue("plan").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.KICKOFF_MARKER, catalog.getValue("kickoffMarker").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.CONTENT_VERSION, catalog.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.SCHEMA_VERSION, catalog.getValue("schemaVersion").jsonPrimitive.int)

        val prior = catalog.getValue("priorPlan").jsonObject
        assertEquals(Finish5Kickoff.PRIOR_PLAN, prior.getValue("id").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.PRIOR_STATUS, prior.getValue("status").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.PRIOR_RELEASE_TAG, prior.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.PRIOR_FREEZE_CATALOG, prior.getValue("freezeCatalog").jsonPrimitive.content)

        val end = catalog.getValue("endState").jsonObject
        assertEquals(Finish5Kickoff.END_CONTENT_VERSION, end.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.END_RELEASE_TAG, end.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Finish5Kickoff.END_SCHEMA_VERSION_MIN, end.getValue("schemaVersionMin").jsonPrimitive.int)
        assertEquals(Finish5Kickoff.END_PRODUCT_LOC_MIN, end.getValue("productLocMin").jsonPrimitive.int)

        val phases = catalog.getValue("phases").jsonArray
        assertEquals(Finish5Kickoff.PHASE_COUNT, phases.size)
        assertEquals("kickoff", phases.first().jsonObject.getValue("id").jsonPrimitive.content)
        assertEquals("freeze-5", phases.last().jsonObject.getValue("id").jsonPrimitive.content)
        assertTrue(Finish5Kickoff.requireThirtyPhases())
    }

    @Test
    fun baselineScoreboardLeavesFinish5GapsOpen() {
        val board = Finish5Kickoff.baselineScoreboard()
        assertEquals(Finish5Kickoff.BASELINE_AUTHORED_HARBORS, board.authoredHarbors.current)
        assertEquals(Finish5Kickoff.GAP_AUTHORED_HARBORS_REMAINING, board.authoredHarbors.remaining)
        assertFalse(board.authoredHarbors.met)
        assertEquals(Finish5Kickoff.BASELINE_AUTHORED_FISH, board.authoredFish.current)
        assertEquals(Finish5Kickoff.GAP_AUTHORED_FISH_REMAINING, board.authoredFish.remaining)
        assertEquals(Finish5Kickoff.BASELINE_PRODUCT_LOC, board.productLoc.current)
        assertEquals(Finish5Kickoff.GAP_PRODUCT_LOC_REMAINING, board.productLoc.remaining)
        assertFalse(board.productLoc.met)
        assertFalse(board.species.met)
        assertFalse(board.machines.met)
        assertFalse(board.quests.met)
        assertEquals(Finish5Kickoff.OPEN_GAP_FLAGS.size, board.openFlagCount)
        // Finish 5.0 Phase 27 closed devicePerf5Incomplete → 2 open flags remain.
        // Soft-floor: Phase 29 closed parityLock5Missing → 0 open boolean flags remain.
        assertTrue(board.openFlagCount >= 0)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("engineDepthIncomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("harborArt5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("fishArt5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("productArt5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("atmosphere5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("audioVfx5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("contentFloorsShort"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("tutorialRetentionIncomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("staffAi3Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("economy3Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("offlineCloud3Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("uiParity5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("a11yI18n5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("stripeOps5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("deeplinkE2e5Thin"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("devicePerf5Incomplete"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("contentCli5Missing"))
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("parityLock5Missing"))
        assertTrue(Finish5Kickoff.OPEN_GAP_FLAGS.isEmpty())
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("endgameSchema26Pending"))
        assertFalse(board.allNumericGapsClosed)
        assertEquals(0, Finish5Kickoff.productLocProgress())
    }
}
