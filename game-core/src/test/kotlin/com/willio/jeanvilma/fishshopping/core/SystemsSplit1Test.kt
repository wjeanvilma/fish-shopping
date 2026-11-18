package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.SystemsSplit1
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 2 — systems.ts fishing/production/inventory split. */
class SystemsSplit1Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/systems-split-1.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, SystemsSplit1.CATALOG).readText()).jsonObject
        assertEquals(SystemsSplit1.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SystemsSplit1.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(SystemsSplit1.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            SystemsSplit1.MARKER,
            json.getValue("systemsSplit1Marker").jsonPrimitive.content,
        )
        assertEquals(
            SystemsSplit1.SYSTEMS_FACADE_MAX_LINES,
            json.getValue("systemsFacadeMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            SystemsSplit1.EXTRACTED_FILE_MIN,
            json.getValue("extractedFileMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            SystemsSplit1.GAP_FLAG_CLOSED,
            json.getValue("gapFlagClosed").jsonPrimitive.content,
        )
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(SystemsSplit1.REQUIRED_FILES, required)
    }

    @Test
    fun facadeSlimAndModulesExtracted() {
        val facade = File(root, SystemsSplit1.SYSTEMS_FACADE_PATH)
        assertTrue(facade.isFile)
        val lines = facade.readLines().size
        assertTrue(SystemsSplit1.facadeSlim(lines))
        assertTrue(lines < 5306) // pre-split god-file size

        val pkgRoot = File(root, SystemsSplit1.SYSTEMS_PACKAGE_ROOT)
        val extracted = pkgRoot.listFiles { f ->
            f.isFile && f.name.endsWith(".ts")
        }?.size ?: 0
        assertTrue(SystemsSplit1.extractedEnough(extracted))

        for (name in SystemsSplit1.REQUIRED_FILES) {
            assertTrue("missing $name", File(pkgRoot, name).isFile)
        }

        val body = facade.readText()
        assertTrue(body.contains("FishingSystem"))
        assertTrue(body.contains("ProductionSystem"))
        assertTrue(body.contains("MovementSystem"))
        assertTrue(body.contains("bindSystemsBridge"))
        assertFalse(body.contains("export const FishingSystem"))
        assertFalse(body.contains("export const ProductionSystem"))
        assertFalse(body.contains("export const MovementSystem"))

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-4.0-kickoff.json").readText(),
        ).jsonObject
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject
                .getValue("systemsSplitIncomplete").jsonPrimitive.content.toBoolean(),
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(2, listing.getValue("systemsSplit1Phase").jsonPrimitive.content.toInt())
        assertEquals(
            SystemsSplit1.CATALOG,
            listing.getValue("systemsSplit1Catalog").jsonPrimitive.content,
        )
        assertTrue(File(root, SystemsSplit1.PARITY_FIXTURE).isFile)
    }
}
