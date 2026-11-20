package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.LocMidcheck6
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 6 — LOC mid-check scoreboard. */
class LocMidcheck6Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/loc-midcheck-6.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, LocMidcheck6.CATALOG).readText()).jsonObject
        assertEquals(LocMidcheck6.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(LocMidcheck6.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(LocMidcheck6.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(LocMidcheck6.MARKER, json.getValue("locMidcheck6Marker").jsonPrimitive.content)
        val mid = json.getValue("midcheck").jsonObject
        assertEquals(
            LocMidcheck6.MIDCHECK_PRODUCT_LOC,
            mid.getValue("productLoc").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            LocMidcheck6.PRODUCT_PROGRESS_PERCENT,
            mid.getValue("productLocProgressPercent").jsonPrimitive.content.toInt(),
        )
        val floors = json.getValue("interimSoftFloors").jsonObject
        assertEquals(
            LocMidcheck6.INTERIM_PRODUCT_FLOOR,
            floors.getValue("productLoc").jsonPrimitive.content.toInt(),
        )
        val baseline = json.getValue("priorBaseline").jsonObject
        assertEquals(
            LocMidcheck6.PRIOR_PRODUCT_LOC,
            baseline.getValue("productLoc").jsonPrimitive.content.toInt(),
        )
    }

    @Test
    fun wiringAndSoftFloors() {
        assertTrue(File(root, LocMidcheck6.PARITY_FIXTURE).isFile)
        assertTrue(File(root, "shared/ship/loc-midcheck.json").isFile)
        assertTrue(File(root, "shared/ship/freeze-5.0.0.json").isFile)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(6, listing.getValue("locMidcheck6Phase").jsonPrimitive.content.toInt())
        assertEquals(
            LocMidcheck6.CATALOG,
            listing.getValue("locMidcheck6Catalog").jsonPrimitive.content,
        )

        assertTrue(LocMidcheck6.meetsInterimFloor(LocMidcheck6.MIDCHECK_PRODUCT_LOC))
        assertTrue(LocMidcheck6.meetsPriorBaseline(LocMidcheck6.MIDCHECK_PRODUCT_LOC))
        assertTrue(LocMidcheck6.midcheckAligned(LocMidcheck6.MIDCHECK_PRODUCT_LOC))
        // Soft-floor: Phase 5 closed hostVmCapsIncomplete → 19 open flags (Phase 6 closes none).
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 17)
    }
}
