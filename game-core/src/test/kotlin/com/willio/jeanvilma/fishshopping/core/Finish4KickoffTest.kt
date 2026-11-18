package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 1 — kickoff catalog + gap scoreboard. */
class Finish4KickoffTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Finish4Kickoff.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        assertEquals(Finish4Kickoff.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Finish4Kickoff.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.PLAN, catalog.getValue("plan").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.KICKOFF_MARKER, catalog.getValue("kickoffMarker").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.CONTENT_VERSION, catalog.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.SCHEMA_VERSION, catalog.getValue("schemaVersion").jsonPrimitive.int)

        val prior = catalog.getValue("priorPlan").jsonObject
        assertEquals(Finish4Kickoff.PRIOR_PLAN, prior.getValue("id").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.PRIOR_STATUS, prior.getValue("status").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.PRIOR_RELEASE_TAG, prior.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.PRIOR_FREEZE_CATALOG, prior.getValue("freezeCatalog").jsonPrimitive.content)

        val end = catalog.getValue("endState").jsonObject
        assertEquals(Finish4Kickoff.END_CONTENT_VERSION, end.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.END_RELEASE_TAG, end.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.END_SCHEMA_VERSION_MIN, end.getValue("schemaVersionMin").jsonPrimitive.int)
        assertEquals(Finish4Kickoff.END_PRODUCT_LOC_MIN, end.getValue("productLocMin").jsonPrimitive.int)

        val phases = catalog.getValue("phases").jsonArray
        assertEquals(Finish4Kickoff.PHASE_COUNT, phases.size)
        assertEquals("kickoff", phases.first().jsonObject.getValue("id").jsonPrimitive.content)
        assertEquals("freeze-4", phases.last().jsonObject.getValue("id").jsonPrimitive.content)
        assertTrue(Finish4Kickoff.requireThirtyPhases())
    }

    @Test
    fun baselineScoreboardLeavesFinish4GapsOpen() {
        val board = Finish4Kickoff.baselineScoreboard()
        assertEquals(Finish4Kickoff.BASELINE_AUTHORED_HARBORS, board.authoredHarbors.current)
        assertEquals(Finish4Kickoff.GAP_AUTHORED_HARBORS_REMAINING, board.authoredHarbors.remaining)
        assertTrue(board.authoredHarbors.met)
        assertEquals(Finish4Kickoff.BASELINE_AUTHORED_FISH, board.authoredFish.current)
        assertEquals(100, board.authoredFish.current)
        assertEquals(Finish4Kickoff.GAP_AUTHORED_FISH_REMAINING, board.authoredFish.remaining)
        assertEquals(0, board.authoredFish.remaining)
        assertTrue(board.authoredFish.met)
        assertEquals(Finish4Kickoff.BASELINE_PRODUCT_LOC, board.productLoc.current)
        assertEquals(Finish4Kickoff.GAP_PRODUCT_LOC_REMAINING, board.productLoc.remaining)
        assertFalse(board.productLoc.met)
        assertTrue(board.species.met)
        assertTrue(board.machines.met)
        assertTrue(board.quests.met)
        assertEquals(Finish4Kickoff.OPEN_GAP_FLAGS.size, board.openFlagCount)
        assertEquals(0, board.openFlagCount)
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("systemsSplitIncomplete"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("viewModelSplitIncomplete"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("workersSimViewSplitIncomplete"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("gameHostSplitIncomplete"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("harborBlockoutPresent"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("productArtIncomplete"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("endgameSchema25Pending"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("contentFloorsShort"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("stripeOpsIncomplete"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("deeplinkE2eThin"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("devicePerfIncomplete"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("contentCli3Missing"))
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains("parityLock4Missing"))
        assertFalse(board.allNumericGapsClosed)
        assertEquals(0, Finish4Kickoff.productLocProgress(Finish4Kickoff.BASELINE_PRODUCT_LOC))
        assertEquals(100, Finish4Kickoff.productLocProgress(Finish4Kickoff.TARGET_PRODUCT_LOC))
        assertTrue(Finish4Kickoff.summaryLine(board).contains("Finish 4.0 Phase 1 gaps"))
    }

    @Test
    fun releasePinAndDoDWireFinish4Kickoff() {
        val root = repoRoot()
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(Finish4Kickoff.CATALOG, pin.getValue("finish4Kickoff").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-finish-4.0-kickoff.json"
            },
        )

        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        val finish4 = dod.getValue("finish4Kickoff").jsonObject
        assertEquals(1, finish4.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Finish4Kickoff.PLAN, finish4.getValue("plan").jsonPrimitive.content)
        assertEquals("active", finish4.getValue("status").jsonPrimitive.content)
        assertEquals(Finish4Kickoff.KICKOFF_MARKER, finish4.getValue("kickoffMarker").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(1, listing.getValue("finish4KickoffPhase").jsonPrimitive.content.toInt())
        assertEquals(Finish4Kickoff.CATALOG, listing.getValue("finish4KickoffCatalog").jsonPrimitive.content)
    }
}
