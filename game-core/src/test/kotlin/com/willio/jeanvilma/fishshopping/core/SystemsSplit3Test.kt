package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.SystemsSplit3
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 4 — systems.ts rivals/economy/staffTrees/workers split. */
class SystemsSplit3Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/systems-split-3.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, SystemsSplit3.CATALOG).readText()).jsonObject
        assertEquals(SystemsSplit3.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SystemsSplit3.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(SystemsSplit3.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            SystemsSplit3.MARKER,
            json.getValue("systemsSplit3Marker").jsonPrimitive.content,
        )
        assertEquals(
            SystemsSplit3.SYSTEMS_FACADE_MAX_LINES,
            json.getValue("systemsFacadeMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            SystemsSplit3.EXTRACTED_FILE_MIN,
            json.getValue("extractedFileMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            SystemsSplit3.CLOSES_GAP,
            json.getValue("closesGap").jsonPrimitive.content,
        )
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(SystemsSplit3.REQUIRED_FILES, required)
        val prior = json.getValue("priorSplitFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(SystemsSplit3.PRIOR_SPLIT_FILES, prior)
    }

    @Test
    fun facadeSlimAndModulesExtracted() {
        val facade = File(root, SystemsSplit3.SYSTEMS_FACADE_PATH)
        assertTrue(facade.isFile)
        val lines = facade.readLines().size
        assertTrue(SystemsSplit3.facadeSlim(lines))
        assertTrue(lines < 3800)

        val pkgRoot = File(root, SystemsSplit3.SYSTEMS_PACKAGE_ROOT)
        val extracted = pkgRoot.listFiles { f ->
            f.isFile && f.name.endsWith(".ts")
        }?.size ?: 0
        assertTrue(SystemsSplit3.extractedEnough(extracted))

        for (name in SystemsSplit3.REQUIRED_FILES) {
            assertTrue("missing $name", File(pkgRoot, name).isFile)
        }
        for (name in SystemsSplit3.PRIOR_SPLIT_FILES) {
            assertTrue("missing prior $name", File(pkgRoot, name).isFile)
        }

        val body = facade.readText()
        assertTrue(body.contains("RivalMarketSystem"))
        assertTrue(body.contains("EconomySystem"))
        assertTrue(body.contains("StaffTreesSystem"))
        assertTrue(body.contains("WorkerSystem"))
        assertTrue(body.contains("bindSystemsBridge"))
        assertFalse(body.contains("export const RivalMarketSystem"))
        assertFalse(body.contains("export const EconomySystem"))
        assertFalse(body.contains("export const BankSystem"))
        assertFalse(body.contains("export const StaffTreesSystem"))
        assertFalse(body.contains("export const WorkerSystem"))
        assertFalse(body.contains("export const AutomationSystem"))

        for (name in SystemsSplit3.BRIDGE_REQUIRED_MODULES) {
            val mod = File(pkgRoot, name).readText()
            assertTrue("$name must use systemsBridge", mod.contains("systemsBridge"))
        }

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(4, listing.getValue("systemsSplit3Phase").jsonPrimitive.content.toInt())
        assertEquals(
            SystemsSplit3.CATALOG,
            listing.getValue("systemsSplit3Catalog").jsonPrimitive.content,
        )
        assertTrue(File(root, SystemsSplit3.PARITY_FIXTURE).isFile)

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        val gaps = kickoff.getValue("gaps").jsonObject
        assertEquals("false", gaps.getValue("systemsSplit3Incomplete").jsonPrimitive.content)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("systemsSplit3Incomplete"))
        // Soft-floor: Phase 4 closed systemsSplit3Incomplete → 19 open flags.
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 17)
    }
}
