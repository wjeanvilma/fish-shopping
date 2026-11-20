package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.HostVmCaps
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 5 — GameViewModel ≤1200 + GameHost ≤1100. */
class HostVmCapsTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/host-vm-caps.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, HostVmCaps.CATALOG).readText()).jsonObject
        assertEquals(HostVmCaps.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(HostVmCaps.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(HostVmCaps.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(HostVmCaps.MARKER, json.getValue("hostVmCapsMarker").jsonPrimitive.content)
        assertEquals(
            HostVmCaps.VIEW_MODEL_MAX_LINES,
            json.getValue("viewModelMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            HostVmCaps.GAME_HOST_MAX_LINES,
            json.getValue("gameHostMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(HostVmCaps.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(HostVmCaps.REQUIRED_FILES, required)
    }

    @Test
    fun facadesSlimAndModulesExtracted() {
        val vm = File(root, HostVmCaps.VIEW_MODEL_PATH)
        val host = File(root, HostVmCaps.GAME_HOST_PATH)
        assertTrue(vm.isFile)
        assertTrue(host.isFile)
        assertTrue(HostVmCaps.viewModelSlim(vm.readLines().size))
        assertTrue(HostVmCaps.gameHostSlim(host.readLines().size))
        assertTrue(vm.readLines().size < 1600)
        assertTrue(host.readLines().size < 1400)

        var present = 0
        for (rel in HostVmCaps.REQUIRED_FILES) {
            assertTrue("missing $rel", File(root, rel).isFile)
            present += 1
        }
        assertTrue(HostVmCaps.extractedEnough(present))

        val vmBody = vm.readText()
        assertTrue(vmBody.contains("VmStepBus"))
        assertTrue(vmBody.contains("VmCloudBoot"))
        assertFalse(vmBody.contains("resolveCatchBurst"))

        val hostBody = host.readText()
        assertTrue(hostBody.contains("HostCloudBoot"))
        assertTrue(hostBody.contains("HostEntitlements"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(5, listing.getValue("hostVmCapsPhase").jsonPrimitive.content.toInt())
        assertEquals(HostVmCaps.CATALOG, listing.getValue("hostVmCapsCatalog").jsonPrimitive.content)
        assertTrue(File(root, HostVmCaps.PARITY_FIXTURE).isFile)

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        val gaps = kickoff.getValue("gaps").jsonObject
        assertEquals("false", gaps.getValue("hostVmCapsIncomplete").jsonPrimitive.content)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("hostVmCapsIncomplete"))
        // Soft-floor: Phase 5 closed hostVmCapsIncomplete → 19 open flags.
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 17)
    }
}
