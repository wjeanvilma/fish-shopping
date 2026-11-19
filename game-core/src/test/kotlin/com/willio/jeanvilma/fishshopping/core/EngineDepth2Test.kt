package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem
import com.willio.jeanvilma.fishshopping.core.ship.EngineDepth2
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.ContractState
import com.willio.jeanvilma.fishshopping.core.sim.CustomerState
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.view
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EngineDepth2Test {
    @Test
    fun locksPhase3CatalogFloors() {
        assertEquals(3, EngineDepth2.PHASE)
        assertEquals("authored-finish-5.0-phase-3", EngineDepth2.MARKER)
        assertEquals(5, EngineDepth2.VIEW_FIELD_MIN)
        assertEquals(5, EngineDepth2.COACHING_CONTEXT_MIN)
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 3 && it.validate == "enginedepth2:validate" })
    }

    @Test
    fun exposesServiceAndContractPressureOnView() {
        val sim = newSim(11)
        sim.state.tutorialIndex = Shared.content.tutorial.size
        val v0 = sim.view()
        assertEquals(0, v0.serviceQueuePressurePermille)
        assertNull(v0.minPatienceTicksLeft)
        assertNull(v0.ticksUntilNearestContractDeadline)

        val harbor = Shared.content.harborsById.getValue(HARBOR)
        val counterId = harbor.counters.first().id
        val typeId = Shared.content.customers.first().id
        sim.state.customers += CustomerState(
            id = "c-pressure",
            typeId = typeId,
            counterId = counterId,
            wants = 1,
            patienceLeft = 25,
            walkTicksTotal = 0,
        )
        val pressure = CustomerSystem.serviceQueuePressurePermille(Shared.content, sim.state, harbor)
        assertTrue(pressure > 0)
        assertEquals(25, CustomerSystem.minPatienceTicksLeft(sim.state))

        sim.state.completedQuests += "quest.first_ten_sales"
        sim.state.stats[Stats.CONTRACT_FAIL_STREAK] = 3L
        assertTrue(ContractSystem.contractBoardPressurePermille(Shared.content, sim.state) >= 1000)

        val template = Shared.content.contracts.templates.first()
        sim.state.activeContracts += ContractState(
            id = "job-1",
            templateId = template.id,
            itemId = template.item,
            quantity = 1,
            delivered = 0,
            deadlineTick = sim.state.tick + 50,
            payout = 10,
            penalty = 5,
        )
        assertEquals(50, ContractSystem.ticksUntilNearestDeadline(sim.state))
        val questProgress = ProgressionSystem.nextQuestProgressPermille(Shared.content, sim.state)
        assertTrue(questProgress == null || questProgress >= 0)

        val v = sim.view()
        assertEquals(pressure, v.serviceQueuePressurePermille)
        assertEquals(25, v.minPatienceTicksLeft)
        assertEquals(50, v.ticksUntilNearestContractDeadline)
        assertTrue(v.contractBoardPressurePermille >= 1000)
    }
}
