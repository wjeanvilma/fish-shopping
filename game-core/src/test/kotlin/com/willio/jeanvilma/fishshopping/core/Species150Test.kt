package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Species150
import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Finish 6.0 Phase 8 — species 126–150 + fish-art-6. */
class Species150Test {
    private val root = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }
            .first { File(it, "shared/ship/species-150.json").exists() }
    }

    @Test
    fun locksPhase8CatalogFloors() {
        assertEquals(8, Species150.PHASE)
        assertEquals("30_finish_6.0", Species150.PLAN)
        assertEquals("fish.ship.species_150.v1", Species150.SCHEMA)
        assertEquals(150, Species150.SPECIES_COUNT)
        assertEquals(25, Species150.NEW_SPECIES_COUNT)
        assertEquals("authored-finish-6.0-phase-8", Species150.MARKER)
        assertEquals(13, Species150.NEW_BASE_IDS.size)
        assertEquals(12, Species150.NEW_RARE_IDS.size)
        assertTrue(Species150.speciesEnough(150))
    }

    @Test
    fun shipCatalogAndKickoffGapsMatch() {
        val json = Json.parseToJsonElement(File(root, Species150.CATALOG).readText()).jsonObject
        assertEquals(Species150.MARKER, json.getValue("species150Marker").jsonPrimitive.content)
        assertEquals(150, json.getValue("speciesCount").jsonPrimitive.int)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(8, listing.getValue("species150Phase").jsonPrimitive.content.toInt())
        assertEquals(Species150.CATALOG, listing.getValue("species150Catalog").jsonPrimitive.content)

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        val gaps = kickoff.getValue("gaps").jsonObject
        assertEquals(0, gaps.getValue("speciesRemaining").jsonPrimitive.int)
        assertEquals(0, gaps.getValue("authoredFishRemaining").jsonPrimitive.int)
        assertEquals(false, gaps.getValue("fishArt6Incomplete").jsonPrimitive.boolean)
        assertEquals(
            125,
            kickoff.getValue("baseline").jsonObject.getValue("species").jsonPrimitive.int,
        )
    }
}
