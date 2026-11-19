package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.ShipCodegen
import com.willio.jeanvilma.fishshopping.core.ship.generated.Finish6KickoffGen
import com.willio.jeanvilma.fishshopping.core.ship.generated.Schema6Gen
import com.willio.jeanvilma.fishshopping.core.ship.generated.ShipCodegenGen
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 3 — ship catalog codegen. */
class ShipCodegenTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ShipCodegen.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, ShipCodegen.CATALOG).readText()).jsonObject
        assertEquals(ShipCodegen.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ShipCodegen.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(ShipCodegen.PLAN, catalog.getValue("plan").jsonPrimitive.content)
        assertEquals(ShipCodegen.MARKER, catalog.getValue("shipCodegenMarker").jsonPrimitive.content)
        assertEquals(ShipCodegen.CONTENT_VERSION, catalog.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(ShipCodegen.SCHEMA_VERSION, catalog.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(ShipCodegen.CATALOG_MIN, catalog.getValue("catalogMin").jsonPrimitive.int)
        assertEquals(ShipCodegen.CLOSES_GAP, catalog.getValue("closesGap").jsonPrimitive.content)

        val ids = catalog.getValue("catalogs").jsonArray
            .map { it.jsonObject.getValue("id").jsonPrimitive.content }
        assertEquals(ShipCodegen.CATALOG_IDS, ids)

        for (path in ShipCodegen.GENERATED_TS + ShipCodegen.GENERATED_KT) {
            assertTrue(path, File(root, path).isFile)
            assertTrue(path, File(root, path).readText().contains("AUTO-GENERATED"))
        }
    }

    @Test
    fun generatedObjectsMatchCatalogAndGapClosed() {
        assertEquals(1, Finish6KickoffGen.PHASE)
        assertEquals(2, Schema6Gen.PHASE)
        assertEquals(3, ShipCodegenGen.PHASE)
        assertEquals(ShipCodegen.MARKER, ShipCodegenGen.MARKER)

        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish6Kickoff.CATALOG).readText()).jsonObject
        val gaps = kickoff.getValue("gaps").jsonObject
        assertFalse(gaps.getValue("shipCodegenMissing").jsonPrimitive.boolean)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("shipCodegenMissing"))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 17)
    }
}
