package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.economy.BankSystem
import com.willio.jeanvilma.fishshopping.core.ship.Economy3
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.BusinessDashboard
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
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 21 — economy/bank/dashboard depth 3. */
class Economy3Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Economy3.CATALOG).isFile }

    @Test
    fun locksPhase21CatalogFloors() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Economy3.CATALOG).readText()).jsonObject
        assertEquals(Economy3.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Economy3.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Economy3.MARKER, json.getValue("economy3Marker").jsonPrimitive.content)
        assertEquals(Economy3.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(Economy3.CLOSES_GAP))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(21, listing.getValue("economy3Phase").jsonPrimitive.content.toInt())
    }

    @Test
    fun contentAndDashboardReachFloors() {
        val bank = Shared.content.bank
        assertTrue(bank.loanProducts.size >= Economy3.LOAN_PRODUCT_MIN)
        assertTrue(bank.goalPresets.size >= Economy3.GOAL_PRESET_MIN)
        for (id in Economy3.LOAN_PRODUCT_IDS) {
            assertTrue(id, bank.loanProducts.any { it.id == id })
        }
        for (id in Economy3.NEW_LOAN_PRODUCT_IDS) {
            assertTrue(id, bank.loanProducts.any { it.id == id })
        }
        for (goal in Economy3.GOAL_PRESETS) {
            assertTrue(goal.toString(), bank.goalPresets.contains(goal))
        }

        val root = repoRoot()
        val dash = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt",
        ).readText()
        val views = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt",
        ).readText()
        for (field in Economy3.DASHBOARD_FIELDS) {
            assertTrue("missing $field", dash.contains(field) || views.contains(field))
        }

        val kickoff = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        val phase21 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 21 }
        assertEquals("economy-bank-3", phase21.getValue("id").jsonPrimitive.content)
        assertEquals("economy3:validate", phase21.getValue("validate").jsonPrimitive.content)
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject.getValue("economy3Incomplete").jsonPrimitive.content.toBoolean(),
        )
    }

    @Test
    fun takesTideglassLoanProduct() {
        val sim = Simulation(
            Shared.content,
            GameState.newGame(Shared.content, "harbor.sunrise_pier", 2121),
        )
        sim.state.completedQuests += "quest.first_ten_sales"
        sim.state.completedQuests += "quest.loan_cleared"
        val before = sim.state.coins
        sim.checkedStep(listOf(Command.TakeLoan("loan-tideglass", "loan.tideglass")))
        assertTrue(BankSystem.hasLoan(sim.state))
        assertEquals(before + 900L, sim.state.coins)
        assertEquals((900L * 1340L) / 1000L, sim.state.loanOwed)

        val dash = BusinessDashboard.build(Shared.content, sim.state, emptyList(), emptyList())
        assertEquals(sim.state.loanOwed, dash.loanOwed)
        assertTrue(dash.loansTaken >= 1L)
        assertTrue(dash.ledgerLines.any { it.startsWith("loan ") })
    }
}
