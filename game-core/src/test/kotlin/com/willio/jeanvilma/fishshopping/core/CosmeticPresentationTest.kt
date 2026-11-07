package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.sim.CosmeticPresentation
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 24 (post-1.0) — cosmetic equip/preview presentation. */
class CosmeticPresentationTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, CosmeticPresentation.CATALOG).isFile }
    }

    @Test
    fun catalogLocksPowerNeutralEquipPreview() {
        val catalog = Json.parseToJsonElement(File(root, CosmeticPresentation.CATALOG).readText()).jsonObject
        assertEquals(CosmeticPresentation.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(CosmeticPresentation.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(21, catalog.getValue("schemaVersion").jsonPrimitive.content.toInt())
        assertTrue(
            catalog.getValue("constraints").jsonObject
                .getValue("powerNeutral").jsonPrimitive.content.toBoolean(),
        )
        assertTrue(
            catalog.getValue("constraints").jsonObject
                .getValue("equipInSettingsNotSave").jsonPrimitive.content.toBoolean(),
        )
        assertEquals(
            CosmeticPresentation.MAX_EQUIPPED,
            catalog.getValue("slot").jsonObject.getValue("maxEquipped").jsonPrimitive.content.toInt(),
        )
        assertTrue(CosmeticPresentation.isPowerNeutralIapCatalog())
        assertEquals(CosmeticsIapSystem.CATALOG.size, CosmeticPresentation.ITEMS.size)
    }

    @Test
    fun sanitizeAndPreviewRulesAndHostsWireUx() {
        val unlocked = setOf("banner.iap_sunset_bunting")
        assertNull(CosmeticPresentation.sanitizeEquipped("banner.iap_pearl_string", unlocked))
        assertEquals(
            "banner.iap_sunset_bunting",
            CosmeticPresentation.sanitizeEquipped("banner.iap_sunset_bunting", unlocked),
        )
        assertEquals(
            "banner.iap_captain_crest",
            CosmeticPresentation.resolveVisible(null, "banner.iap_captain_crest", unlocked),
        )
        assertEquals("Sunset bunting", CosmeticPresentation.titleFor("banner.iap_sunset_bunting"))

        val settings = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/persistence/SettingsStore.kt",
        ).readText()
        assertTrue(settings.contains("equippedCosmeticId"))
        val app = File(root, "web/src/ui/App.tsx").readText()
        assertTrue(app.contains("onEquipCosmetic"))
        assertTrue(app.contains("onPreviewCosmetic"))
        val hud = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
        ).readText()
        assertTrue(hud.contains("onEquipCosmetic"))
        assertTrue(hud.contains("onPreviewCosmetic"))
    }
}
