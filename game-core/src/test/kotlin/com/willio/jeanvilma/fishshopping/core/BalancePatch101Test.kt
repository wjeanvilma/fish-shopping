package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.BalancePatch101
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 23 (post-1.0) — balance patch 1.0.1 / schema 20. */
class BalancePatch101Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, BalancePatch101.CATALOG).isFile }
    }

    @Test
    fun catalogLocksPatchAndSchema() {
        val catalog = Json.parseToJsonElement(File(root, BalancePatch101.CATALOG).readText()).jsonObject
        assertEquals(BalancePatch101.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(BalancePatch101.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(BalancePatch101.FROM_VERSION, catalog.getValue("fromContentVersion").jsonPrimitive.content)
        assertEquals(BalancePatch101.TO_VERSION, catalog.getValue("toContentVersion").jsonPrimitive.content)
        assertEquals(BalancePatch101.SCHEMA_VERSION, catalog.getValue("schemaVersion").jsonPrimitive.content.toInt())
        assertTrue(catalog.getValue("constraints").jsonObject.getValue("noSchemaBreak").jsonPrimitive.content.toBoolean())
        assertEquals(
            BalancePatch101.SCHEMA_VERSION,
            catalog.getValue("constraints").jsonObject.getValue("keepSchemaVersion").jsonPrimitive.content.toInt(),
        )
    }

    @Test
    fun packAndPinCarryTweaksAt101() {
        val pack = Json.parseToJsonElement(File(root, BalancePatch101.CONTENT_PACK).readText()).jsonObject
        // Finish 2.0 Phase 30 freezes pack at 2.0.0 while retaining the 1.0.1 balance tweaks.
        assertEquals("2.0.0", pack.getValue("contentVersion").jsonPrimitive.content)

        val upgrades = pack.getValue("upgrades").jsonArray.map { it.jsonObject }
        val bag = upgrades.first { it.getValue("id").jsonPrimitive.content == "upgrade.bag_capacity_2" }
        assertEquals(BalancePatch101.BAG_CAPACITY_2_COST, bag.getValue("cost").jsonPrimitive.content.toInt())

        val products = pack.getValue("products").jsonArray.map { it.jsonObject }
        val basic = products.first { it.getValue("id").jsonPrimitive.content == "product.basic_portion" }
        val fillet = products.first { it.getValue("id").jsonPrimitive.content == "product.fillet" }
        assertEquals(BalancePatch101.BASIC_PORTION_UNIT_PRICE, basic.getValue("unitPrice").jsonPrimitive.content.toInt())
        assertEquals(BalancePatch101.FILLET_UNIT_PRICE, fillet.getValue("unitPrice").jsonPrimitive.content.toInt())

        val workers = pack.getValue("workers").jsonArray.map { it.jsonObject }
        val porter = workers.first { it.getValue("id").jsonPrimitive.content == "worker.porter" }
        val fisher = workers.first { it.getValue("id").jsonPrimitive.content == "worker.fisher" }
        assertEquals(BalancePatch101.PORTER_HIRE_COST, porter.getValue("hireCost").jsonPrimitive.content.toInt())
        assertEquals(BalancePatch101.FISHER_HIRE_COST, fisher.getValue("hireCost").jsonPrimitive.content.toInt())

        val sp = pack.getValue("staffProgression").jsonObject
        assertEquals(BalancePatch101.XP_FISH_CAUGHT, sp.getValue("xpFishCaught").jsonPrimitive.content.toInt())
        assertEquals(BalancePatch101.XP_SALE_ASSISTED, sp.getValue("xpSaleAssisted").jsonPrimitive.content.toInt())
        assertEquals(
            BalancePatch101.XP_THRESHOLDS,
            sp.getValue("xpThresholds").jsonArray.map { it.jsonPrimitive.content.toInt() },
        )
        assertEquals(
            BalancePatch101.REPAIR_COINS,
            pack.getValue("economy").jsonObject.getValue("wear").jsonObject
                .getValue("repairCoins").jsonPrimitive.content.toInt(),
        )

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals("2.0.0", pin.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(3, pin.getValue("versionCode").jsonPrimitive.content.toInt())
        assertTrue(pin.getValue("schemaVersion").jsonPrimitive.content.toInt() >= 21)
        assertEquals(
            "1.0.0",
            pin.getValue("storeRelease").jsonObject.getValue("contentVersion").jsonPrimitive.content,
        )
        assertEquals(BalancePatch101.CATALOG, pin.getValue("balancePatch").jsonPrimitive.content)
    }
}
