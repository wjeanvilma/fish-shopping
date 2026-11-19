package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Harbors1314
import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Finish 6.0 Phase 7 — harbors 13–14 scenic art/prestige. */
class Harbors1314Test {
    private val root = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }
            .first { File(it, "shared/ship/harbors-13-14.json").exists() }
    }

    @Test
    fun locksPhase7CatalogFloors() {
        assertEquals(7, Harbors1314.PHASE)
        assertEquals("30_finish_6.0", Harbors1314.PLAN)
        assertEquals("fish.ship.harbors_13_14.v1", Harbors1314.SCHEMA)
        assertEquals(14, Harbors1314.HARBOR_COUNT)
        assertEquals(2, Harbors1314.NEW_HARBOR_COUNT)
        assertEquals("authored-finish-6.0-phase-7", Harbors1314.MARKER)
        assertEquals(
            listOf("harbor.saffron_quay", "harbor.cobalt_sound"),
            Harbors1314.NEW_HARBOR_IDS,
        )
        assertEquals(
            listOf("prestige.thirteen_harbors", "prestige.fourteen_harbors"),
            Harbors1314.CIRCUIT_PRESTIGE,
        )
        assertTrue(Harbors1314.harborsEnough(14))
    }

    @Test
    fun shipCatalogAndKickoffGapsMatch() {
        val json = Json.parseToJsonElement(
            File(root, Harbors1314.CATALOG).readText(),
        ).jsonObject
        assertEquals(Harbors1314.MARKER, json.getValue("harbors1314Marker").jsonPrimitive.content)
        assertEquals(14, json.getValue("harborCount").jsonPrimitive.int)

        val listing = Json.parseToJsonElement(
            File(root, "shared/store/listing.json").readText(),
        ).jsonObject
        assertEquals(7, listing.getValue("harbors1314Phase").jsonPrimitive.content.toInt())
        assertEquals(Harbors1314.CATALOG, listing.getValue("harbors1314Catalog").jsonPrimitive.content)

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        val gaps = kickoff.getValue("gaps").jsonObject
        assertEquals(0, gaps.getValue("authoredHarborsRemaining").jsonPrimitive.int)
        assertEquals("false", gaps.getValue("harborArt6Incomplete").jsonPrimitive.content)
        assertEquals(
            12,
            kickoff.getValue("baseline").jsonObject.getValue("authoredHarbors").jsonPrimitive.int,
        )
    }
}
