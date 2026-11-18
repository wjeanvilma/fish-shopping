package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.push.LocalPushSchedule
import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.LocalPushReminders
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
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

/** Finish 3.0 Phase 18 — local push schedule + catalog lock. */
class LocalPushRemindersTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, LocalPushReminders.CATALOG).isFile }

    @Test
    fun scheduleMathMatchesParityVectors() {
        val dayStart = 10L * LocalPushSchedule.MS_PER_DAY // UTC day 10
        val morning = dayStart + 10 * LocalPushSchedule.MS_PER_HOUR
        val eveningPast = dayStart + 19 * LocalPushSchedule.MS_PER_HOUR
        val fireMorning = LocalPushSchedule.nextFireEpochMs(morning, 18, 0, 0)
        assertEquals(LocalPushSchedule.localDayId(morning, 0), LocalPushSchedule.localDayId(fireMorning, 0))
        val firePast = LocalPushSchedule.nextFireEpochMs(eveningPast, 18, 0, 0)
        assertEquals(
            LocalPushSchedule.localDayId(eveningPast, 0) + 1,
            LocalPushSchedule.localDayId(firePast, 0),
        )

        assertTrue(
            LocalPushSchedule.shouldDeliver(
                enabled = true,
                unclaimedCount = 2,
                lastShownDayId = 100,
                todayDayId = 101,
            ),
        )
        assertFalse(
            LocalPushSchedule.shouldDeliver(
                enabled = false,
                unclaimedCount = 2,
                lastShownDayId = 100,
                todayDayId = 101,
            ),
        )
        assertFalse(
            LocalPushSchedule.shouldDeliver(
                enabled = true,
                unclaimedCount = 0,
                lastShownDayId = 100,
                todayDayId = 101,
            ),
        )
        assertFalse(
            LocalPushSchedule.shouldDeliver(
                enabled = true,
                unclaimedCount = 2,
                lastShownDayId = 101,
                todayDayId = 101,
            ),
        )
    }

    @Test
    fun catalogMirrorsAndGapClosed() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, LocalPushReminders.CATALOG).readText()).jsonObject
        assertEquals(LocalPushReminders.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(LocalPushReminders.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(LocalPushReminders.MARKER, json.getValue("localPushRemindersMarker").jsonPrimitive.content)
        assertEquals(LocalPushReminders.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(24, SimConstants.SCHEMA_VERSION)

        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertFalse(
            kickoff.getValue("gaps").jsonObject
                .getValue("pushRemindersMissing").jsonPrimitive.boolean,
        )
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 18,
        )
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains(LocalPushReminders.CLOSES_GAP))
        val phase18 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 18 }
        assertEquals("local-push", phase18.getValue("id").jsonPrimitive.content)
        assertEquals("localpush:validate", phase18.getValue("validate").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(18, listing.getValue("localPushRemindersPhase").jsonPrimitive.content.toInt())
    }
}
