package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.SpeciesCodex
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 12 — species codex / journal. */
class SpeciesCodexTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/species-codex.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/species-codex.json").readText()).jsonObject
        assertEquals(SpeciesCodex.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SpeciesCodex.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(SpeciesCodex.CODEX_ENTRY_COUNT, json.getValue("codexEntryCount").jsonPrimitive.content.toInt())
        assertEquals(SpeciesCodex.FAMILY_COUNT, json.getValue("familyCount").jsonPrimitive.content.toInt())
        assertEquals(50, Shared.content.species.size)
        assertEquals(50, Shared.content.codex.entries.size)
        assertEquals(9, Shared.content.codex.families.size)
        for (fam in SpeciesCodex.FAMILIES) {
            assertTrue(fam, fam in Shared.content.codex.families)
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(12, listing.getValue("speciesCodexPhase").jsonPrimitive.content.toInt())
        assertEquals(SpeciesCodex.CATALOG, listing.getValue("speciesCodexCatalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(50, dod.getValue("quotas").jsonObject.getValue("codexEntries").jsonPrimitive.int)
        val screens = dod.getValue("screensPresent").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(screens.contains("species_journal"))
    }

    @Test
    fun parityFixtureUnlocksJournalDepth() {
        val fx = Json.parseToJsonElement(File(root, SpeciesCodex.PARITY_FIXTURE).readText()).jsonObject
        val setup = fx.getValue("setup").jsonObject
        val expect = fx.getValue("expect").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(
                Shared.content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        for ((id, qty) in setup.getValue("speciesCatches").jsonObject) {
            sim.state.recordSpeciesCatch(id, qty.jsonPrimitive.long)
        }
        val book = sim.view().speciesBook
        assertEquals(expect.getValue("discovered").jsonPrimitive.int, book.discovered)
        assertEquals(expect.getValue("total").jsonPrimitive.int, book.total)
        assertEquals(expect.getValue("familyCount").jsonPrimitive.int, book.families.size)

        val spratExpect = expect.getValue("sprat").jsonObject
        val sprat = book.entries.first { it.speciesId == spratExpect.getValue("speciesId").jsonPrimitive.content }
        assertTrue(sprat.discovered)
        assertEquals(spratExpect.getValue("family").jsonPrimitive.content, sprat.family)
        assertEquals(spratExpect.getValue("rarityBand").jsonPrimitive.content, sprat.rarityBand)
        assertEquals(spratExpect.getValue("catches").jsonPrimitive.long, sprat.catches)
        assertEquals(spratExpect.getValue("catchValueEstimate").jsonPrimitive.long, sprat.catchValueEstimate)
        if (spratExpect.getValue("hasLore").jsonPrimitive.boolean) assertNotNull(sprat.lore)
        if (spratExpect.getValue("hasJournalTip").jsonPrimitive.boolean) assertNotNull(sprat.journalTip)

        val hiddenExpect = expect.getValue("hiddenSample").jsonObject
        val hidden = book.entries.first { it.speciesId == hiddenExpect.getValue("speciesId").jsonPrimitive.content }
        assertFalse(hidden.discovered)
        assertEquals(hiddenExpect.getValue("name").jsonPrimitive.content, hidden.name)
        if (hiddenExpect.getValue("hasHabitatHint").jsonPrimitive.boolean) assertNotNull(hidden.habitatHint)
        if (hiddenExpect.getValue("loreNull").jsonPrimitive.boolean) assertNull(hidden.lore)
    }
}
