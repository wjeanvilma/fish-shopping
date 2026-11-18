package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 1 — kickoff + gap scoreboard. */
class Finish3KickoffTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/finish-3.0-kickoff.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertEquals(Finish3Kickoff.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Finish3Kickoff.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Finish3Kickoff.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(Finish3Kickoff.KICKOFF_MARKER, json.getValue("kickoffMarker").jsonPrimitive.content)
        assertEquals(Finish3Kickoff.CONTENT_VERSION, json.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish3Kickoff.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.content.toInt())

        val prior = json.getValue("priorPlan").jsonObject
        assertEquals(Finish3Kickoff.PRIOR_PLAN, prior.getValue("id").jsonPrimitive.content)
        assertEquals(Finish3Kickoff.PRIOR_STATUS, prior.getValue("status").jsonPrimitive.content)
        assertEquals(Finish3Kickoff.PRIOR_RELEASE_TAG, prior.getValue("releaseTag").jsonPrimitive.content)

        val end = json.getValue("endState").jsonObject
        assertEquals(Finish3Kickoff.END_CONTENT_VERSION, end.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Finish3Kickoff.END_RELEASE_TAG, end.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(
            Finish3Kickoff.END_SCHEMA_VERSION_MIN,
            end.getValue("schemaVersionMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            Finish3Kickoff.END_PRODUCT_LOC_MIN,
            end.getValue("productLocMin").jsonPrimitive.content.toInt(),
        )

        val baseline = json.getValue("baseline").jsonObject
        assertEquals(
            Finish3Kickoff.BASELINE_PRODUCT_LOC,
            baseline.getValue("productLoc").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            Finish3Kickoff.BASELINE_AUTHORED_HARBORS,
            baseline.getValue("authoredHarbors").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            Finish3Kickoff.BASELINE_AUTHORED_FISH,
            baseline.getValue("authoredFish").jsonPrimitive.content.toInt(),
        )

        val phases = json.getValue("phases").jsonArray
        assertEquals(Finish3Kickoff.PHASE_COUNT, phases.size)
        assertTrue(Finish3Kickoff.requireThirtyPhases())
        assertEquals("kickoff", Finish3Kickoff.PHASES.first().id)
        assertEquals("freeze-3", Finish3Kickoff.PHASES.last().id)
    }

    @Test
    fun gapScoreboardMatchesPhase1Lock() {
        val board = Finish3Kickoff.baselineScoreboard()
        assertEquals(8, board.authoredHarbors.current)
        assertEquals(0, board.authoredHarbors.remaining)
        assertTrue(board.authoredHarbors.met)
        assertEquals(50, board.authoredFish.current)
        assertEquals(0, board.authoredFish.remaining)
        assertTrue(board.authoredFish.met)
        assertEquals(Finish3Kickoff.BASELINE_PRODUCT_LOC, board.productLoc.current)
        assertEquals(Finish3Kickoff.GAP_PRODUCT_LOC_REMAINING, board.productLoc.remaining)
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("webHudDecomposition"))
        assertTrue(board.species.met)
        assertTrue(board.machines.met)
        assertTrue(board.quests.met)
        assertEquals(0, board.staffComingSoon.current)
        assertTrue(board.staffComingSoon.met)
        assertEquals(Finish3Kickoff.OPEN_GAP_FLAGS.size, board.openFlagCount)
        assertFalse(board.allNumericGapsClosed)
        assertEquals(0, Finish3Kickoff.productLocProgress())
        assertEquals(100, Finish3Kickoff.productLocProgress(80_000))
        assertTrue(
            Finish3Kickoff.summaryLine(board).contains("openFlags=${Finish3Kickoff.OPEN_GAP_FLAGS.size}"),
        )
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("androidHudDecomposition"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("androidI18nIncomplete"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("contentI18nMissing"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("thirdLocaleMissing"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("darkThemeMissing"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("staffComingSoonPresent"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("stripeLiveCheckoutPartial"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("pushRemindersMissing"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("pwaMissing"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("deepLinksMissing"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("composeUiTestsMissing"))
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains("webE2eMissing"))
        assertTrue(Finish3Kickoff.OPEN_GAP_FLAGS.isEmpty())
        assertEquals(3, Finish3Kickoff.BASELINE_I18N_LOCALES)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(1, listing.getValue("finish3KickoffPhase").jsonPrimitive.content.toInt())
        assertEquals(
            Finish3Kickoff.CATALOG,
            listing.getValue("finish3KickoffCatalog").jsonPrimitive.content,
        )

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(Finish3Kickoff.CATALOG, pin.getValue("finish3Kickoff").jsonPrimitive.content)
        assertTrue(File(root, Finish3Kickoff.PARITY_FIXTURE).isFile)
        assertTrue(File(root, "web/scripts/validate-finish-3-kickoff.ts").isFile)
        assertTrue(File(root, "web/scripts/smoke-finish-3-kickoff.ts").isFile)
    }
}
