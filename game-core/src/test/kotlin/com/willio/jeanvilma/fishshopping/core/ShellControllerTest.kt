package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.shell.ShellModalPolicy
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelController
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelFlags
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.shell.OfflineShell
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Finish 3.0 Phase 4 — shared shell panel controller + offline enrich. */
class ShellControllerTest {
    @Test
    fun openOneClosesOthers() {
        val c = ShellPanelController()
        c.open(ShellPanelId.STAFF)
        assertTrue(c.isOpen(ShellPanelId.STAFF))
        assertFalse(c.isOpen(ShellPanelId.UPGRADES))
        c.open(ShellPanelId.QUESTS)
        assertTrue(c.isOpen(ShellPanelId.QUESTS))
        assertFalse(c.isOpen(ShellPanelId.STAFF))
        assertEquals(ShellPanelId.QUESTS, c.snapshot().activePanel())
    }

    @Test
    fun closeOnlyClearsThatPanel() {
        val c = ShellPanelController()
        c.open(ShellPanelId.BAG)
        c.close(ShellPanelId.BAG)
        assertFalse(c.anyHudPanelOpen())
        assertEquals(ShellPanelFlags.EMPTY, c.snapshot())
    }

    @Test
    fun modalPolicyTruthTable() {
        val open = ShellPanelFlags.openOnly(ShellPanelId.SETTINGS)
        assertTrue(ShellModalPolicy.blocksWorldInput(open, false))
        assertTrue(ShellModalPolicy.shouldCommitPanelCommand(open, false))
        assertFalse(ShellModalPolicy.shouldCommitPanelCommand(open, true))
        assertTrue(ShellModalPolicy.blocksWorldInput(ShellPanelFlags.EMPTY, true))
        assertFalse(ShellModalPolicy.shouldCommitPanelCommand(ShellPanelFlags.EMPTY, false))
        assertTrue(ShellModalPolicy.allowsSimTick(ShellPanelFlags.EMPTY, false))
        assertFalse(ShellModalPolicy.allowsSimTick(open, false))
    }

    @Test
    fun wireNamesCoverTwelvePanels() {
        assertEquals(12, ShellPanelId.ALL.size)
        assertEquals(12, ShellPanelId.WIRES.size)
        assertEquals(ShellPanelId.SPECIES_BOOK, ShellPanelId.fromWire("speciesBook"))
        assertNull(ShellPanelId.fromWire("nope"))
    }

    @Test
    fun enrichWithJournalSetsLines() {
        val base = OfflineReport(
            elapsedMillis = 60_000,
            ticksCredited = 1200,
            capped = false,
            coinsDelta = 0,
            fishCaught = 0,
            sales = 0,
            itemsSold = 0,
            workerFishCaught = 0,
            workerItemsMoved = 0,
        )
        val enriched = OfflineShell.enrichWithJournal(base, listOf("Daily streak kept"))
        assertEquals(listOf("Daily streak kept"), enriched.journalLines)
        assertTrue(enriched.hadActivity)
    }
}
