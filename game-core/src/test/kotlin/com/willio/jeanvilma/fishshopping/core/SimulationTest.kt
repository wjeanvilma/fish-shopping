package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotException
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.view
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class SimulationTest {
    private val sprat = "species.silver_sprat"
    private val portion = "product.basic_portion"
    private fun cutter(sim: Simulation) = sim.state.machines.first { it.stationId == "station.cutter_1" }
    private fun smoker(sim: Simulation) = sim.state.machines.first { it.stationId == "station.smoker_1" }

    @Test
    fun walkingToPierFillsBagThenStops() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        pilot.walkTo(-14250, 0)
        assertEquals("zone.pier_end", sim.state.player.zoneId)
        val catches = mutableListOf<GameEvent.FishCaught>()
        repeat(800) {
            catches += pilot.tick(Command.Move(0, 0)).filterIsInstance<GameEvent.FishCaught>()
            if (sim.state.player.bag.freeUnits() == 0) return@repeat
        }
        assertTrue(catches.isNotEmpty())
        assertEquals(0, sim.state.player.bag.freeUnits())
        // Each catch interval matches that species' catchTicks (bag-fit roll never burns a cast).
        catches.zipWithNext { a, b ->
            val expected = sim.content.speciesById.getValue(b.speciesId).catchTicks.toLong()
            assertEquals(expected, b.tick - a.tick)
        }
        assertEquals("Bag full - deliver your catch", sim.view().context!!.lines.first())
        // Standing with a full bag never starts another cast.
        val more = (1..200).flatMap { pilot.tick(Command.Move(0, 0)) }.filterIsInstance<GameEvent.FishCaught>()
        assertTrue(more.isEmpty())
    }

    @Test
    fun pierCatchTableProducesMultipleSpecies() {
        val sim = newSim(seed = 42)
        val pilot = Autopilot(sim)
        // Bigger bag so rarity weights have room to show more than one species.
        sim.state.player.bag.capacityUnits = 40
        pilot.walkTo(-14250, 0)
        val species = mutableSetOf<String>()
        repeat(4000) {
            pilot.tick(Command.Move(0, 0)).filterIsInstance<GameEvent.FishCaught>().forEach { species += it.speciesId }
            if (species.size >= 3) return@repeat
        }
        assertTrue("expected >=3 species from pier table, got $species", species.size >= 3)
        assertTrue(species.contains(sprat) || species.contains("species.harbor_herring"))
        assertTrue(sim.content.harborsById.getValue(HARBOR).fishingSpots.single().species.containsAll(species))
    }

    @Test
    fun fishingOnlyRollsSpeciesThatFitTheBag() {
        val sim = newSim(seed = 7)
        val pilot = Autopilot(sim)
        // Leave exactly 1 free unit: copper_mullet (2), amber_snapper (2), king_grouper (3) must be excluded.
        sim.state.player.bag.capacityUnits = 5
        sim.state.player.bag.add(sprat, 4)
        assertEquals(1, sim.state.player.bag.freeUnits())
        pilot.walkTo(-14250, 0)
        val catches = mutableListOf<GameEvent.FishCaught>()
        repeat(600) {
            catches += pilot.tick(Command.Move(0, 0)).filterIsInstance<GameEvent.FishCaught>()
            if (sim.state.player.bag.freeUnits() == 0) return@repeat
        }
        assertEquals(1, catches.size)
        val caught = sim.content.speciesById.getValue(catches.single().speciesId)
        assertEquals(1, caught.carryUnits)
        assertEquals(0, sim.state.player.bag.freeUnits())
        assertTrue(sim.state.player.bag.roomFor("species.copper_mullet") == 0)
        assertTrue(sim.state.player.bag.roomFor("species.king_grouper") == 0)
    }

    @Test
    fun obstaclesBlockMovement() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        // Walk straight at the cutter footprint (x 2000..4000, z -5000..-3000) from the west.
        pilot.walkTo(1000, -4000)
        repeat(50) { pilot.tick(Command.Move(1000, 0)) }
        assertTrue("stopped before the footprint", sim.state.player.x < 2000 - 299)
    }

    @Test
    fun batchProducesOutputExactlyOnceAfterDuration() {
        val sim = newSim()
        val m = cutter(sim)
        m.input.add(sprat, 1)
        val events = (1..150).flatMap { sim.checkedStep() }
        val started = events.filterIsInstance<GameEvent.BatchStarted>().single()
        val done = events.filterIsInstance<GameEvent.BatchCompleted>().single()
        assertEquals(started.batchId, done.batchId)
        assertEquals(100L, done.tick - started.tick)
        assertEquals(2, m.output.quantity(portion))
        assertEquals(MachineStatus.WAITING_FOR_INPUT, m.status)
    }

    @Test
    fun fullOutputBlocksWithoutLosingInputs() {
        val sim = newSim()
        val m = cutter(sim)
        m.output.add(portion, 19) // capacity 20, a batch makes 2
        m.input.add(sprat, 3)
        sim.run(10)
        assertEquals(MachineStatus.OUTPUT_FULL, m.status)
        assertNull(m.activeBatch)
        assertEquals(3, m.input.quantity(sprat))
        m.output.remove(portion, 5)
        sim.run(101) // starts on tick 11, completes on tick 111, next batch starts the same tick
        assertEquals(16, m.output.quantity(portion))
        assertEquals(1, m.input.quantity(sprat))
        assertNotNull(m.activeBatch)
    }

    @Test
    fun reloadDuringCuttingResumesAndOutputsOnce() {
        val sim = newSim()
        val m = cutter(sim)
        m.input.add(sprat, 1)
        sim.run(40) // batch started on tick 1, 61 ticks remain
        val saved = SnapshotCodec.encode(sim.content, sim.state)

        val restored = Simulation(sim.content, SnapshotCodec.decode(sim.content, saved))
        val rm = cutter(restored)
        assertNotNull(rm.activeBatch)
        assertEquals(0, rm.input.quantity(sprat)) // input stays consumed, not recreated
        val events = (1..100).flatMap { restored.checkedStep() }
        assertEquals(1, events.filterIsInstance<GameEvent.BatchCompleted>().size)
        assertEquals(101L, events.filterIsInstance<GameEvent.BatchCompleted>().single().tick)
        assertEquals(2, rm.output.quantity(portion))
        // Re-encoding the original state is byte-identical (stable ordering).
        assertEquals(saved, SnapshotCodec.encode(sim.content, SnapshotCodec.decode(sim.content, saved)))
    }

    @Test
    fun corruptAndNewerSavesAreRefused() {
        val sim = newSim()
        sim.run(5)
        val saved = SnapshotCodec.encode(sim.content, sim.state)
        try {
            SnapshotCodec.decode(sim.content, saved.replace("\"tick\":5", "\"tick\":6"))
            fail("checksum should fail")
        } catch (e: SnapshotException) {
            assertTrue(e.message!!.contains("Checksum"))
        }
        try {
            SnapshotCodec.decode(sim.content, saved.replace("\"schemaVersion\":4", "\"schemaVersion\":99"))
            fail("newer schema should be refused")
        } catch (e: SnapshotException) {
            assertTrue(e.message!!.contains("newer"))
        }
    }

    @Test
    fun purchaseIsValidatedAndRetrySafe() {
        val sim = newSim()
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.bag_capacity_2", "req-1")))
            .filterIsInstance<GameEvent.PurchaseRejected>().single()
        sim.state.coins = 100
        val first = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.bag_capacity_2", "req-2")))
            .filterIsInstance<GameEvent.UpgradePurchased>().single()
        assertFalse(first.replayed)
        assertEquals(60L, sim.state.coins)
        assertEquals(8, sim.state.player.bag.capacityUnits)
        // App retried the same request after a crash: same receipt, no second charge.
        val retry = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.bag_capacity_2", "req-2")))
            .filterIsInstance<GameEvent.UpgradePurchased>().single()
        assertTrue(retry.replayed)
        assertEquals(first.receipt, retry.receipt)
        assertEquals(60L, sim.state.coins)
        // Locked by quest requirement.
        sim.state.coins = 1000
        val locked = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.cutter_speed_2", "req-3")))
            .filterIsInstance<GameEvent.PurchaseRejected>().single()
        assertTrue(locked.reason.contains("Make 10 sales"))
    }

    @Test
    fun speedUpgradeAppliesToNextBatchOnly() {
        val sim = newSim()
        val m = cutter(sim)
        sim.state.completedQuests += "quest.first_ten_sales"
        sim.state.coins = 300
        m.input.add(sprat, 2)
        sim.run(10)
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.cutter_speed_2", "r")))
        assertEquals(100, m.activeBatch!!.durationTicks) // active batch keeps its timer
        val events = (1..200).flatMap { sim.checkedStep() }
        val second = events.filterIsInstance<GameEvent.BatchStarted>().single()
        val secondDone = events.filterIsInstance<GameEvent.BatchCompleted>().last()
        assertEquals(80L, secondDone.tick - second.tick)
    }

    @Test
    fun customerAbandonmentReturnsStockAndRecordsNoRevenue() {
        val sim = newSim()
        val counter = sim.state.counters.single()
        counter.stock.add(portion, 2)
        // Player never stands at the counter, so nobody is served.
        val events = (1..2000).flatMap { sim.checkedStep() }
        assertTrue(events.filterIsInstance<GameEvent.CustomerLeft>().any { !it.paid })
        assertTrue(events.filterIsInstance<GameEvent.SaleCommitted>().isEmpty())
        assertEquals(0L, sim.state.coins)
        assertEquals(2, counter.stock.quantity(portion))
        assertTrue(sim.state.stat(Stats.LOST_CUSTOMERS) > 0)
    }

    @Test
    fun servingAtCounterCommitsEachSaleOnce() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        sim.state.counters.single().stock.add(portion, 10)
        pilot.walkTo(3000, 2750)
        val events = (1..1200).flatMap { pilot.tick(Command.Move(0, 0)) }
        val sales = events.filterIsInstance<GameEvent.SaleCommitted>()
        assertTrue(sales.isNotEmpty())
        assertEquals(sales.size, sales.map { it.saleId }.toSet().size)
        assertEquals(sales.sumOf { it.coins }, sim.state.coins)
        assertEquals(sales.sumOf { it.quantity }, 10 - sim.state.counters.single().stock.quantity(portion))
    }

    @Test
    fun customersWalkInBeforeTheyCanBeServed() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        sim.state.counters.single().stock.add(portion, 10)
        pilot.walkTo(3000, 2750) // stand at the counter the whole time
        val events = (1..400).flatMap { pilot.tick(Command.Move(0, 0)) }
        val arrived = events.filterIsInstance<GameEvent.CustomerArrived>().first()
        val customer = sim.content.harborsById.getValue(HARBOR).let { h ->
            com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.walkTicks(
                h.customerEntry, h.counters.single().queueSlot(0), h.customerWalkMmPerTick,
            )
        }
        val firstSale = events.filterIsInstance<GameEvent.SaleCommitted>().first()
        val checkout = sim.content.harborsById.getValue(HARBOR).counters.single().checkoutTicks
        // Walk to slot 0, then the checkout timer: never earlier.
        assertEquals(arrived.tick + customer + checkout - 1, firstSale.tick)
    }

    @Test
    fun walkingCustomersDoNotLosePatienceOrReserveStock() {
        val sim = newSim()
        sim.state.counters.single().stock.add(portion, 5)
        sim.run(160) // first spawn on tick 160
        val c = sim.state.customers.single()
        assertTrue(c.walkTicksLeft > 0)
        val patience = c.patienceLeft
        sim.run(c.walkTicksLeft - 1)
        assertEquals(patience, c.patienceLeft)
        assertEquals(0, sim.state.counters.single().stock.reservedQuantity(portion))
        sim.run(2)
        assertTrue(c.arrived)
        assertTrue(sim.state.counters.single().stock.reservedQuantity(portion) > 0)
        val v = sim.view().customers.single()
        assertTrue(v.arrived)
        assertEquals(sim.harbor.counters.single().queueAnchor.x.toFloat(), v.xMm)
    }

    @Test
    fun schemaOneSaveMigratesWithCustomersAlreadyQueued() {
        val v1 = Shared.text("fixtures/legacy/snapshot-v1-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v1)
        assertEquals(2500L, s.tick)
        assertTrue(s.customers.isNotEmpty())
        assertTrue(s.customers.all { it.arrived && it.walkTicksTotal == 0 })
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":4,"))
        val sim = Simulation(Shared.content, SnapshotCodec.decode(Shared.content, reencoded))
        repeat(200) { sim.checkedStep() }
    }

    @Test
    fun productLadderProducesFilletAndPremiumAndSellsMixedStock() {
        val sim = newSim()
        val m = cutter(sim)
        val counter = sim.state.counters.single()
        val fillet = "product.fillet"
        val premium = "product.premium_portion"
        // Mid-tier and rare fish become distinct products on the cutter.
        m.input.add("species.blue_mackerel", 1)
        m.input.add("species.amber_snapper", 1)
        sim.run(300)
        assertEquals(2, m.output.quantity(fillet))
        assertEquals(2, m.output.quantity(premium))
        // Counter accepts every product SKU; customers draw in sorted item order.
        counter.stock.add(portion, 1)
        counter.stock.add(fillet, 1)
        counter.stock.add(premium, 1)
        val pilot = Autopilot(sim)
        pilot.walkTo(3000, 2750)
        val sales = (1..800).flatMap { pilot.tick(Command.Move(0, 0)) }.filterIsInstance<GameEvent.SaleCommitted>()
        assertTrue(sales.isNotEmpty())
        val soldItems = sales.flatMap { it.items.map { line -> line.item } }.toSet()
        assertTrue(soldItems.contains(portion) || soldItems.contains(fillet) || soldItems.contains(premium))
        assertTrue(sales.any { it.coins >= 12L }) // at least one non-basic sale line paid
        assertEquals(0, counter.stock.usedUnits())
    }

    @Test
    fun smokerTurnsFilletsIntoSmokedFillets() {
        val sim = newSim()
        assertEquals(2, sim.state.machines.size)
        val s = smoker(sim)
        s.input.add("product.fillet", 1)
        val events = (1..200).flatMap { sim.checkedStep() }
        val started = events.filterIsInstance<GameEvent.BatchStarted>().single()
        val done = events.filterIsInstance<GameEvent.BatchCompleted>().single()
        assertEquals("recipe.smoke_fillet", started.recipeId)
        assertEquals("station.smoker_1", started.stationId)
        assertEquals(150L, done.tick - started.tick)
        assertEquals(1, s.output.quantity("product.smoked_fillet"))
        assertEquals(0, s.input.quantity("product.fillet"))
        assertEquals(MachineStatus.WAITING_FOR_INPUT, s.status)
    }

    @Test
    fun catchSpeedUpgradeShortensCastDuration() {
        val sim = newSim()
        sim.state.player.catchSpeedPermille = 2000 // twice as fast
        val pilot = Autopilot(sim)
        pilot.walkTo(-14250, 0)
        repeat(5) { pilot.tick(Command.Move(0, 0)) }
        assertNotNull(sim.state.player.fishingSpecies)
        val rolled = sim.content.speciesById.getValue(sim.state.player.fishingSpecies!!)
        val expected = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
            .catchTicksFor(2000, rolled.catchTicks)
        assertEquals(expected, sim.state.player.fishingCatchTicks)
        assertTrue(expected < rolled.catchTicks)
    }

    @Test
    fun perfectReelFinishesCastEarlyAndPaysTimingBonus() {
        val sim = newSim(seed = 99)
        val pilot = Autopilot(sim)
        pilot.walkTo(-14250, 0)
        // Advance into the timing window (65%..85% of the cast).
        var duration = 0
        repeat(5) { pilot.tick(Command.Move(0, 0)) } // start a cast
        assertNotNull(sim.state.player.fishingSpecies)
        duration = sim.state.player.fishingCatchTicks
        val windowStart = (duration * 650) / 1000
        while (sim.state.player.fishingProgress < windowStart) {
            pilot.tick(Command.Move(0, 0))
        }
        assertTrue(sim.view().fishingTimingWindow)
        assertTrue(sim.view().fishingCanReel)
        val beforeCoins = sim.state.coins
        val events = pilot.tick(Command.Move(0, 0), listOf(Command.Reel))
        val caught = events.filterIsInstance<GameEvent.FishCaught>().single()
        assertTrue(caught.timingBonus)
        assertTrue(sim.state.stat(Stats.TIMING_BONUSES) >= 1)
        assertTrue(sim.state.coins > beforeCoins)
        assertNull(sim.state.player.fishingSpecies)
    }

    @Test
    fun smokerPadsTransferFilletInAndSmokedOut() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        sim.state.player.bag.add("product.fillet", 1)
        // Deliver to smoker input pad (west of footprint).
        pilot.walkTo(6300, -4000)
        assertEquals("zone.smoker_in", sim.state.player.zoneId)
        // Transfer then production can consume the fillet on the same tick.
        pilot.waitUntil(40) {
            sim.state.player.bag.isEmpty() &&
                (smoker(sim).input.quantity("product.fillet") == 1 || smoker(sim).activeBatch != null)
        }
        assertEquals(0, sim.state.player.bag.quantity("product.fillet"))
        pilot.waitUntil(200) { smoker(sim).output.quantity("product.smoked_fillet") >= 1 }
        assertEquals(1, smoker(sim).output.quantity("product.smoked_fillet"))
        // Collect from smoker output pad (east of footprint); walk around the machine.
        pilot.walkTo(6300, -2000)
        pilot.walkTo(9300, -2000)
        pilot.walkTo(9300, -4000)
        assertEquals("zone.smoker_out", sim.state.player.zoneId)
        pilot.waitUntil(40) { sim.state.player.bag.quantity("product.smoked_fillet") >= 1 }
        assertEquals(1, sim.state.player.bag.quantity("product.smoked_fillet"))
        assertTrue(smoker(sim).output.isEmpty())
    }
}
