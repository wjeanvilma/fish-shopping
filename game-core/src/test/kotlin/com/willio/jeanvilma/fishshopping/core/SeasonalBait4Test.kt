package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.SeasonalBait4
import com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 16 — seasonal→12, baits→12, mastery depth. */
class SeasonalBait4Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/seasonal-bait-4.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, SeasonalBait4.CATALOG).readText()).jsonObject
        assertEquals(SeasonalBait4.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SeasonalBait4.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            SeasonalBait4.SEASONAL_BAIT_4_MARKER,
            json.getValue("seasonalBait4Marker").jsonPrimitive.content,
        )
        assertEquals(4, json.getValue("newEvents").jsonArray.size)
        assertEquals(4, json.getValue("newBaits").jsonArray.size)
        assertEquals(3, json.getValue("newTechniques").jsonArray.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(16, listing.getValue("seasonalBait4Phase").jsonPrimitive.content.toInt())
        assertEquals(SeasonalBait4.CATALOG, listing.getValue("seasonalBait4Catalog").jsonPrimitive.content)
    }

    @Test
    fun contentMeetsFloorsAndMasteryDepth() {
        assertTrue(Shared.content.seasonalEvents.events.size >= SeasonalBait4.SEASONAL_EVENTS_MIN)
        assertTrue(Shared.content.bait.size >= SeasonalBait4.BAITS_MIN)
        assertTrue(Shared.content.fishingMastery.maxLevel >= SeasonalBait4.MASTERY_MAX_LEVEL)
        assertTrue(Shared.content.fishingMastery.techniques.size >= SeasonalBait4.MASTERY_TECHNIQUES_MIN)
        assertTrue(Shared.content.fishingMastery.coachingTips.size >= SeasonalBait4.MASTERY_COACHING_TIPS_MIN)
        for (id in SeasonalBait4.NEW_EVENTS) {
            assertTrue(id, Shared.content.seasonalEventsById.containsKey(id))
        }
        for (id in SeasonalBait4.NEW_BAITS) {
            assertTrue(id, Shared.content.baitById.containsKey(id))
        }
        for (id in SeasonalBait4.NEW_TECHNIQUES) {
            assertTrue(id, Shared.content.techniquesById.containsKey(id))
        }
        val kickoff = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        assertEquals(
            12,
            kickoff.getValue("baseline").jsonObject.getValue("seasonalEvents").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            12,
            kickoff.getValue("baseline").jsonObject.getValue("baits").jsonPrimitive.content.toInt(),
        )
    }

    @Test
    fun mistFogFestivalActivatesInParityWindow() {
        val fx = Json.parseToJsonElement(File(root, SeasonalBait4.PARITY_FIXTURE).readText()).jsonObject
        val eventId = fx.getValue("eventId").jsonPrimitive.content
        val tick = fx.getValue("tickInWindow").jsonPrimitive.content.toLong()
        val active = SeasonalEventSystem.active(Shared.content, tick)
        assertEquals(eventId, active?.id)
        assertTrue(Shared.content.customersById.containsKey(fx.getValue("festivalCustomerId").jsonPrimitive.content))
        assertTrue(Shared.content.contractTemplatesById.containsKey(fx.getValue("gatedContractId").jsonPrimitive.content))
        assertTrue(Shared.content.baitById.containsKey(fx.getValue("sampleBaitId").jsonPrimitive.content))
        assertTrue(Shared.content.techniquesById.containsKey(fx.getValue("sampleTechniqueId").jsonPrimitive.content))
    }
}
