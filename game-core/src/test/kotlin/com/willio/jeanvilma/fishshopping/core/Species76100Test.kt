package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Species76100
import com.willio.jeanvilma.fishshopping.core.world.EcologySystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 11 — species 76–100 + ecology + i18n. */
class Species76100Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/species-76-100.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Species76100.CATALOG).readText()).jsonObject
        assertEquals(Species76100.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Species76100.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Species76100.MARKER, json.getValue("species76100Marker").jsonPrimitive.content)
        assertEquals(Species76100.SPECIES_COUNT, json.getValue("speciesCount").jsonPrimitive.int)
        assertEquals(Species76100.HABITAT_COUNT, json.getValue("habitatCount").jsonPrimitive.int)
        assertEquals(13, json.getValue("newBaseSpecies").jsonArray.size)
        assertEquals(12, json.getValue("newRareSpecies").jsonArray.size)
        assertEquals(8, json.getValue("habitatIds").jsonArray.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(11, listing.getValue("species76100Phase").jsonPrimitive.content.toInt())
        assertEquals(Species76100.CATALOG, listing.getValue("species76100Catalog").jsonPrimitive.content)

        val prep = Json.parseToJsonElement(File(root, Species76100.SCHEMA_PREP_CATALOG).readText()).jsonObject
        assertEquals(Species76100.SCHEMA_PREP_TARGET, prep.getValue("targetSchemaVersion").jsonPrimitive.int)
        assertEquals(24, prep.getValue("currentSchemaVersion").jsonPrimitive.int)
        assertEquals("prepared", prep.getValue("status").jsonPrimitive.content)
    }

    @Test
    fun contentHasHundredSpeciesAndSixteenHabitats() {
        assertTrue(Shared.content.species.size >= 100)
        assertTrue(Shared.content.codex.entries.size >= 100)
        assertTrue(EcologySystem.meetsPhase11Floor(Shared.content))
        assertTrue(EcologySystem.coversSpecies(Shared.content, Species76100.waveIds()))
        for (id in Species76100.waveIds()) {
            assertTrue(id, Shared.content.speciesById.containsKey(id))
            assertTrue(id, Shared.content.codexBySpeciesId.containsKey(id))
        }
        for (id in Species76100.NEW_HABITAT_IDS) {
            assertTrue(id, Shared.content.ecology.habitatsById.containsKey(id))
        }
        val kickoff = Json.parseToJsonElement(File(repoRoot(), Finish4Kickoff.CATALOG).readText()).jsonObject
        assertEquals(100, kickoff.getValue("baseline").jsonObject.getValue("species").jsonPrimitive.int)
        assertEquals(0, kickoff.getValue("gaps").jsonObject.getValue("speciesRemaining").jsonPrimitive.int)
        val dawnTick = 100L
        assertTrue(
            EcologySystem.habitatWeightMultPermille(
                Shared.content,
                dawnTick,
                "harbor.sunrise_pier",
                "species.cedar_smelt",
            ) > 1000,
        )
    }
}
