package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.lifecycle.BrowserMatrix
import com.willio.jeanvilma.fishshopping.core.lifecycle.LifecyclePolicy
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 14 (post-1.0) — browser matrix vs Phase 28 web gates. */
class BrowserMatrixTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, BrowserMatrix.CATALOG).isFile }
    }

    @Test
    fun matrixCoversChromeSafariFirefoxAndRequiredScenarios() {
        val matrix = Json.parseToJsonElement(File(root, BrowserMatrix.CATALOG).readText()).jsonObject
        assertEquals(BrowserMatrix.PHASE, matrix.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(BrowserMatrix.SCHEMA, matrix.getValue("schema").jsonPrimitive.content)
        assertEquals(BrowserMatrix.PHASE28_CATALOG, matrix.getValue("phase28Catalog").jsonPrimitive.content)

        val browsers = matrix.getValue("browsers").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(BrowserMatrix.BROWSER_IDS, browsers)

        val scenarios = matrix.getValue("scenarios").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(BrowserMatrix.SCENARIO_IDS, scenarios)

        val unlock = matrix.getValue("audioUnlockEvents").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(BrowserMatrix.AUDIO_UNLOCK_EVENTS, unlock)
        assertTrue(unlock.contains("touchstart"))
        assertTrue(matrix.getValue("webgl2Required").jsonPrimitive.content.toBoolean())
        assertEquals(
            BrowserMatrix.STORAGE_FALLBACK,
            matrix.getValue("storageQuota").jsonObject.getValue("fallback").jsonPrimitive.content,
        )
        assertTrue(BrowserMatrix.isQuotaErrorName("QuotaExceededError"))
        assertTrue(BrowserMatrix.isQuotaErrorName("NS_ERROR_DOM_QUOTA_REACHED"))
        assertFalse(BrowserMatrix.isQuotaErrorName("TypeError"))
    }

    @Test
    fun phase28AudioUnlockAndHostHooksAlign() {
        val phase28 = Json.parseToJsonElement(File(root, BrowserMatrix.PHASE28_CATALOG).readText()).jsonObject
        assertEquals(LifecyclePolicy.PHASE, phase28.getValue("phase").jsonPrimitive.content.toInt())
        val web = phase28.getValue("web").jsonObject
        assertEquals(BrowserMatrix.PHASE, web.getValue("browserMatrixPhase").jsonPrimitive.content.toInt())
        val unlock = web.getValue("audioGesture").jsonObject
            .getValue("unlockEvents").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(BrowserMatrix.AUDIO_UNLOCK_EVENTS, unlock)

        val policy = File(root, "web/src/game/lifecyclePolicy.ts").readText()
        assertTrue(policy.contains("touchstart"))
        val save = File(root, "web/src/game/saveStore.ts").readText()
        assertTrue(save.contains("isQuotaExceededError"))
        assertTrue(save.contains("withQuotaFallback"))
        val harbor = File(root, "web/src/render/HarborScene.ts").readText()
        assertTrue(harbor.contains("webglcontextlost"))
        assertTrue(harbor.contains("preventDefault"))
        val app = File(root, "web/src/ui/App.tsx").readText()
        assertTrue(app.contains("hasWebGL2"))
        assertTrue(app.contains("lifecycle.webgl2Gate"))
        assertTrue(File(root, "web/src/game/lifecyclePolicy.ts").readText().contains("WEBGL2_GATE_COPY"))
    }
}
