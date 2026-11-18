package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Species5175
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

/** Finish 3.0 Phase 12 — species 51–75 + ecology. */
class Species5175Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/species-51-75.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Species5175.CATALOG).readText()).jsonObject
        assertEquals(Species5175.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Species5175.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Species5175.MARKER, json.getValue("species51_75Marker").jsonPrimitive.content)
        assertEquals(Species5175.SPECIES_COUNT, json.getValue("speciesCount").jsonPrimitive.int)
        assertEquals(Species5175.HABITAT_COUNT, json.getValue("habitatCount").jsonPrimitive.int)
        assertEquals(13, json.getValue("newBaseSpecies").jsonArray.size)
        assertEquals(12, json.getValue("newRareSpecies").jsonArray.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(12, listing.getValue("species5175Phase").jsonPrimitive.content.toInt())
        assertEquals(Species5175.CATALOG, listing.getValue("species5175Catalog").jsonPrimitive.content)
    }

    @Test
    fun contentHasSeventyFiveSpeciesAndHabitats() {
        assertEquals(75, Shared.content.species.size)
        assertEquals(75, Shared.content.codex.entries.size)
        assertEquals(8, Shared.content.ecology.habitats.size)
        for (id in Species5175.NEW_BASE_SPECIES + Species5175.NEW_RARE_SPECIES) {
            assertTrue(id, Shared.content.speciesById.containsKey(id))
            assertTrue(id, Shared.content.codexBySpeciesId.containsKey(id))
        }
        for (id in Species5175.HABITAT_IDS) {
            assertTrue(id, Shared.content.ecology.habitatsById.containsKey(id))
        }
        val kickoff = Json.parseToJsonElement(File(repoRoot(), Finish3Kickoff.CATALOG).readText()).jsonObject
        assertEquals(75, kickoff.getValue("baseline").jsonObject.getValue("species").jsonPrimitive.int)
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 12,
        )
        // Mangrove fringe boosts mangrove snapper at coral lagoon during dawn.
        val dawnTick = 100L
        assertTrue(
            EcologySystem.habitatWeightMultPermille(
                Shared.content,
                dawnTick,
                "harbor.coral_lagoon",
                "species.mangrove_snapper",
            ) > 1000,
        )
    }
}
