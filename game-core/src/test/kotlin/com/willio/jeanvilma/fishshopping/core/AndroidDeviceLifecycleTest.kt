package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.lifecycle.AndroidDeviceLifecycle
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

/** Phase 13 (post-1.0) — Android device lifecycle matrix vs Phase 28 + host hooks. */
class AndroidDeviceLifecycleTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, AndroidDeviceLifecycle.CATALOG).isFile }
    }

    @Test
    fun matrixCoversRequiredScenariosAndDeviceClasses() {
        val matrix = Json.parseToJsonElement(File(root, AndroidDeviceLifecycle.CATALOG).readText()).jsonObject
        assertEquals(AndroidDeviceLifecycle.PHASE, matrix.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AndroidDeviceLifecycle.SCHEMA, matrix.getValue("schema").jsonPrimitive.content)
        assertEquals(AndroidDeviceLifecycle.PHASE28_CATALOG, matrix.getValue("phase28Catalog").jsonPrimitive.content)
        assertEquals(AndroidDeviceLifecycle.PACKAGE_NAME, matrix.getValue("packageName").jsonPrimitive.content)
        assertEquals(AndroidDeviceLifecycle.ACTIVITY, matrix.getValue("activity").jsonPrimitive.content)

        val scenarios = matrix.getValue("scenarios").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(AndroidDeviceLifecycle.SCENARIO_IDS, scenarios)

        val classes = matrix.getValue("deviceClasses").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(AndroidDeviceLifecycle.DEVICE_CLASS_IDS, classes)

        val slots = matrix.getValue("restoreSlots").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(AndroidDeviceLifecycle.RESTORE_SLOTS, slots)

        assertEquals("phone", AndroidDeviceLifecycle.deviceClassForWidthDp(411))
        assertEquals("tablet7", AndroidDeviceLifecycle.deviceClassForWidthDp(700))
        assertEquals("tablet10", AndroidDeviceLifecycle.deviceClassForWidthDp(900))
        assertFalse(AndroidDeviceLifecycle.shouldCheckpointForTrimLevel(5))
        assertTrue(AndroidDeviceLifecycle.shouldCheckpointForTrimLevel(AndroidDeviceLifecycle.TRIM_MEMORY_CHECKPOINT_FROM))
        assertTrue(AndroidDeviceLifecycle.shouldCheckpointForTrimLevel(20))
    }

    @Test
    fun phase28CatalogAlignsAndHostHooksExist() {
        val phase28 = Json.parseToJsonElement(File(root, AndroidDeviceLifecycle.PHASE28_CATALOG).readText()).jsonObject
        assertEquals(LifecyclePolicy.PHASE, phase28.getValue("phase").jsonPrimitive.content.toInt())
        val android = phase28.getValue("android").jsonObject
        val restore = android.getValue("processDeath").jsonObject
            .getValue("restoreFrom").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(AndroidDeviceLifecycle.RESTORE_SLOTS, restore)
        assertEquals(LifecyclePolicy.ANDROID_CONFIG_CHANGES, android.getValue("configChangesHandled").jsonArray.map {
            it.jsonPrimitive.content
        })

        val main = File(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/MainActivity.kt").readText()
        assertTrue(main.contains("onTrimMemory"))
        assertTrue(main.contains("onConfigurationChanged"))
        assertTrue(main.contains("game.pause()"))
        assertTrue(main.contains("game.resume()"))
        assertTrue(main.contains("game.onTrimMemory"))

        val vm = File(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt").readText()
        assertTrue(vm.contains("fun onTrimMemory"))
        assertTrue(vm.contains("AndroidDeviceLifecycle.shouldCheckpointForTrimLevel"))

        val manifest = File(root, "app/src/main/AndroidManifest.xml").readText()
        for (change in LifecyclePolicy.ANDROID_CONFIG_CHANGES) {
            assertTrue(manifest.contains(change))
        }
    }
}
