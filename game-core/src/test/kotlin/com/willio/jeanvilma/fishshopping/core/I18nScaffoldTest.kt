package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.core.ship.I18nScaffold
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

/** Finish 2.0 Phase 23 — i18n scaffold. */
class I18nScaffoldTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, I18nScaffold.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, I18nScaffold.CATALOG).readText()).jsonObject
        assertEquals(I18nScaffold.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(I18nScaffold.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(I18nScaffold.UI_STRING_KEY_MIN, json.getValue("uiStringKeyMin").jsonPrimitive.int)
        assertEquals(I18nScaffold.SECOND_LOCALE, json.getValue("secondLocale").jsonPrimitive.content)
        assertEquals(
            I18nScaffold.SUPPORTED_LOCALES,
            json.getValue("supportedLocales").jsonArray.map { it.jsonPrimitive.content },
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(23, listing.getValue("i18nScaffoldPhase").jsonPrimitive.content.toInt())
        assertEquals(
            I18nScaffold.CATALOG,
            listing.getValue("i18nScaffoldCatalog").jsonPrimitive.content,
        )
        assertEquals(
            listOf("en", "es"),
            listing.getValue("locales").jsonArray.map { it.jsonPrimitive.content },
        )
    }

    @Test
    fun uiStringKeyParityAndResolver() {
        val root = repoRoot()
        val en = Json.parseToJsonElement(File(root, "shared/i18n/ui-strings.en.json").readText()).jsonObject
        val es = Json.parseToJsonElement(File(root, "shared/i18n/ui-strings.es.json").readText()).jsonObject
        val enKeys = en.getValue("strings").jsonObject.keys
        val esKeys = es.getValue("strings").jsonObject.keys
        assertTrue(enKeys.size >= I18nScaffold.UI_STRING_KEY_MIN)
        assertEquals(enKeys, esKeys)
        assertEquals(enKeys, UiStrings.KEYS)
        assertEquals(enKeys.size, UiStrings.keyCount("en"))
        assertEquals(enKeys.size, UiStrings.keyCount("es"))

        UiStrings.setLocale("es")
        assertEquals("Pausa", UiStrings.t("nav.pause"))
        UiStrings.setLocale("en")
        assertEquals("Pause", UiStrings.t("nav.pause"))
        assertEquals("2/14", UiStrings.t("achievements.count", mapOf("unlocked" to 2, "total" to 14)))

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(I18nScaffold.CATALOG, pin.getValue("i18nScaffold").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-i18n-scaffold.json"
            },
        )
        assertTrue(File(root, "shared/store/locales/es.json").isFile)
        assertTrue(File(root, "app/src/main/res/values-es/strings.xml").isFile)
    }
}
