package com.willio.jeanvilma.fishshopping.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ReleaseHardeningTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/android/release-hardening.json").isFile }
    }

    @Test
    fun catalogDocumentsR8BackupAndCiGates() {
        val json = Json.parseToJsonElement(File(root, "shared/android/release-hardening.json").readText()).jsonObject
        assertEquals(27, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals("fish.android.release_hardening.v1", json.getValue("schema").jsonPrimitive.content)
        assertEquals(37, json.getValue("compileSdk").jsonPrimitive.content.toInt())
        assertEquals("2.4.0", json.getValue("kotlin").jsonPrimitive.content)
        assertEquals("1.77.3", json.getValue("filament").jsonPrimitive.content)
        assertTrue(json.getValue("minify").jsonObject.getValue("enabled").jsonPrimitive.content.toBoolean())
        assertEquals(":app:bundleRelease", json.getValue("ci").jsonObject.getValue("task").jsonPrimitive.content)
        assertEquals(
            "app/build/outputs/bundle/release/app-release.aab",
            json.getValue("ci").jsonObject.getValue("artifacts").jsonObject.getValue("aab").jsonPrimitive.content,
        )
        assertEquals(
            "app/build/outputs/mapping/release/mapping.txt",
            json.getValue("ci").jsonObject.getValue("artifacts").jsonObject.getValue("mapping").jsonPrimitive.content,
        )

        val files = json.getValue("backupExcludes").jsonObject.getValue("files").jsonArray.map {
            it.jsonPrimitive.content
        }
        assertTrue(files.contains("harbor_save_latest.json"))
        assertTrue(files.contains("harbor_save_previous.json"))
        assertTrue(files.any { it.endsWith(".new") })
    }

    @Test
    fun backupXmlExcludesCorruptibleSaveSlots() {
        val extraction = File(root, "app/src/main/res/xml/data_extraction_rules.xml").readText()
        val backup = File(root, "app/src/main/res/xml/backup_rules.xml").readText()
        for (path in listOf(
            "harbor_save_latest.json",
            "harbor_save_previous.json",
            "harbor_save_latest.json.new",
            "harbor_save_previous.json.new",
            "fish_shopping_entitlements.xml",
            "fish_shopping_pending_entitlements.xml",
        )) {
            assertTrue("missing exclude $path in data_extraction_rules", extraction.contains(path))
            assertTrue("missing exclude $path in backup_rules", backup.contains(path))
        }
        assertTrue(extraction.contains("<cloud-backup>"))
        assertTrue(extraction.contains("<device-transfer>"))
        assertTrue(File(root, "app/proguard-rules.pro").isFile)
        assertTrue(File(root, "app/proguard-rules.pro").readText().contains("filament"))
    }
}
