package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
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

/** Finish 6.0 Phase 1 — kickoff catalog + gap scoreboard. */
class Finish6KickoffTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Finish6Kickoff.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, Finish6Kickoff.CATALOG).readText()).jsonObject
        assertEquals(Finish6Kickoff.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Finish6Kickoff.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.PLAN, catalog.getValue("plan").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.KICKOFF_MARKER, catalog.getValue("kickoffMarker").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.CONTENT_VERSION, catalog.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.SCHEMA_VERSION, catalog.getValue("schemaVersion").jsonPrimitive.int)

        val prior = catalog.getValue("priorPlan").jsonObject
        assertEquals(Finish6Kickoff.PRIOR_PLAN, prior.getValue("id").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.PRIOR_STATUS, prior.getValue("status").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.PRIOR_RELEASE_TAG, prior.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.PRIOR_FREEZE_CATALOG, prior.getValue("freezeCatalog").jsonPrimitive.content)

        val end = catalog.getValue("endState").jsonObject
        assertEquals(Finish6Kickoff.END_CONTENT_VERSION, end.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.END_RELEASE_TAG, end.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Finish6Kickoff.END_SCHEMA_VERSION_MIN, end.getValue("schemaVersionMin").jsonPrimitive.int)
        assertEquals(Finish6Kickoff.END_PRODUCT_LOC_MIN, end.getValue("productLocMin").jsonPrimitive.int)

        val phases = catalog.getValue("phases").jsonArray
        assertEquals(Finish6Kickoff.PHASE_COUNT, phases.size)
        assertEquals("kickoff", phases.first().jsonObject.getValue("id").jsonPrimitive.content)
        assertEquals("freeze-6", phases.last().jsonObject.getValue("id").jsonPrimitive.content)
        assertTrue(Finish6Kickoff.requireThirtyPhases())
    }

    @Test
    fun baselineScoreboardLeavesFinish6GapsOpen() {
        val board = Finish6Kickoff.baselineScoreboard()
        assertEquals(Finish6Kickoff.BASELINE_AUTHORED_HARBORS, board.authoredHarbors.current)
        assertEquals(Finish6Kickoff.GAP_AUTHORED_HARBORS_REMAINING, board.authoredHarbors.remaining)
        assertFalse(board.authoredHarbors.met)
        assertEquals(Finish6Kickoff.BASELINE_AUTHORED_FISH, board.authoredFish.current)
        assertEquals(Finish6Kickoff.GAP_AUTHORED_FISH_REMAINING, board.authoredFish.remaining)
        assertEquals(Finish6Kickoff.BASELINE_PRODUCT_LOC, board.productLoc.current)
        assertEquals(Finish6Kickoff.GAP_PRODUCT_LOC_REMAINING, board.productLoc.remaining)
        assertFalse(board.productLoc.met)
        assertFalse(board.species.met)
        assertFalse(board.machines.met)
        assertFalse(board.quests.met)
        assertFalse(board.systemsTs.met)
        assertFalse(board.gameViewModel.met)
        assertFalse(board.gameHost.met)
        assertEquals(Finish6Kickoff.OPEN_GAP_FLAGS.size, board.openFlagCount)
        // Soft-floor: Phase 29 closed parityLock6Missing → 0 open boolean flags.
        assertEquals(0, board.openFlagCount)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("schemaFoundationsIncomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("shipCodegenMissing"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("systemsSplit3Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("hostVmCapsIncomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("harborArt6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("fishArt6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("productArt6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("atmosphere6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("audioVfx6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("endgameSchema27Pending"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("contentFloorsShort"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("staffAi4Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("economy4Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("offlineCloud4Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("tutorialRetention6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("uiParity6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("presenterHarnessMissing"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("a11yI18n6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("parityLock6Missing"))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.isEmpty())
        assertFalse(board.allNumericGapsClosed)
        assertEquals(0, Finish6Kickoff.productLocProgress())
        assertTrue(Finish6Kickoff.summaryLine(board).contains("Finish 6.0 Phase 1 gaps"))
    }
}
