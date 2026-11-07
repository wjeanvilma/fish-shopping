package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.LicensesNotice
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 12 (post-1.0) — in-app OSS licenses screen + Filament/Three attributions. */
class LicensesNoticeTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, LicensesNotice.CATALOG).isFile }
    }

    @Test
    fun catalogOssNoticesMatchConstantsAndRequiredEngines() {
        val catalog = Json.parseToJsonElement(File(root, LicensesNotice.CATALOG).readText()).jsonObject
        assertEquals(LicensesNotice.PHASE, catalog.getValue("licensesUiPhase").jsonPrimitive.content.toInt())
        assertEquals(LicensesNotice.ASSET_SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(LicensesNotice.SCREEN_TITLE, catalog.getValue("screenTitle").jsonPrimitive.content)
        assertEquals(LicensesNotice.SCREEN_INTRO, catalog.getValue("screenIntro").jsonPrimitive.content)

        val notices = catalog.getValue("ossNotices").jsonArray.map { it.jsonObject }
        assertEquals(LicensesNotice.OSS_NOTICES.size, notices.size)
        for ((expected, actual) in LicensesNotice.OSS_NOTICES.zip(notices)) {
            assertEquals(expected.id, actual.getValue("id").jsonPrimitive.content)
            assertEquals(expected.name, actual.getValue("name").jsonPrimitive.content)
            assertEquals(expected.version, actual.getValue("version").jsonPrimitive.content)
            assertEquals(expected.spdx, actual.getValue("spdx").jsonPrimitive.content)
            assertEquals(expected.url, actual.getValue("url").jsonPrimitive.content)
            assertEquals(expected.notice, actual.getValue("notice").jsonPrimitive.content)
        }

        val required = catalog.getValue("requiredOssIds").jsonArray.map { it.jsonPrimitive.content }.toSet()
        assertEquals(LicensesNotice.REQUIRED_OSS_IDS, required)
        assertTrue(required.contains("filament"))
        assertTrue(required.contains("three"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(LicensesNotice.PHASE, listing.getValue("licensesUiPhase").jsonPrimitive.content.toInt())
    }

    @Test
    fun versionsMatchGradleAndNpmPins() {
        val toml = File(root, "gradle/libs.versions.toml").readText()
        val filament = LicensesNotice.OSS_NOTICES.first { it.id == "filament" }
        assertTrue(toml.contains("filament = \"${filament.version}\""))
        val kotlin = LicensesNotice.OSS_NOTICES.first { it.id == "kotlin" }
        assertTrue(toml.contains("kotlin = \"${kotlin.version}\""))

        val pkg = Json.parseToJsonElement(File(root, "web/package.json").readText()).jsonObject
        val deps = pkg.getValue("dependencies").jsonObject
        val three = LicensesNotice.OSS_NOTICES.first { it.id == "three" }
        assertEquals(three.version, deps.getValue("three").jsonPrimitive.content)
        val react = LicensesNotice.OSS_NOTICES.first { it.id == "react" }
        assertEquals(react.version, deps.getValue("react").jsonPrimitive.content)

        val lines = LicensesNotice.displayLines()
        assertTrue(lines.any { it.contains("Filament") })
        assertTrue(lines.any { it.contains("three.js") })
        assertTrue(lines.first().contains("first-party") || lines.first().contains("Fish Shopping"))
    }
}
