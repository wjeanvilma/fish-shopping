package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.render.FrameTiming
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class DeviceMatrixTest {
    @Test
    fun catalogDocumentsAndroid30AndWeb60Budgets() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/perf/device-matrix.json").isFile }
        }
        val json = JSONObject(File(root, "shared/perf/device-matrix.json").readText())
        assertEquals(26, json.getInt("phase"))
        assertEquals("fish.perf.device_matrix.v1", json.getString("schema"))
        assertEquals(2, json.getInt("harborCacheLimit"))
        assertEquals(FrameTiming.HARBOR_CACHE_LIMIT, json.getInt("harborCacheLimit"))

        val android = json.getJSONObject("platforms").getJSONObject("android")
        assertEquals(30, android.getInt("targetFps"))
        assertEquals(33.3, android.getJSONObject("frameTargetMs").getDouble("medium"), 0.05)
        assertEquals(45, android.getInt("downgradeStreakFrames"))
        assertEquals(FrameTiming.FRAME_DOWNGRADE_STREAK, android.getInt("downgradeStreakFrames"))
        assertEquals(
            FrameTiming.targetMs(com.willio.jeanvilma.fishshopping.persistence.QualityPreset.MEDIUM),
            android.getJSONObject("frameTargetMs").getDouble("medium"),
            0.05,
        )

        val web = json.getJSONObject("platforms").getJSONObject("web")
        assertEquals(60, web.getInt("targetFps"))
        assertEquals(1080, web.getInt("maxCssHeightMedium"))
        assertEquals(16.7, web.getJSONObject("frameTargetMs").getDouble("medium"), 0.05)
        assertEquals(90, web.getInt("downgradeStreakFrames"))

        val steps = json.getJSONObject("autoDowngrade").getJSONArray("steps")
        assertTrue((0 until steps.length()).any { steps.getString(it).contains("high→medium") })
    }
}
