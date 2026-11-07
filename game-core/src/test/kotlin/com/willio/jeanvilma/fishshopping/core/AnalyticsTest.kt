package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MemoryAnalyticsSink
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AnalyticsTest {
    @Test
    fun catalogDocumentsBlueprintEventsAndForbidsPii() {
        assertEquals("fish.analytics.v1", Analytics.SCHEMA)
        assertTrue(
            Analytics.EVENT_NAMES.containsAll(
                listOf(
                    "tutorial_step_completed",
                    "first_sale",
                    "harbor_unlocked",
                    "offline_claimed",
                    "save_recovery",
                    "frame_time_summary",
                ),
            ),
        )
        assertTrue("cloudAccountId" in Analytics.FORBIDDEN_KEYS)
        assertTrue("snapshot" in Analytics.FORBIDDEN_KEYS)
        assertTrue("bag" in Analytics.FORBIDDEN_KEYS)
        assertNull(Analytics.sanitize("unknown_event", mapOf("coins" to 1)))
        val stripped = Analytics.sanitize("first_sale", mapOf("coins" to 12, "email" to "a@b.c", "bag" to "nope"))!!
        assertEquals(mapOf("coins" to 12), stripped.props)
        assertEquals(Analytics.SCHEMA, stripped.schema)
    }

    @Test
    fun buildersProduceAllowlistedPropsOnly() {
        assertEquals(0, Analytics.tutorialStepCompleted(0).props["stepIndex"])
        assertEquals(40L, Analytics.firstSale(40).props["coins"])
        assertEquals("harbor.moon_cove", Analytics.harborUnlocked("harbor.moon_cove").props["harborId"])
        assertEquals("full", Analytics.harborUnlockedFull().props["mode"])
        val offline = Analytics.offlineClaimed(60_000, 1_200, 10, capped = true)
        assertEquals(true, offline.props["capped"])
        assertEquals("local_previous", Analytics.saveRecovery("local_previous").props["source"])
        val frame = Analytics.frameTimeSummary(16.66, "medium", 600, "android")
        assertEquals(16.7, frame.props["emaMs"])
        assertEquals("android", frame.props["platform"])
    }

    @Test
    fun memorySinkRecordsEvents() {
        val sink = MemoryAnalyticsSink()
        sink.track(Analytics.firstSale(5))
        sink.track(null)
        assertEquals(listOf("first_sale"), sink.names())
        sink.clear()
        assertTrue(sink.events.isEmpty())
    }

    @Test
    fun simStillRunsWithoutAnalyticsCoupling() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 1))
        sim.step(listOf(Command.Move(0, 0)))
        assertTrue(sim.state.tick > 0)
    }
}
