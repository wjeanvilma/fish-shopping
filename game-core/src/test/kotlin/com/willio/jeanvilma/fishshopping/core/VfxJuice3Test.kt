package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.VfxJuice3
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 24 — VFX/juice 3. */
class VfxJuice3Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, VfxJuice3.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, VfxJuice3.CATALOG).readText()).jsonObject
        assertEquals(VfxJuice3.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(VfxJuice3.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(VfxJuice3.EVENT_BURST_MIN, json.getValue("eventBurstMin").jsonPrimitive.int)
        assertEquals(VfxJuice3.EVENT_SHAKE_MIN, json.getValue("eventShakeMin").jsonPrimitive.int)
        assertEquals(VfxJuice3.TIDE_AMBIENT_MIN, json.getValue("tideAmbientMin").jsonPrimitive.int)
        assertEquals(VfxJuice3.EXTENDS_CATALOG, json.getValue("extendsCatalog").jsonPrimitive.content)
        assertEquals(VfxJuice3.SIM_HZ_INVARIANT, json.getValue("simHzInvariant").jsonPrimitive.int)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(24, listing.getValue("vfxJuice3Phase").jsonPrimitive.content.toInt())
        assertEquals(
            VfxJuice3.CATALOG,
            listing.getValue("vfxJuice3Catalog").jsonPrimitive.content,
        )

        val kickoff = Json.parseToJsonElement(File(root, VfxJuice3.KICKOFF_CATALOG).readText()).jsonObject
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 24,
        )

        for (id in VfxJuice3.EVENT_BURSTS) {
            assertTrue(json.getValue("eventBursts").jsonObject
                .getValue("kinds").jsonArray.any { it.jsonPrimitive.content == id })
        }
        for (id in VfxJuice3.EVENT_SHAKE) {
            assertTrue(json.getValue("eventShake").jsonObject
                .getValue("kinds").jsonArray.any { it.jsonPrimitive.content == id })
        }
        for (id in VfxJuice3.TIDE_PHASES) {
            assertTrue(json.getValue("ambientTide").jsonObject
                .getValue("phases").jsonArray.any { it.jsonPrimitive.content == id })
        }
    }

    @Test
    fun budgetGatePinsJuice3AndShakeCap() {
        val root = repoRoot()
        val gate = Json.parseToJsonElement(File(root, VfxJuice3.BUDGET_GATE_CATALOG).readText()).jsonObject
        assertEquals(24, gate.getValue("vfxJuice3Phase").jsonPrimitive.content.toInt())
        assertEquals(
            VfxJuice3.CATALOG,
            gate.getValue("vfxJuice3Catalog").jsonPrimitive.content,
        )
        assertEquals(
            VfxJuice3.MAX_SHAKE_AMPLITUDE_M,
            gate.getValue("maxShakeAmplitudeM").jsonPrimitive.content.toDouble(),
            1e-9,
        )
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(VfxJuice3.CATALOG, pin.getValue("vfxJuice3").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-vfx-juice-3.json"
            },
        )
    }
}
