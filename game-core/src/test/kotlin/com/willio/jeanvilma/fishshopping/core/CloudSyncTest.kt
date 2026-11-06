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
        val decision = CloudSync.choose(local, """{"schemaVersion":10,"checksum":"deadbeef","state":{}}""")
        assertEquals(SyncSource.LOCAL, decision.source)
        assertEquals(local, decision.text)
    }

    @Test
    fun peekRejectsBadChecksum() {
        assertNull(CloudSync.peek("""{"schemaVersion":10,"checksum":"00000000","state":{"harborId":"x"}}"""))
        val ok = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 4), 9_000L)
        assertNotNull(CloudSync.peek(ok))
        assertEquals(9_000L, CloudSync.peek(ok)!!.savedAtEpochMs)
    }

    @Test
    fun equalAgeKeepsLocal() {
        val a = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 5), 9_000L)
        val b = SnapshotCodec.encode(content, GameState.newGame(content, "harbor.sunrise_pier", 6), 9_000L)
        assertEquals(SyncSource.LOCAL, CloudSync.choose(a, b).source)
        assertTrue(CloudSync.choose(a, a).reason.contains("identical"))
    }
}
