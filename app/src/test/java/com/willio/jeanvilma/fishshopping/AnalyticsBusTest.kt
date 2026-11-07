package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.analytics.AnalyticsBus
import com.willio.jeanvilma.fishshopping.core.content.ContentLoader
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MemoryAnalyticsSink
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class AnalyticsBusTest {
    private val harbor = "harbor.sunrise_pier"
    private val content by lazy {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/content/content-pack.json").isFile }
        }
        ContentLoader.load(File(root, "shared/content/content-pack.json").readText())
    }

    @Test
    fun consentGateDropsUntilOptIn() {
        val memory = MemoryAnalyticsSink()
        val bus = AnalyticsBus.recording(memory)
        val state = GameState.newGame(content, harbor, 1)
        bus.onGameEvents(listOf(GameEvent.TutorialAdvanced(1, 0)), state)
        assertTrue(memory.events.isEmpty())
        bus.setConsent(true)
        bus.onGameEvents(listOf(GameEvent.TutorialAdvanced(2, 1)), state)
        assertEquals(listOf("tutorial_step_completed"), memory.names())
    }

    @Test
    fun tracksBlueprintEventsWithoutPii() {
        val memory = MemoryAnalyticsSink()
        val bus = AnalyticsBus.recording(memory)
        bus.setConsent(true)
        val state = GameState.newGame(content, harbor, 2)
        state.bumpStat(Stats.SALES, 1)
        bus.onGameEvents(
            listOf(
                GameEvent.SaleCommitted(1, "s1", "c1", emptyList(), 25),
                GameEvent.HarborTraveled(
                    2,
                    harbor,
                    "harbor.moon_cove",
                    Receipt("t1", "travel", 0, 2, harbor),
                    replayed = false,
                ),
                GameEvent.FullHarborUnlockGranted(
                    3,
                    Receipt("u1", "full_harbor_unlock", 0, 3, "entitlement.full_harbor_unlock"),
                    replayed = false,
                ),
            ),
            state,
        )
        bus.onOfflineClaimed(
            OfflineReport(60_000, 1_200, false, 40, 2, 1, 1, 0, 0),
        )
        bus.onSaveRecovery("cloud_remote")
        repeat(AnalyticsBus.FRAME_SUMMARY_EVERY) {
            bus.onFrameSample(16.7, QualityPreset.MEDIUM)
        }
        assertEquals(
            listOf(
                "first_sale",
                "harbor_unlocked",
                "harbor_unlocked",
                "offline_claimed",
                "save_recovery",
                "frame_time_summary",
            ),
            memory.names(),
        )
        assertTrue(memory.events.none { "bag" in it.props || "cloudAccountId" in it.props || "snapshot" in it.props })
    }
}
