package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.PresenterHarness
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness ship constants. */
class PresenterHarnessTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, PresenterHarness.CATALOG).isFile }

    @Test
    fun locksPhase21CatalogFloors() {
        assertEquals(21, PresenterHarness.PHASE)
        assertEquals(27, PresenterHarness.SCHEMA_VERSION)
        assertEquals(PresenterHarness.PRESENTER_HARNESS_MARKER, "authored-finish-6.0-phase-21")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(PresenterHarness.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertTrue(PresenterHarness.STAGES.size >= PresenterHarness.STAGE_MIN)
        assertTrue(PresenterHarness.STAGES.contains("nestHud"))
        assertTrue(PresenterHarness.SNAPSHOT_FIELDS.size >= PresenterHarness.SNAPSHOT_FIELD_MIN)
        assertTrue(PresenterHarness.SNAPSHOT_FIELDS.contains("nestHudPressurePermille"))
        assertTrue(File(repoRoot(), PresenterHarness.CATALOG).isFile)
        assertTrue(File(repoRoot(), PresenterHarness.PARITY_FIXTURE).isFile)
        assertTrue(
            File(
                repoRoot(),
                "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresenterCpuSnapshot.kt",
            ).isFile,
        )
    }
}
