package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.perf.PerfBudgetGate
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 15 (post-1.0) — CI perf budget gate vs Phase 26 device matrix. */
class PerfBudgetGateTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, PerfBudgetGate.CATALOG).isFile }
    }

    @Test
    fun gateMatchesPhase26MatrixAndSimHzInvariant() {
        val gate = Json.parseToJsonElement(File(root, PerfBudgetGate.CATALOG).readText()).jsonObject
        assertEquals(PerfBudgetGate.PHASE, gate.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(PerfBudgetGate.SCHEMA, gate.getValue("schema").jsonPrimitive.content)
        assertEquals(PerfBudgetGate.PHASE26_CATALOG, gate.getValue("phase26Catalog").jsonPrimitive.content)
        assertEquals(PerfBudgetGate.SIM_HZ, gate.getValue("simHzInvariant").jsonPrimitive.content.toInt())

        val matrix = Json.parseToJsonElement(File(root, PerfBudgetGate.PHASE26_CATALOG).readText()).jsonObject
        assertEquals(26, matrix.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(PerfBudgetGate.PHASE, matrix.getValue("budgetGatePhase").jsonPrimitive.content.toInt())

        val budgets = gate.getValue("budgets").jsonObject
        val android = budgets.getValue("android").jsonObject
        val web = budgets.getValue("web").jsonObject
        assertEquals(PerfBudgetGate.ANDROID_TARGET_FPS, android.getValue("targetFps").jsonPrimitive.content.toInt())
        assertEquals(PerfBudgetGate.WEB_TARGET_FPS, web.getValue("targetFps").jsonPrimitive.content.toInt())
        assertEquals(
            PerfBudgetGate.ANDROID_MEDIUM_MS,
            android.getValue("frameTargetMs").jsonObject.getValue("medium").jsonPrimitive.content.toDouble(),
            0.01,
        )
        assertEquals(
            PerfBudgetGate.WEB_MEDIUM_MS,
            web.getValue("frameTargetMs").jsonObject.getValue("medium").jsonPrimitive.content.toDouble(),
            0.01,
        )
        assertEquals(PerfBudgetGate.ANDROID_DOWNGRADE_STREAK, android.getValue("downgradeStreakFrames").jsonPrimitive.content.toInt())
        assertEquals(PerfBudgetGate.WEB_DOWNGRADE_STREAK, web.getValue("downgradeStreakFrames").jsonPrimitive.content.toInt())
        assertEquals(PerfBudgetGate.OVER_BUDGET_MULT, android.getValue("overBudgetMultiplier").jsonPrimitive.content.toDouble(), 0.001)
        assertEquals(PerfBudgetGate.HARBOR_CACHE_LIMIT, gate.getValue("harborCacheLimit").jsonPrimitive.content.toInt())
        assertEquals(
            PerfBudgetGate.WEB_MEDIUM_MAX_CSS_HEIGHT,
            web.getValue("maxCssHeightMedium").jsonPrimitive.content.toInt(),
        )

        val matrixAndroid = matrix.getValue("platforms").jsonObject.getValue("android").jsonObject
        assertEquals(
            PerfBudgetGate.ANDROID_MEDIUM_MS,
            matrixAndroid.getValue("frameTargetMs").jsonObject.getValue("medium").jsonPrimitive.content.toDouble(),
            0.01,
        )
        assertEquals(
            PerfBudgetGate.OVER_BUDGET_MULT,
            PerfBudgetGate.overBudgetThresholdMs(100.0) / 100.0,
            0.001,
        )
    }

    @Test
    fun presenterCapsAndFailCriteriaDocumented() {
        val gate = Json.parseToJsonElement(File(root, PerfBudgetGate.CATALOG).readText()).jsonObject
        val caps = gate.getValue("presenterCaps").jsonObject
        assertEquals(PerfBudgetGate.CROWD_CAPS["low"], caps.getValue("crowd").jsonObject.getValue("low").jsonPrimitive.content.toInt())
        assertEquals(PerfBudgetGate.FLY_CAPS["medium"], caps.getValue("fly").jsonObject.getValue("medium").jsonPrimitive.content.toInt())
        assertEquals(PerfBudgetGate.BURST_CAPS["high"], caps.getValue("burst").jsonObject.getValue("high").jsonPrimitive.content.toInt())

        assertTrue(gate.getValue("failCriteria").jsonArray.size >= 3)
        assertTrue(gate.getValue("deviceChecklist").jsonArray.size >= 3)
        val raw = File(root, PerfBudgetGate.CATALOG).readText()
        assertTrue(raw.contains("frameTargetMs drift"))
        assertTrue(raw.contains("20 Hz"))

        val androidFt = File(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt").readText()
        assertTrue(androidFt.contains("33.3"))
        assertTrue(androidFt.contains("FRAME_DOWNGRADE_STREAK = 45"))
    }
}
