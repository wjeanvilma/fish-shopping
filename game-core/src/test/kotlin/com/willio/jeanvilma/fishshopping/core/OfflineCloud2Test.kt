package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.OfflineCloud2
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.RemoteAnalyticsPolicy
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 21 — offline/cloud/analytics hardening. */
class OfflineCloud2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, OfflineCloud2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, OfflineCloud2.CATALOG).readText()).jsonObject
        assertEquals(OfflineCloud2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(OfflineCloud2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(OfflineCloud2.MARKER, json.getValue("offlineCloud2Marker").jsonPrimitive.content)
        assertEquals(OfflineCloud2.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 25)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(21, listing.getValue("offlineCloud2Phase").jsonPrimitive.content.toInt())
    }

    @Test
    fun contentJournalConflictAndAnalyticsReachFloors() {
        val daily = Shared.content.dailyGoals
        assertTrue(daily.objectives.size >= OfflineCloud2.DAILY_OBJECTIVE_MIN)
        assertTrue(daily.boardSlots >= OfflineCloud2.BOARD_SLOTS_MIN)
        for (id in OfflineCloud2.OBJECTIVE_IDS) {
            assertTrue(id, Shared.content.dailyObjectivesById.containsKey(id))
        }

        val root = repoRoot()
        val offline = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/OfflineEarnings.kt",
        ).readText()
        for (field in OfflineCloud2.JOURNAL_DELTA_FIELDS) {
            assertTrue("missing $field", offline.contains(field))
        }
        val cloud = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/persistence/CloudSync.kt",
        ).readText()
        for (field in OfflineCloud2.CONFLICT_FIELDS) {
            assertTrue("missing $field", cloud.contains(field))
        }

        assertTrue(RemoteAnalyticsPolicy.REQUEUE_ON_FLUSH_FAILURE)
        assertEquals(3, RemoteAnalyticsPolicy.MAX_FLUSH_RETRIES)
        assertEquals(2_000L, RemoteAnalyticsPolicy.RETRY_BACKOFF_MS)

        val older = SnapshotCodec.encode(
            Shared.content,
            GameState.newGame(Shared.content, "harbor.sunrise_pier", 21).also { it.coins = 10L },
            1_000L,
        )
        val newer = SnapshotCodec.encode(
            Shared.content,
            GameState.newGame(Shared.content, "harbor.moon_cove", 22).also { it.coins = 40L },
            9_000L,
        )
        val offer = CloudSync.conflictOffer(older, newer)!!
        assertEquals("remote_newer", offer.reasonCode)
        assertTrue(offer.diffHints.isNotEmpty())

        val kickoff = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        val phase21 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 21 }
        assertEquals("offline-cloud-2", phase21.getValue("id").jsonPrimitive.content)
        assertEquals("offlinecloud2:validate", phase21.getValue("validate").jsonPrimitive.content)
    }
}
