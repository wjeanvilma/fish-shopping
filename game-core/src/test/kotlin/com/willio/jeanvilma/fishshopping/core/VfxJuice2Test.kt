package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.VfxJuice2
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 22 — VFX/juice 2. */
class VfxJuice2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, VfxJuice2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, VfxJuice2.CATALOG).readText()).jsonObject
        assertEquals(VfxJuice2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(VfxJuice2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(VfxJuice2.EVENT_BURST_MIN, json.getValue("eventBurstMin").jsonPrimitive.int)
        assertEquals(VfxJuice2.EVENT_SHAKE_MIN, json.getValue("eventShakeMin").jsonPrimitive.int)
        assertEquals(VfxJuice2.WEATHER_AMBIENT_MIN, json.getValue("weatherAmbientMin").jsonPrimitive.int)
        assertEquals(VfxJuice2.EXTENDS_CATALOG, json.getValue("extendsCatalog").jsonPrimitive.content)
        assertEquals(VfxJuice2.SIM_HZ_INVARIANT, json.getValue("simHzInvariant").jsonPrimitive.int)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(22, listing.getValue("vfxJuice2Phase").jsonPrimitive.content.toInt())
        assertEquals(
            VfxJuice2.CATALOG,
            listing.getValue("vfxJuice2Catalog").jsonPrimitive.content,
        )

        for (id in VfxJuice2.EVENT_BURSTS) {
            assertTrue(json.getValue("eventBursts").jsonObject.getValue("kinds").jsonArray.any {
                it.jsonPrimitive.content == id
            })
        }
        for (id in VfxJuice2.EVENT_SHAKE) {
            assertTrue(json.getValue("eventShake").jsonObject.getValue("kinds").jsonArray.any {
                it.jsonPrimitive.content == id
            })
        }
        for (id in VfxJuice2.WEATHER_PATTERNS) {
            assertTrue(json.getValue("ambientWeather").jsonObject.getValue("patterns").jsonArray.any {
                it.jsonPrimitive.content == id
            })
        }
        assertTrue(
            json.getValue("eventBursts").jsonObject.getValue("sharesBurstPool").jsonPrimitive.booleanOrNull == true,
        )
        assertFalse(
            json.getValue("ambientWeather").jsonObject.getValue("consumesBurstPool").jsonPrimitive.booleanOrNull == true,
        )
    }

    @Test
    fun budgetGateKeepsPost10VfxAndAddsPack2() {
        val root = repoRoot()
        val gate = Json.parseToJsonElement(File(root, VfxJuice2.BUDGET_GATE_CATALOG).readText()).jsonObject
        assertEquals(21, gate.getValue("vfxJuicePhase").jsonPrimitive.content.toInt())
        assertEquals(22, gate.getValue("vfxJuice2Phase").jsonPrimitive.content.toInt())
        assertEquals(
            VfxJuice2.CATALOG,
            gate.getValue("vfxJuice2Catalog").jsonPrimitive.content,
        )
        assertEquals(
            VfxJuice2.MAX_SHAKE_AMPLITUDE_M,
            gate.getValue("maxShakeAmplitudeM").jsonPrimitive.content.toDouble(),
            1e-9,
        )
        val v1 = Json.parseToJsonElement(File(root, VfxJuice2.EXTENDS_CATALOG).readText()).jsonObject
        assertEquals(21, v1.getValue("phase").jsonPrimitive.content.toInt())
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(VfxJuice2.CATALOG, pin.getValue("vfxJuice2").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-vfx-juice-2.json"
            },
        )
    }
}
