package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.OfflineCloud3
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.RemoteAnalyticsPolicy
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 22 — offline/cloud/analytics hardening 3. */
class OfflineCloud3Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, OfflineCloud3.CATALOG).isFile }

    @Test
    fun locksPhase22CatalogFloors() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, OfflineCloud3.CATALOG).readText()).jsonObject
        assertEquals(OfflineCloud3.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(OfflineCloud3.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(OfflineCloud3.MARKER, json.getValue("offlineCloud3Marker").jsonPrimitive.content)
        assertEquals(OfflineCloud3.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(OfflineCloud3.CLOSES_GAP))
        // Soft-floor: Finish 6.0 Phase 18 raised retries/jitter; keep ≥ Phase-22 floors.
        assertTrue(RemoteAnalyticsPolicy.MAX_FLUSH_RETRIES >= 5)
        assertTrue(RemoteAnalyticsPolicy.RETRY_JITTER_MS >= 500L)
        assertTrue(RemoteAnalyticsPolicy.DEAD_LETTER_AFTER_MAX_RETRIES)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(22, listing.getValue("offlineCloud3Phase").jsonPrimitive.content.toInt())
    }

    @Test
    fun conflictOfferExposesSeverityAndDiagnostics() {
        val older = GameState.newGame(Shared.content, "harbor.sunrise_pier", 22)
        older.coins = 10L
        val newer = GameState.newGame(Shared.content, "harbor.moon_cove", 23)
        newer.coins = 600L
        val offer = CloudSync.conflictOffer(
            SnapshotCodec.encode(Shared.content, older, 1_000L),
            SnapshotCodec.encode(Shared.content, newer, 9_000L),
        )!!
        assertEquals("high", offer.severity.name.lowercase())
        assertEquals(8_000L, offer.ageSkewMs)
        assertTrue(offer.syncDiagnostics.any { it.startsWith("severity ") })
    }

    @Test
    fun kickoffAndDoDWired() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        val phase22 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 22 }
        assertEquals("offline-cloud-3", phase22.getValue("id").jsonPrimitive.content)
        assertEquals("offlinecloud3:validate", phase22.getValue("validate").jsonPrimitive.content)
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject.getValue("offlineCloud3Incomplete").jsonPrimitive.boolean,
        )
        val offline = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/OfflineEarnings.kt",
        ).readText()
        for (field in OfflineCloud3.JOURNAL_DELTA_FIELDS) {
            assertTrue(field, offline.contains(field))
        }
    }
}
