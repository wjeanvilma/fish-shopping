package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CloudSyncTest {
    private val content get() = Shared.content

    @Test
    fun newestChecksumValidWins() {
        val older = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 1), 1_000L)
        val newer = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 2), 2_000L)
        assertEquals(SyncSource.REMOTE, CloudSync.choose(older, newer).source)
        assertEquals(newer, CloudSync.choose(older, newer).text)
        assertEquals(SyncSource.LOCAL, CloudSync.choose(newer, older).source)
    }

    @Test
    fun corruptRemoteIsIgnored() {
        val local = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 3), 5_000L)
        val decision = CloudSync.choose(local, """{"schemaVersion":12,"checksum":"deadbeef","state":{}}""")
        assertEquals(SyncSource.LOCAL, decision.source)
        assertEquals(local, decision.text)
        assertNull(CloudSync.conflictOffer(local, """{"schemaVersion":12,"checksum":"deadbeef","state":{}}"""))
    }

    @Test
    fun peekRejectsBadChecksum() {
        assertNull(CloudSync.peek("""{"schemaVersion":12,"checksum":"00000000","state":{"harborId":"x"}}"""))
        val ok = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 4), 9_000L)
        val peeked = CloudSync.peek(ok)
        assertNotNull(peeked)
        assertEquals(9_000L, peeked!!.savedAtEpochMs)
        assertEquals("harbor.sunrise_pier", peeked.harborId)
        assertEquals(0L, peeked.tick)
        assertTrue(peeked.coins >= 0L)
    }

    @Test
    fun equalAgeKeepsLocal() {
        val a = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 5), 9_000L)
        val b = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 6), 9_000L)
        assertEquals(SyncSource.LOCAL, CloudSync.choose(a, b).source)
        assertTrue(CloudSync.choose(a, a).reason.contains("identical"))
    }

    @Test
    fun conflictOfferSurfacesDualSnapshotWhenBothDiffer() {
        val olderState = GameState.newGame(content, "harbor.sunrise_pier", 7).also {
            it.coins = 50L
            it.tick = 400L
        }
        val newerState = GameState.newGame(content, "harbor.moon_cove", 8).also {
            it.coins = 200L
            it.tick = 2_000L
        }
        val older = SnapshotCodec.encode(content, olderState, 1_000L)
        val newer = SnapshotCodec.encode(content, newerState, 9_000L)
        val offer = CloudSync.conflictOffer(older, newer)
        assertNotNull(offer)
        assertEquals(SyncSource.REMOTE, offer!!.recommended)
        assertEquals("remote newer", offer.reason)
        assertEquals(50L, offer.local.coins)
        assertEquals(200L, offer.remote.coins)
        assertEquals("harbor.sunrise_pier", offer.local.harborId)
        assertEquals("harbor.moon_cove", offer.remote.harborId)
        assertEquals(400L, offer.local.tick)
        assertEquals(2_000L, offer.remote.tick)
        assertNull(CloudSync.conflictOffer(older, older))
    }
}
