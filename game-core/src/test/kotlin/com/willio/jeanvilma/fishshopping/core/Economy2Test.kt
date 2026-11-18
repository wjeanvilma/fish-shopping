package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.economy.BankSystem
import com.willio.jeanvilma.fishshopping.core.ship.Economy2
import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 20 — economy/bank/dashboard depth. */
class Economy2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Economy2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Economy2.CATALOG).readText()).jsonObject
        assertEquals(Economy2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Economy2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Economy2.MARKER, json.getValue("economy2Marker").jsonPrimitive.content)
        assertEquals(Economy2.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 25)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(20, listing.getValue("economy2Phase").jsonPrimitive.content.toInt())
    }

    @Test
    fun contentAndDashboardReachFloors() {
        val bank = Shared.content.bank
        assertTrue(bank.loanProducts.size >= Economy2.LOAN_PRODUCT_MIN)
        assertTrue(bank.goalPresets.size >= Economy2.GOAL_PRESET_MIN)
        for (id in Economy2.LOAN_PRODUCT_IDS) {
            assertTrue(id, bank.loanProducts.any { it.id == id })
        }
        assertEquals(Economy2.SCARCITY_CURVE, Shared.content.economy.scarcityPriceCurvePermille)

        val root = repoRoot()
        val dash = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt",
        ).readText()
        for (field in Economy2.DASHBOARD_FIELDS) {
            assertTrue("missing $field", dash.contains(field))
        }

        val kickoff = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        val phase20 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 20 }
        assertEquals("economy-bank-2", phase20.getValue("id").jsonPrimitive.content)
        assertEquals("economy2:validate", phase20.getValue("validate").jsonPrimitive.content)
    }

    @Test
    fun takesExpansionLoanProduct() {
        val sim = Simulation(
            Shared.content,
            GameState.newGame(Shared.content, "harbor.sunrise_pier", 2020),
        )
        sim.state.completedQuests += "quest.first_ten_sales"
        sim.state.completedQuests += "quest.loan_ledger"
        val before = sim.state.coins
        sim.checkedStep(listOf(Command.TakeLoan("loan-expansion", "loan.expansion")))
        assertTrue(BankSystem.hasLoan(sim.state))
        assertEquals(before + 220L, sim.state.coins)
        assertEquals((220L * 1280L) / 1000L, sim.state.loanOwed)
    }
}
