package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.SystemsSplit2
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 3 — systems.ts customers/contracts/progression split. */
class SystemsSplit2Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/systems-split-2.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, SystemsSplit2.CATALOG).readText()).jsonObject
        assertEquals(SystemsSplit2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SystemsSplit2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(SystemsSplit2.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            SystemsSplit2.MARKER,
            json.getValue("systemsSplit2Marker").jsonPrimitive.content,
        )
        assertEquals(
            SystemsSplit2.SYSTEMS_FACADE_MAX_LINES,
            json.getValue("systemsFacadeMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            SystemsSplit2.EXTRACTED_FILE_MIN,
            json.getValue("extractedFileMin").jsonPrimitive.content.toInt(),
        )
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(SystemsSplit2.REQUIRED_FILES, required)
        val prior = json.getValue("priorSplitFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(SystemsSplit2.PRIOR_SPLIT_FILES, prior)
    }

    @Test
    fun facadeSlimAndModulesExtracted() {
        val facade = File(root, SystemsSplit2.SYSTEMS_FACADE_PATH)
        assertTrue(facade.isFile)
        val lines = facade.readLines().size
        assertTrue(SystemsSplit2.facadeSlim(lines))
        assertTrue(lines < 4627) // Phase 2 facade size

        val pkgRoot = File(root, SystemsSplit2.SYSTEMS_PACKAGE_ROOT)
        val extracted = pkgRoot.listFiles { f ->
            f.isFile && f.name.endsWith(".ts")
        }?.size ?: 0
        assertTrue(SystemsSplit2.extractedEnough(extracted))

        for (name in SystemsSplit2.REQUIRED_FILES) {
            assertTrue("missing $name", File(pkgRoot, name).isFile)
        }
        for (name in SystemsSplit2.PRIOR_SPLIT_FILES) {
            assertTrue("missing prior $name", File(pkgRoot, name).isFile)
        }

        val body = facade.readText()
        assertTrue(body.contains("CustomerSystem"))
        assertTrue(body.contains("ProgressionSystem"))
        assertTrue(body.contains("ContractSystem"))
        assertTrue(body.contains("bindSystemsBridge"))
        assertFalse(body.contains("export const CustomerSystem"))
        assertFalse(body.contains("export const ProgressionSystem"))
        assertFalse(body.contains("export const ContractSystem"))
        assertFalse(body.contains("export const UpgradeSystem"))
        assertFalse(body.contains("export const ReputationSystem"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(3, listing.getValue("systemsSplit2Phase").jsonPrimitive.content.toInt())
        assertEquals(
            SystemsSplit2.CATALOG,
            listing.getValue("systemsSplit2Catalog").jsonPrimitive.content,
        )
        assertTrue(File(root, SystemsSplit2.PARITY_FIXTURE).isFile)
    }
}
