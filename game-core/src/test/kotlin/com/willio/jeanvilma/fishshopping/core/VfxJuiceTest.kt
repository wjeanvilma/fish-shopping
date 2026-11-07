package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.perf.PerfBudgetGate
import com.willio.jeanvilma.fishshopping.core.perf.VfxJuice
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 21 (post-1.0) — VFX juice under perf budget gate. */
class VfxJuiceTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, VfxJuice.CATALOG).isFile }
    }

    @Test
    fun catalogLocksCatchCutSaleShakeUnderBudgetGate() {
        val catalog = Json.parseToJsonElement(File(root, VfxJuice.CATALOG).readText()).jsonObject
        assertEquals(VfxJuice.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(VfxJuice.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(VfxJuice.SIM_HZ, catalog.getValue("simHzInvariant").jsonPrimitive.content.toInt())

        val kinds = catalog.getValue("bursts").jsonObject.getValue("kinds").jsonArray.map {
            it.jsonPrimitive.content
        }
        assertEquals(VfxJuice.BURST_KINDS, kinds)

        val shake = catalog.getValue("shake").jsonObject
        assertEquals(
            VfxJuice.MAX_SHAKE_AMPLITUDE_M.toString(),
            shake.getValue("maxAmplitudeM").jsonPrimitive.content,
        )
        assertTrue(
            catalog.getValue("feedback").jsonObject
                .getValue("catchBurstOnEveryCatch").jsonPrimitive.content.toBoolean(),
        )

        assertEquals(0.04, VfxJuice.cappedShakeAmplitudeM("catch", "high"), 1e-9)
        assertEquals(0.02, VfxJuice.cappedShakeAmplitudeM("catch", "low"), 1e-9)
        assertTrue(VfxJuice.cappedShakeAmplitudeM("celebrate", "high") <= VfxJuice.MAX_SHAKE_AMPLITUDE_M)
    }

    @Test
    fun budgetsMatchPerfGateAndHostsWireCatchShake() {
        val catalog = Json.parseToJsonElement(File(root, VfxJuice.CATALOG).readText()).jsonObject
        val gate = Json.parseToJsonElement(File(root, VfxJuice.BUDGET_GATE).readText()).jsonObject
        assertEquals(VfxJuice.PHASE, gate.getValue("vfxJuicePhase").jsonPrimitive.content.toInt())
        assertEquals(VfxJuice.CATALOG, gate.getValue("vfxJuiceCatalog").jsonPrimitive.content)
        assertEquals(PerfBudgetGate.VFX_JUICE_PHASE, VfxJuice.PHASE)

        val burstCaps = catalog.getValue("bursts").jsonObject.getValue("poolByQuality").jsonObject
        for ((q, n) in VfxJuice.BURST_CAPS) {
            assertEquals(n, burstCaps.getValue(q).jsonPrimitive.content.toInt())
            assertEquals(
                n,
                gate.getValue("presenterCaps").jsonObject.getValue("burst").jsonObject
                    .getValue(q).jsonPrimitive.content.toInt(),
            )
        }

        val webPr = File(root, "web/src/render/presenters.ts").readText()
        assertTrue(webPr.contains("ScreenShake"))
        assertTrue(webPr.contains("\"catch\""))
        val androidPr = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/Presenters.kt",
        ).readText()
        assertTrue(androidPr.contains("class ScreenShake"))
        assertTrue(androidPr.contains("CATCH"))

        val host = File(root, "web/src/game/GameHost.ts").readText()
        assertTrue(host.contains("resolveCatchBurst"))
        assertTrue(host.contains("drainShakes"))
        val vm = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt",
        ).readText()
        assertTrue(vm.contains("resolveCatchBurst"))
        assertTrue(vm.contains("drainShakes"))
    }
}
