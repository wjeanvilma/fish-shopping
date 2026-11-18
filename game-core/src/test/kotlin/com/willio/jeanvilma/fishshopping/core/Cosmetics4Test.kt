package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.ship.Cosmetics4
import com.willio.jeanvilma.fishshopping.core.sim.CosmeticPresentation
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Command
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 18 — cosmetics/IAP 12→18 power-neutral. */
class Cosmetics4Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Cosmetics4.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Cosmetics4.CATALOG).readText()).jsonObject
        assertEquals(Cosmetics4.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Cosmetics4.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Cosmetics4.COSMETICS_4_MARKER, json.getValue("cosmetics4Marker").jsonPrimitive.content)
        assertEquals(Cosmetics4.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 25)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(18, listing.getValue("cosmetics4Phase").jsonPrimitive.content.toInt())

        val kickoff = Json.parseToJsonElement(File(root, "shared/ship/finish-4.0-kickoff.json").readText()).jsonObject
        assertTrue(kickoff.getValue("baseline").jsonObject.getValue("cosmetics").jsonPrimitive.int >= 18)
        assertFalse(kickoff.getValue("gaps").jsonObject.getValue("contentFloorsShort").jsonPrimitive.boolean)
    }

    @Test
    fun entitlementsAndEngineReachEighteen() {
        val root = repoRoot()
        val entitlements = Json.parseToJsonElement(File(root, "shared/billing/entitlements.json").readText()).jsonObject
        val cosmetics = entitlements.getValue("cosmetics").jsonArray
        assertTrue(cosmetics.size >= Cosmetics4.COSMETICS_MIN)
        assertTrue(CosmeticsIapSystem.CATALOG.size >= Cosmetics4.COSMETICS_MIN)
        assertTrue(CosmeticPresentation.ITEMS.size >= Cosmetics4.COSMETICS_MIN)
        for (id in Cosmetics4.NEW_COSMETIC_IDS) {
            assertTrue(id, id in CosmeticsIapSystem.GRANTED_COSMETICS)
            assertTrue(id, CosmeticPresentation.BY_ID.containsKey(id))
        }
        assertTrue(CosmeticPresentation.isPowerNeutralIapCatalog())
    }

    @Test
    fun grantsMistBuntingPowerNeutral() {
        val sku = CosmeticsIapSystem.BY_SKU.getValue("fish.cosmetic.mist_bunting")
        val sim = Simulation(
            Shared.content,
            GameState.newGame(Shared.content, "harbor.sunrise_pier", 1818),
        )
        val beforeCoins = sim.state.coins
        val req = CosmeticsIapSystem.requestIdForPurchaseToken(sku.sku, "tok-mist")
        sim.checkedStep(
            listOf(Command.GrantIapCosmetic(sku.grantsCosmetic, req)),
        )
        assertTrue(sku.grantsCosmetic in sim.state.unlockedCosmetics)
        assertEquals(beforeCoins, sim.state.coins)
        assertFalse(Shared.content.decor.items.any { it.requiresCosmetic == sku.grantsCosmetic })
    }
}
