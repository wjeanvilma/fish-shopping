package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotException
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.CustomerState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.OfflinePolicy
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.WorkerTaskPhase
import com.willio.jeanvilma.fishshopping.core.sim.applyOffline
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
    private fun unlockStaffHiring(sim: Simulation) {
        sim.state.completedQuests += "quest.first_ten_sales"
    }
    private fun unlockSupervisorHiring(sim: Simulation) {
        unlockStaffHiring(sim)
        sim.state.ownedUpgrades += "upgrade.staff_boots"
    }

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
        assertTrue(species.contains(sprat) || species.contains("species.harbor_herring") ||
            species.contains("species.dawn_anchovy"))
        val spotSpecies = sim.content.harborsById.getValue(HARBOR).fishingSpots
            .first { it.zone == "zone.pier_end" }.species.toSet()
        val rareTargets = spotSpecies.mapNotNull { id ->
            sim.content.speciesById.getValue(id).rareUpgrade?.to
        }.toSet()
        assertTrue(
            "catches must come from the pier table or its rare upgrades, got $species",
            spotSpecies.union(rareTargets).containsAll(species),
        )
    }

    @Test
    fun speciesRosterIsHarborGatedWithRareUpgradeChains() {
        val c = Shared.content
        assertEquals("0.26.0", c.contentVersion)
        assertEquals(24, c.species.size)
        val sunrise = c.harborsById.getValue("harbor.sunrise_pier").fishingSpots.flatMap { it.species }
        val moon = c.harborsById.getValue("harbor.moon_cove").fishingSpots.flatMap { it.species }
        for (id in listOf(
            "species.dawn_anchovy", "species.sail_needlefish", "species.tide_bass", "species.reef_perch",
        )) {
            assertTrue(id in sunrise)
            assertTrue(id !in moon)
        }
        for (id in listOf(
            "species.moon_flounder", "species.ink_squid", "species.lava_eel", "species.ghost_lanternfish",
        )) {
            assertTrue(id in moon)
            assertTrue(id !in sunrise)
        }
        assertEquals("species.bronze_mullet", c.speciesById.getValue("species.copper_mullet").rareUpgrade!!.to)
        assertEquals("species.ruby_snapper", c.speciesById.getValue("species.amber_snapper").rareUpgrade!!.to)
        assertEquals("species.silver_dawn_anchovy", c.speciesById.getValue("species.dawn_anchovy").rareUpgrade!!.to)
        assertEquals("species.prism_lanternfish", c.speciesById.getValue("species.ghost_lanternfish").rareUpgrade!!.to)
        c.species.forEach { sp ->
            assertTrue("${sp.id} missing asset stub", sp.asset!!.matches(Regex("""^models/fish_.+\.glb$""")))
        }
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
    fun transferAnchorsCoverBagPadsAndCounter() {
        val sim = newSim()
        val anchors = sim.view().transferAnchors.associateBy { it.inventoryId }
        assertTrue(anchors.containsKey("inv.player_bag"))
        assertTrue(anchors.containsKey("inv.station.cutter_1.input"))
        assertTrue(anchors.containsKey("inv.station.cutter_1.output"))
        assertTrue(anchors.containsKey("inv.counter.portions_1"))
        assertEquals(sim.state.player.x, anchors.getValue("inv.player_bag").xMm)
        assertEquals(sim.state.player.z, anchors.getValue("inv.player_bag").zMm)
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
            SnapshotCodec.decode(sim.content, saved.replace("\"schemaVersion\":10", "\"schemaVersion\":99"))
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
    fun premiumVisitorPaysTipMultiplier() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        val counter = sim.state.counters.single()
        counter.stock.add(portion, 1)
        val type = sim.content.customersById.getValue("customer.premium_visitor")
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_premium", type.id, counter.counterId, wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
        )
        pilot.walkTo(3000, 2750)
        val events = (1..80).flatMap { pilot.tick(Command.Move(0, 0)) }
        val sale = events.filterIsInstance<GameEvent.SaleCommitted>().single()
        assertEquals(type.priceMultPermille, sale.priceMultPermille)
        assertTrue(sale.tipped)
        // Basic portion 5 * 1500 / 1000 = 7
        assertEquals(7L, sale.coins)
        assertEquals(1L, sim.state.stat(Stats.PREMIUM_SALES))
        assertEquals("premium", sim.view().customers.singleOrNull()?.kind ?: "premium")
    }

    @Test
    fun restaurantBuyerUsesBulkBasketAndCounterShowsKind() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        val type = sim.content.customersById.getValue("customer.restaurant_buyer")
        assertEquals(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.BULK, type.kind)
        assertTrue(type.basketMin >= 6)
        val counter = sim.state.counters.single()
        counter.stock.add(portion, 10)
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_bulk", type.id, counter.counterId, wants = 8, patienceLeft = 9_999, walkTicksTotal = 0,
        )
        pilot.walkTo(3000, 2750)
        pilot.tick(Command.Move(0, 0))
        val card = sim.view().context!!
        assertTrue(card.lines.any { it.contains("Restaurant") && it.contains("bulk") })
        val events = (1..80).flatMap { pilot.tick(Command.Move(0, 0)) }
        val sale = events.filterIsInstance<GameEvent.SaleCommitted>().single()
        assertEquals(8, sale.quantity)
        assertEquals(1L, sim.state.stat(Stats.BULK_SALES))
    }

    @Test
    fun customerRosterIncludesPremiumAndBulkKinds() {
        val kinds = Shared.content.customers.map { it.kind }.toSet()
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.PREMIUM))
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.BULK))
        assertTrue(Shared.content.customers.any { it.id == "customer.premium_visitor" && it.priceMultPermille > 1000 })
        assertTrue(Shared.content.customers.any { it.id == "customer.restaurant_buyer" && it.basketMin >= 6 })
    }

    @Test
    fun preferredProductIsReservedFirstAndPaysFullPrice() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        val counter = sim.state.counters.single()
        val fillet = "product.fillet"
        counter.stock.add(portion, 2)
        counter.stock.add(fillet, 1)
        val type = sim.content.customersById.getValue("customer.local_shopper")
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_pref_met", type.id, counter.counterId, wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
            preferredProductId = fillet,
        )
        pilot.walkTo(3000, 2750)
        pilot.tick(Command.Move(0, 0))
        val front = sim.state.customers.single()
        assertEquals(1, front.reservedItems[fillet])
        assertTrue(front.preferenceMet())
        val card = sim.view().context!!
        assertTrue(card.lines.any { it.contains("Fillet") && !it.contains("substituting") })
        val events = (1..80).flatMap { pilot.tick(Command.Move(0, 0)) }
        val sale = events.filterIsInstance<GameEvent.SaleCommitted>().single()
        assertTrue(sale.preferenceMet)
        assertEquals(fillet, sale.preferredProductId)
        assertEquals(type.priceMultPermille, sale.priceMultPermille)
        // Fillet unitPrice 12 * 1000/1000
        assertEquals(12L, sale.coins)
        assertEquals(0L, sim.state.stat(Stats.UNMET_PREFERENCE_SALES))
    }

    @Test
    fun unmetPreferenceLowersPayAndShowsSubstituting() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        val counter = sim.state.counters.single()
        counter.stock.add(portion, 1)
        val type = sim.content.customersById.getValue("customer.premium_visitor")
        val preferred = "product.premium_portion"
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_pref_unmet", type.id, counter.counterId, wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
            preferredProductId = preferred,
        )
        pilot.walkTo(3000, 2750)
        pilot.tick(Command.Move(0, 0))
        assertFalse(sim.state.customers.single().preferenceMet())
        val card = sim.view().context!!
        assertTrue(card.lines.any { it.contains("substituting") && it.contains("Premium portion") })
        val events = (1..80).flatMap { pilot.tick(Command.Move(0, 0)) }
        val sale = events.filterIsInstance<GameEvent.SaleCommitted>().single()
        assertFalse(sale.preferenceMet)
        assertEquals(preferred, sale.preferredProductId)
        // 5 * (1500 * 600 / 1000) / 1000 = 4
        assertEquals(900, sale.priceMultPermille)
        assertEquals(4L, sale.coins)
        assertFalse(sale.tipped)
        assertEquals(1L, sim.state.stat(Stats.UNMET_PREFERENCE_SALES))
    }

    @Test
    fun unmetPreferenceDrainsPatienceFasterWhilePreferredIsOut() {
        val sim = newSim()
        val counter = sim.state.counters.single()
        val type = sim.content.customersById.getValue("customer.local_shopper")
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_pref_drain", type.id, counter.counterId, wants = 1, patienceLeft = 100, walkTicksTotal = 0,
            preferredProductId = "product.fillet",
        )
        sim.run(10)
        // unmetPatienceDrainPermille 2000 → 2/tick while preferred is unavailable and basket empty
        assertEquals(80, sim.state.customers.single().patienceLeft)
    }

    @Test
    fun customerRosterDefinesProductPreferences() {
        assertTrue(Shared.content.customers.all { it.preferredProducts.isNotEmpty() })
        assertTrue(Shared.content.customers.all { it.unmetPriceMultPermille in 1..1000 })
        assertTrue(Shared.content.customers.all { it.unmetPatienceDrainPermille >= 1000 })
    }

    @Test
    fun rushWindowsSpikeSpawnRateAndShowBanner() {
        val sim = newSim()
        val harbor = sim.harbor
        assertTrue(harbor.rushes.isNotEmpty())
        val lunch = harbor.rushesById.getValue("rush.lunch")
        // Quiet period: baseline interval.
        sim.state.tick = lunch.startTick.toLong() - 1
        assertNull(com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.activeRush(harbor, sim.state.tick))
        assertEquals(harbor.customerSpawnTicks,
            com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.spawnIntervalTicks(harbor, sim.state.tick))
        assertNull(sim.view().rush)

        // Enter lunch rush on the next step (tick becomes startTick).
        sim.state.tick = lunch.startTick.toLong() - 1
        val events = sim.checkedStep()
        val started = events.filterIsInstance<GameEvent.RushStarted>().single()
        assertEquals(lunch.id, started.rushId)
        assertEquals(lunch.name, started.name)
        assertEquals(lunch.id, com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.activeRush(harbor, sim.state.tick)!!.id)
        val expectedInterval = (harbor.customerSpawnTicks * 1000L / lunch.spawnSpeedPermille).toInt()
        assertEquals(expectedInterval,
            com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.spawnIntervalTicks(harbor, sim.state.tick))
        val banner = sim.view().rush!!
        assertEquals(lunch.name, banner.name)
        assertEquals(lunch.durationTicks, banner.ticksRemaining)

        // Faster spawn: progress past the shortened interval.
        sim.state.customers.clear()
        sim.state.customerSpawnProgress = 0
        val arrivals = (1..expectedInterval).flatMap { sim.checkedStep() }
            .filterIsInstance<GameEvent.CustomerArrived>()
        assertTrue(arrivals.isNotEmpty())

        // Queue capacity expands during rush.
        val counter = harbor.counters.single()
        assertEquals(
            counter.maxQueue + lunch.queueBonus,
            com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.effectiveMaxQueue(counter, lunch),
        )
    }

    @Test
    fun rushEndEmitsEventAndClearsBanner() {
        val sim = newSim()
        val lunch = sim.harbor.rushesById.getValue("rush.lunch")
        sim.state.tick = lunch.endTick.toLong() - 1
        assertNotNull(com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.activeRush(sim.harbor, sim.state.tick))
        val events = sim.checkedStep()
        val ended = events.filterIsInstance<GameEvent.RushEnded>().single()
        assertEquals(lunch.id, ended.rushId)
        assertNull(com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.activeRush(sim.harbor, sim.state.tick))
        assertNull(sim.view().rush)
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
        val walk = sim.content.harborsById.getValue(HARBOR).let { h ->
            val path = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.approachPath(
                h, h.counters.single().queueSlot(0),
            )
            com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.pathWalkTicks(
                path, h.customerWalkMmPerTick,
            )
        }
        val firstSale = events.filterIsInstance<GameEvent.SaleCommitted>().first()
        val checkout = sim.content.harborsById.getValue(HARBOR).counters.single().checkoutTicks
        // Walk to slot 0, then the checkout timer: never earlier.
        assertEquals(arrived.tick + walk + checkout - 1, firstSale.tick)
    }

    @Test
    fun customerApproachFollowsWaypointsAroundObstacles() {
        val sim = newSim()
        val h = sim.harbor
        assertTrue(h.customerPathWaypoints.isNotEmpty())
        val slot = h.counters.single().queueSlot(0)
        val path = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.approachPath(h, slot)
        val routed = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.pathWalkTicks(
            path, h.customerWalkMmPerTick,
        )
        val straight = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.walkTicks(
            h.customerEntry, slot, h.customerWalkMmPerTick,
        )
        assertTrue("routed walk should be longer than a straight cut", routed > straight)

        sim.state.counters.single().stock.add(portion, 1)
        sim.run(h.customerSpawnTicks) // spawn on this tick
        val c = sim.state.customers.single()
        assertEquals(routed, c.walkTicksTotal)
        // Mid-walk position should sit on the polyline, not the straight chord.
        sim.run(c.walkTicksTotal / 2)
        val view = sim.view().customers.single()
        val (sx, sz) = run {
            val t = 0.5f
            h.customerEntry.x + (slot.x - h.customerEntry.x) * t to
                h.customerEntry.z + (slot.z - h.customerEntry.z) * t
        }
        val chordDist = kotlin.math.hypot((view.xMm - sx).toDouble(), (view.zMm - sz).toDouble())
        assertTrue("mid-path should leave the straight chord (was $chordDist)", chordDist > 200.0)
        assertEquals(h.customerPathWaypoints.size, sim.view().customerPathWaypoints.size)
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
        assertTrue(reencoded.startsWith("{\"schemaVersion\":10,"))
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
        assertEquals(3, sim.state.machines.size)
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
    fun harborGrillUnlocksAsSecondProductionLine() {
        val c = Shared.content
        assertEquals("0.26.0", c.contentVersion)
        assertTrue(c.machinesById.containsKey("machine.harbor_grill"))
        val effect = c.upgradesById.getValue("upgrade.harbor_grill").effect
        assertTrue(effect is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine)
        assertEquals(
            "machine.harbor_grill",
            (effect as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        for (harborId in listOf("harbor.sunrise_pier", "harbor.moon_cove")) {
            val grill = c.harborsById.getValue(harborId).stations.first { it.machine == "machine.harbor_grill" }
            assertEquals("upgrade.harbor_grill", grill.requiresUpgrade)
        }

        val sim = newSim()
        val grill = sim.state.machines.first { it.stationId == "station.grill_1" }
        sim.checkedStep()
        assertEquals(MachineStatus.LOCKED, grill.status)
        val pilot = Autopilot(sim)
        pilot.walkTo(10700, -4000)
        assertEquals("zone.grill_in", sim.state.player.zoneId)
        sim.state.player.bag.add("species.copper_mullet", 1)
        repeat(20) { sim.checkedStep() }
        assertTrue(grill.input.isEmpty())
        assertEquals(1, sim.state.player.bag.quantity("species.copper_mullet"))

        sim.state.completedQuests += "quest.fill_the_hold"
        sim.state.coins = 200
        val bought = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.harbor_grill", "grill-1")))
        assertTrue(bought.filterIsInstance<GameEvent.UpgradePurchased>().any { !it.replayed })
        repeat(30) { sim.checkedStep() }
        assertEquals(0, sim.state.player.bag.quantity("species.copper_mullet"))
        grill.preferredRecipeId = "recipe.grill_mullet"
        repeat(150) { sim.checkedStep() }
        assertEquals(2, grill.output.quantity("product.grilled_fillet"))
    }

    @Test
    fun productRecipeTreeSupportsMultiInputAndIntermediateCrafts() {
        val c = Shared.content
        assertEquals("0.26.0", c.contentVersion)
        val productIds = c.products.map { it.id }.toSet()
        assertTrue(productIds.containsAll(listOf(
            "product.diced_fish", "product.skewer", "product.soup_stock", "product.ice_packed_crate",
        )))
        c.harbors.forEach { harbor ->
            harbor.counters.forEach { counter ->
                assertTrue(counter.products.containsAll(listOf(
                    "product.skewer", "product.soup_stock", "product.ice_packed_crate", "product.diced_fish",
                )))
            }
        }

        val sim = newSim()
        val cutter = cutter(sim)
        cutter.preferredRecipeId = "recipe.dice_sprat"
        cutter.input.add("species.silver_sprat", 1)
        repeat(90) { sim.checkedStep() }
        assertEquals(2, cutter.output.quantity("product.diced_fish"))

        cutter.preferredRecipeId = "recipe.harbor_skewers"
        val diced = cutter.output.quantity("product.diced_fish")
        cutter.input.add("product.diced_fish", diced)
        cutter.output.remove("product.diced_fish", diced)
        repeat(120) { sim.checkedStep() }
        assertEquals(2, cutter.output.quantity("product.skewer"))
        assertTrue(cutter.input.isEmpty())

        cutter.preferredRecipeId = "recipe.mixed_grill_skewers"
        cutter.input.add("species.blue_mackerel", 1)
        cutter.input.add("species.harbor_herring", 1)
        repeat(140) { sim.checkedStep() }
        assertEquals(4, cutter.output.quantity("product.skewer"))

        cutter.preferredRecipeId = "recipe.diced_soup"
        cutter.input.add("product.diced_fish", 2)
        repeat(100) { sim.checkedStep() }
        assertEquals(1, cutter.output.quantity("product.soup_stock"))

        val smoker = smoker(sim)
        smoker.preferredRecipeId = "recipe.ice_pack_catch"
        smoker.input.add("species.amber_snapper", 1)
        smoker.input.add("species.blue_mackerel", 1)
        repeat(170) { sim.checkedStep() }
        assertEquals(1, smoker.output.quantity("product.ice_packed_crate"))
        assertTrue(smoker.input.isEmpty())

        smoker.preferredRecipeId = "recipe.ice_pack_diced"
        smoker.input.add("product.diced_fish", 3)
        repeat(150) { sim.checkedStep() }
        assertEquals(2, smoker.output.quantity("product.ice_packed_crate"))
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
    fun emptySpotRegenUsesSlowerCurveThanNearFull() {
        val sim = newSim()
        val def = sim.content.harborsById.getValue(HARBOR).fishingSpots.first { it.zone == "zone.pier_end" }
        val empty = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
            .regenTicksFor(def, stock = 0, fishRegenPermille = 1000)
        val nearlyFull = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
            .regenTicksFor(def, stock = def.stockMax - 1, fishRegenPermille = 1000)
        assertTrue("empty=$empty nearlyFull=$nearlyFull", empty > nearlyFull)
        val spot = sim.state.fishingSpots.first { it.zoneId == "zone.pier_end" }
        spot.stock = 0
        spot.regenProgress = 0
        repeat(empty - 1) { sim.checkedStep() }
        assertEquals(0, spot.stock)
        sim.checkedStep()
        assertEquals(1, spot.stock)
    }

    @Test
    fun fishRegenUpgradeShortensRestockWait() {
        val sim = newSim()
        val def = sim.content.harborsById.getValue(HARBOR).fishingSpots.first { it.zone == "zone.pier_end" }
        val base = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
            .regenTicksFor(def, 0, 1000)
        val boosted = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
            .regenTicksFor(def, 0, 1250)
        assertTrue(boosted < base)
        sim.state.player.fishRegenPermille = 1250
        val spot = sim.state.fishingSpots.first { it.zoneId == "zone.pier_end" }
        spot.stock = 0
        spot.regenProgress = 0
        repeat(boosted - 1) { sim.checkedStep() }
        assertEquals(0, spot.stock)
        sim.checkedStep()
        assertEquals(1, spot.stock)
    }

    @Test
    fun sidePierLockedUntilUpgradeThenFishes() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        // Onto the pier, then north onto the spur (no diagonal shortcut over water).
        pilot.walkTo(-12750, 0)
        pilot.walkTo(-12750, 3000)
        assertEquals("zone.pier_spur", sim.state.player.zoneId)
        assertTrue(sim.view().context!!.lines[0].startsWith("Locked"))
        repeat(40) { pilot.tick(Command.Move(0, 0)) }
        assertNull(sim.state.player.fishingSpecies)
        assertEquals(0, sim.state.stat(Stats.FISH_CAUGHT))

        sim.state.coins = 10_000
        val buy = sim.checkedStep(
            listOf(
                Command.PurchaseUpgrade("upgrade.bag_capacity_2", "req-bag"),
                Command.PurchaseUpgrade("upgrade.tide_chart", "req-tide"),
                Command.PurchaseUpgrade("upgrade.side_pier", "req-spur"),
            ),
        )
        assertTrue(buy.any { it is GameEvent.UpgradePurchased && it.upgradeId == "upgrade.side_pier" })
        assertTrue("upgrade.side_pier" in sim.state.ownedUpgrades)
        pilot.waitUntil(400) { sim.state.stat(Stats.FISH_CAUGHT) >= 1 }
        assertTrue(sim.state.stat(Stats.FISH_CAUGHT) >= 1)
    }

    @Test
    fun emptyPierShowsSoftFeedbackInView() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        pilot.walkTo(-14250, 0)
        val spot = sim.state.fishingSpots.first { it.zoneId == "zone.pier_end" }
        spot.stock = 0
        spot.regenProgress = 0
        pilot.tick(Command.Move(0, 0))
        val v = sim.view()
        assertTrue(v.fishingSpotEmpty)
        assertNotNull(v.fishingRegenProgress)
        assertTrue(v.context!!.lines.any { it.contains("empty", ignoreCase = true) })
    }

    @Test
    fun preferredRecipeLocksOutOtherReadyInputs() {
        val sim = newSim()
        val m = cutter(sim)
        m.input.add(sprat, 1)
        m.input.add("species.harbor_herring", 1)
        // Lock to herring; sprat is first in content order and would otherwise win.
        val events = sim.checkedStep(listOf(Command.SelectMachineRecipe("station.cutter_1", "recipe.herring_portions"))) +
            (1..100).flatMap { sim.checkedStep() }
        assertEquals("recipe.herring_portions", m.preferredRecipeId)
        val started = events.filterIsInstance<GameEvent.BatchStarted>().single()
        assertEquals("recipe.herring_portions", started.recipeId)
        assertEquals(0, m.input.quantity("species.harbor_herring"))
        assertEquals(1, m.input.quantity(sprat))
    }

    @Test
    fun outputFullStatusNamesBlockedProducts() {
        val sim = newSim()
        val m = cutter(sim)
        m.output.add(portion, 19)
        m.input.add(sprat, 1)
        sim.run(5)
        assertEquals(MachineStatus.OUTPUT_FULL, m.status)
        val text = com.willio.jeanvilma.fishshopping.core.production.ProductionSystem.statusText(m, sim.content)
        assertTrue(text, text.contains("Output full"))
        assertTrue(text, text.contains("Basic portion"))
        assertTrue(sim.view().stations.first { it.stationId == "station.cutter_1" }.statusText.contains("collect"))
    }

    @Test
    fun filletAndSmokerDurationUpgradesApplyToNextBatch() {
        val sim = newSim()
        sim.state.completedQuests += "quest.first_ten_sales"
        sim.state.coins = 10_000
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.cutter_speed_2", "r1")))
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.cutter_fillet_speed", "r2")))
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.smoker_speed_2", "r3")))
        val cutter = cutter(sim)
        cutter.input.add("species.blue_mackerel", 1)
        val cutterEvents = (1..150).flatMap { sim.checkedStep() }
        val started = cutterEvents.filterIsInstance<GameEvent.BatchStarted>().single()
        val done = cutterEvents.filterIsInstance<GameEvent.BatchCompleted>().single()
        assertEquals("recipe.mackerel_fillets", started.recipeId)
        assertEquals(100L, done.tick - started.tick)

        val smoker = smoker(sim)
        smoker.input.add("product.fillet", 1)
        val smokeEvents = (1..150).flatMap { sim.checkedStep() }
        val smokeStarted = smokeEvents.filterIsInstance<GameEvent.BatchStarted>().single()
        val smokeDone = smokeEvents.filterIsInstance<GameEvent.BatchCompleted>().single()
        assertEquals("recipe.smoke_fillet", smokeStarted.recipeId)
        assertEquals(120L, smokeDone.tick - smokeStarted.tick)
    }

    @Test
    fun cyclePreferredRecipeRotatesAutoAndRecipes() {
        val sim = newSim()
        val m = cutter(sim)
        val sys = com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
        assertNull(m.preferredRecipeId)
        assertEquals("recipe.basic_portions", sys.cyclePreferredRecipe(sim.content, m))
        assertEquals("recipe.herring_portions", sys.cyclePreferredRecipe(sim.content, m))
        // Skip through the rest back to Auto.
        var guard = 0
        val recipeCount = sim.content.machinesById.getValue(m.machineId).recipes.size
        while (sys.cyclePreferredRecipe(sim.content, m) != null) {
            check(++guard < recipeCount + 2) { "cycle did not return to Auto" }
        }
        assertNull(m.preferredRecipeId)
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

    @Test
    fun hireFisherAndPorterIsIdempotentAndShowsStaffPanel() {
        val sim = newSim()
        assertEquals("0.26.0", Shared.content.contentVersion)
        assertTrue(sim.view().staff.any { it.roleId == "worker.fisher" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.operator" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.cashier" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.supervisor" })
        assertTrue(sim.view().staff.filter { it.roleId != "worker.supervisor" }
            .all { it.reason?.startsWith("Requires:") == true })
        unlockStaffHiring(sim)
        sim.state.coins = 500
        val hire1 = sim.checkedStep(listOf(Command.HireWorker("worker.fisher", "hire-f1")))
        assertTrue(hire1.filterIsInstance<GameEvent.WorkerHired>().any { !it.replayed })
        assertEquals(1, sim.state.workers.size)
        assertEquals(1L, sim.state.stat(Stats.WORKERS_HIRED))
        val coinsAfter = sim.state.coins
        val hireReplay = sim.checkedStep(listOf(Command.HireWorker("worker.fisher", "hire-f1")))
        assertTrue(hireReplay.filterIsInstance<GameEvent.WorkerHired>().single().replayed)
        assertEquals(1, sim.state.workers.size)
        assertEquals(coinsAfter, sim.state.coins)
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hire-p1")))
        assertEquals(2, sim.state.workers.size)
        assertTrue(sim.view().workers.any { it.roleKind == "fisher" })
        assertTrue(sim.view().workers.any { it.roleKind == "porter" })
        assertTrue(sim.view().staff.none { it.reason == "Coming soon" })
        assertTrue(sim.view().staff.filter { it.roleId == "worker.operator" || it.roleId == "worker.cashier" }
            .all { it.purchasable || it.reason?.startsWith("Need") == true })
        assertTrue(sim.view().staff.first { it.roleId == "worker.supervisor" }.reason!!.startsWith("Requires:"))
    }

    @Test
    fun fisherCatchesFishAndDeliversToCutter() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.HireWorker("worker.fisher", "hf")))
        val events = (1..8_000).flatMap { sim.checkedStep() }
        assertTrue(events.filterIsInstance<GameEvent.FishCaught>().isNotEmpty())
        assertTrue(sim.state.stat(Stats.WORKER_FISH_CAUGHT) > 0)
        assertTrue(
            "fisher should feed the cutter",
            cutter(sim).input.usedUnits() > 0 || cutter(sim).output.usedUnits() > 0 || cutter(sim).activeBatch != null,
        )
    }

    @Test
    fun porterHaulsMachineOutputToCounter() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp")))
        cutter(sim).output.add(portion, 3)
        val events = (1..4_000).flatMap { sim.checkedStep() }
        assertTrue(events.filterIsInstance<GameEvent.ItemsTransferred>().any {
            it.to == sim.state.counters.single().stock.id
        })
        assertTrue(sim.state.counters.single().stock.quantity(portion) > 0)
        assertTrue(sim.state.stat(Stats.WORKER_ITEMS_MOVED) > 0)
    }

    @Test
    fun operatorHaulsFilletFromCutterToSmoker() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.HireWorker("worker.operator", "ho")))
        val fillet = "product.fillet"
        cutter(sim).output.add(fillet, 2)
        val events = (1..4_000).flatMap { sim.checkedStep() }
        assertTrue(events.filterIsInstance<GameEvent.ItemsTransferred>().any {
            it.from == cutter(sim).output.id || it.to == smoker(sim).input.id
        })
        assertTrue(
            "operator should feed the smoker",
            smoker(sim).input.quantity(fillet) > 0 ||
                smoker(sim).activeBatch != null ||
                smoker(sim).output.quantity("product.smoked_fillet") > 0,
        )
        assertTrue(sim.state.stat(Stats.WORKER_ITEMS_MOVED) > 0)
    }

    @Test
    fun cashierServesCustomersWithoutPlayerAtCounter() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.HireWorker("worker.cashier", "hc")))
        var onDuty = false
        repeat(4_000) {
            sim.checkedStep()
            val w = sim.state.workers.single()
            if (!w.busyWalking && w.phase == WorkerTaskPhase.WORK && w.taskZoneId == "zone.counter_1") {
                onDuty = true
                return@repeat
            }
        }
        assertTrue("cashier should reach the counter", onDuty)
        assertTrue(sim.state.player.zoneId != "zone.counter_1")

        val counter = sim.state.counters.single()
        counter.stock.add(portion, 2)
        val type = sim.content.customers.first()
        sim.state.customers += CustomerState(
            "customer.test_cashier", type.id, counter.counterId,
            wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
        )
        val events = (1..80).flatMap { sim.checkedStep() }
        assertTrue(events.filterIsInstance<GameEvent.SaleCommitted>().isNotEmpty())
        assertTrue(sim.state.player.zoneId != "zone.counter_1")
        assertTrue(sim.state.stat(Stats.SALES) > 0)
    }

    @Test
    fun operatorTakesIntermediatesBeforePorterWithoutSupervisor() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 500
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp")))
        sim.checkedStep(listOf(Command.HireWorker("worker.operator", "ho")))
        assertEquals(2, sim.state.workers.size)
        val fillet = "product.fillet"
        cutter(sim).output.add(fillet, 1)
        (1..4_000).forEach { sim.checkedStep() }
        // Porter must not stock raw fillet; operator routes it through the smoker
        // (which may already have finished and been collected as smoked fillet).
        assertEquals(0, sim.state.counters.single().stock.quantity(fillet))
        assertEquals(0, cutter(sim).output.available(fillet))
        assertTrue(sim.state.stat(Stats.WORKER_ITEMS_MOVED) > 0)
    }

    @Test
    fun supervisorLetsPorterHaulIntermediatesWhenCounterDemands() {
        val sim = newSim()
        unlockSupervisorHiring(sim)
        sim.state.coins = 500
        sim.checkedStep(listOf(Command.HireWorker("worker.supervisor", "hs")))
        var onDuty = false
        repeat(4_000) {
            sim.checkedStep()
            if (sim.view().supervisorOnDuty) {
                onDuty = true
                return@repeat
            }
        }
        assertTrue(onDuty)
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp")))
        val fillet = "product.fillet"
        val counter = sim.state.counters.single()
        // Empty counter + waiting customer preferring fillet → demand override.
        val type = sim.content.customers.first()
        sim.state.customers += CustomerState(
            "customer.test_sup", type.id, counter.counterId,
            wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
            preferredProductId = fillet,
        )
        cutter(sim).output.add(fillet, 1)
        (1..4_000).forEach { sim.checkedStep() }
        assertTrue(counter.stock.quantity(fillet) > 0 || sim.state.stat(Stats.WORKER_ITEMS_MOVED) > 0)
        assertTrue(sim.view().supervisorOnDuty)
    }

    @Test
    fun haulLeaseExpiryReleasesReservation() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp")))
        cutter(sim).output.add(portion, 1)
        // Assign the haul (reserve) then force the lease to expire before pickup finishes.
        repeat(200) {
            sim.checkedStep()
            val w = sim.state.workers.single()
            if (w.phase == WorkerTaskPhase.WALK_TO_WORK || w.phase == WorkerTaskPhase.PICKUP) {
                assertTrue(cutter(sim).output.reservedQuantity(portion) >= 1)
                w.leaseExpiresAt = sim.state.tick
                val events = sim.checkedStep()
                assertTrue(events.filterIsInstance<GameEvent.LeaseExpired>().isNotEmpty())
                assertEquals(0, cutter(sim).output.reservedQuantity(portion))
                assertEquals(1L, sim.state.stat(Stats.LEASES_EXPIRED))
                return
            }
        }
        fail("porter never claimed a haul lease")
    }

    @Test
    fun offlineApplyRunsWorkersWithoutPlayerZoneActions() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 500
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp-off")))
        cutter(sim).output.add(portion, 3)
        sim.state.player.zoneId = "zone.pier_end"
        val beforeTick = sim.state.tick
        val report = applyOffline(sim, 60_000) // 60s → 1200 ticks
        assertEquals(1200L, report.ticksCredited)
        assertEquals(beforeTick + 1200, sim.state.tick)
        assertEquals("zone.pier_end", sim.state.player.zoneId)
        assertTrue(sim.state.stat(Stats.WORKER_ITEMS_MOVED) > 0)
        assertTrue(OfflinePolicy.shouldShowSummary(sim.content, report))
    }

    @Test
    fun snapshotEnvelopeCarriesSavedAtWithoutBreakingChecksum() {
        val sim = newSim()
        sim.run(5)
        val withAt = SnapshotCodec.encode(sim.content, sim.state, savedAtEpochMs = 1_700_000_000_000L)
        val decoded = SnapshotCodec.decodeEnvelope(sim.content, withAt)
        assertEquals(1_700_000_000_000L, decoded.savedAtEpochMs)
        assertEquals(5L, decoded.state.tick)
        assertEquals(SnapshotCodec.encode(sim.content, sim.state), SnapshotCodec.encode(sim.content, decoded.state))
    }

    @Test
    fun destinationCapacityBlocksOverclaim() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 500
        sim.checkedStep(listOf(
            Command.HireWorker("worker.porter", "hp1"),
            Command.HireWorker("worker.porter", "hp2"),
        ))
        val counter = sim.state.counters.single()
        // Leave room for exactly one portion unit at the counter.
        val room = counter.stock.roomFor(portion)
        if (room > 1) {
            // Fill until one unit of free capacity remains.
            while (counter.stock.roomFor(portion) > 1) counter.stock.add(portion, 1)
        }
        cutter(sim).output.add(portion, 5)
        (1..2_000).forEach { sim.checkedStep() }
        // Never overfill: used + free == capacity, and no invariant break (checkedStep).
        assertTrue(counter.stock.usedUnits() <= counter.stock.capacityUnits)
        assertTrue(counter.stock.quantity(portion) >= 1)
    }

    @Test
    fun workerUpgradesBoostCarryCatchAndChargeWages() {
        val sim = newSim()
        unlockStaffHiring(sim)
        sim.state.coins = 10_000
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.staff_boots", "ub")))
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.staff_satchels", "us")))
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.staff_tackle", "ut")))
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.shift_lead", "uw")))
        assertEquals(1250, sim.state.workerMoveSpeedPermille)
        assertEquals(5, sim.state.workerCarryCapacityFloor)
        assertEquals(1000, sim.state.workerCatchSpeedPermille)
        assertEquals(3, sim.state.workerWagePerWorkerPerHour)
        assertEquals(3, sim.view().workerWagePerWorkerPerHour)
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp-wage")))
        assertEquals(5, sim.state.workers.single().bag.capacityUnits)
        sim.state.workerWageAccrualTicks = 3600 * 20 - 1
        val coinsBefore = sim.state.coins
        val events = sim.checkedStep()
        assertTrue(events.filterIsInstance<GameEvent.WagesPaid>().any { it.workers == 1 && it.coins == 3L })
        assertEquals(coinsBefore - 3, sim.state.coins)
        assertEquals(3L, sim.state.stat(Stats.WAGES_PAID))
    }

    @Test
    fun questChainLocksRewardsAndShowsLog() {
        val sim = newSim()
        val log = sim.view().quests
        assertEquals(4, log.size)
        assertEquals("active", log.first { it.id == "quest.first_ten_sales" }.status)
        assertTrue(log.filter { it.id != "quest.first_ten_sales" }.all { it.status == "locked" })

        sim.state.bumpStat(Stats.SALES, 10)
        val coinsBefore = sim.state.coins
        val events = sim.checkedStep()
        val done = events.filterIsInstance<GameEvent.QuestCompleted>().single()
        assertEquals("quest.first_ten_sales", done.questId)
        assertEquals(50L, done.coinsRewarded)
        assertEquals(coinsBefore + 50, sim.state.coins)
        assertEquals(1L, sim.state.stat(Stats.QUESTS_COMPLETED))
        assertTrue("quest.first_ten_sales" in sim.state.completedQuests)

        val after = sim.view().quests
        assertEquals("completed", after.first { it.id == "quest.first_ten_sales" }.status)
        assertEquals("active", after.first { it.id == "quest.fill_the_hold" }.status)
        assertEquals("active", after.first { it.id == "quest.first_hire" }.status)
        assertEquals("locked", after.first { it.id == "quest.busy_harbor" }.status)

        sim.state.bumpStat(Stats.FISH_CAUGHT, 25)
        sim.state.bumpStat(Stats.WORKERS_HIRED, 1)
        sim.checkedStep()
        assertTrue("quest.fill_the_hold" in sim.state.completedQuests)
        assertTrue("quest.first_hire" in sim.state.completedQuests)

        sim.state.bumpStat(Stats.REVENUE, 250)
        val finale = sim.checkedStep().filterIsInstance<GameEvent.QuestCompleted>().single()
        assertEquals("quest.busy_harbor", finale.questId)
        assertEquals(listOf("upgrade.tide_chart"), finale.unlockUpgrades)
        assertTrue("upgrade.tide_chart" in sim.state.ownedUpgrades)
        assertEquals(1250, sim.state.player.fishRegenPermille)
        assertEquals("completed", sim.view().quests.first { it.id == "quest.busy_harbor" }.status)
    }

    @Test
    fun contractsStayLockedUntilFirstTenSalesThenPayOutOrPenalize() {
        val sim = newSim()
        val locked = sim.view()
        assertFalse(locked.contractsUnlocked)
        assertEquals("Requires: Make 10 sales", locked.contractsLockedReason)
        assertTrue(locked.contractOffers.isEmpty())
        assertTrue(sim.state.contractOffers.isEmpty())
        sim.checkedStep()
        assertTrue(sim.state.contractOffers.isEmpty())
        assertFalse(sim.view().contractsUnlocked)

        sim.state.completedQuests += "quest.first_ten_sales"
        val opened = sim.checkedStep()
        assertTrue(opened.filterIsInstance<GameEvent.ContractBoardRefreshed>().isNotEmpty())
        assertTrue(sim.view().contractsUnlocked)
        assertNull(sim.view().contractsLockedReason)
        assertEquals(sim.content.contracts.boardSlots, sim.state.contractOffers.size)
        assertEquals(sim.content.contracts.refreshPeriodTicks, sim.view().contractRefreshTicksLeft)
        assertTrue(sim.view().contractOffers.all { it.acceptEnabled })

        val offer = sim.state.contractOffers.first()
        val accepted = sim.checkedStep(listOf(Command.AcceptContract(offer.id, "acc-1")))
        assertTrue(accepted.filterIsInstance<GameEvent.ContractAccepted>().any { !it.replayed })
        assertTrue(sim.state.contractOffers.none { it.id == offer.id })
        assertEquals(1, sim.state.activeContracts.size)
        val job = sim.state.activeContracts.single()
        assertEquals(offer.templateId, job.templateId)
        assertEquals(offer.itemId, job.itemId)
        assertEquals(sim.state.tick + offer.durationTicks, job.deadlineTick)
        val replay = sim.checkedStep(listOf(Command.AcceptContract(offer.id, "acc-1")))
        assertTrue(replay.filterIsInstance<GameEvent.ContractAccepted>().single().replayed)
        assertEquals(1, sim.state.activeContracts.size)

        sim.state.player.bag.capacityUnits = 100
        sim.state.player.bag.add(job.itemId, job.quantity)
        val coinsBefore = sim.state.coins
        val delivered = sim.checkedStep(listOf(Command.DeliverContract(job.id, "del-1")))
        assertTrue(delivered.filterIsInstance<GameEvent.ContractCompleted>().any { it.payout == job.payout })
        assertEquals(coinsBefore + job.payout, sim.state.coins)
        assertEquals(1L, sim.state.stat(Stats.CONTRACTS_COMPLETED))
        assertTrue(sim.state.activeContracts.isEmpty())

        // Second job: miss the deadline and pay the penalty.
        val offer2 = sim.state.contractOffers.first()
        sim.checkedStep(listOf(Command.AcceptContract(offer2.id, "acc-2")))
        val late = sim.state.activeContracts.single()
        late.deadlineTick = sim.state.tick // expire next step
        sim.state.coins = 100
        val failed = sim.checkedStep()
        assertTrue(failed.filterIsInstance<GameEvent.ContractFailed>().any { it.penaltyPaid == late.penalty })
        assertEquals(100L - late.penalty, sim.state.coins)
        assertEquals(1L, sim.state.stat(Stats.CONTRACTS_FAILED))
        assertTrue(sim.state.activeContracts.isEmpty())
    }

    @Test
    fun moonCoveUnlocksAfterBusyHarborAndTravelStashesWorld() {
        val sim = newSim()
        val map = sim.view().harbors
        assertEquals(2, map.size)
        assertEquals("harbor.sunrise_pier", map[0].harborId)
        assertTrue(map[0].current)
        assertTrue(map[0].unlocked)
        assertFalse(map[0].travelEnabled)
        assertEquals("harbor.moon_cove", map[1].harborId)
        assertFalse(map[1].unlocked)
        assertEquals("Requires: Busy harbor", map[1].reason)
        assertEquals("moon_cove_blockout.glb", map[1].blockoutAsset)

        val rejected = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.moon_cove", "go-1")))
        assertTrue(rejected.filterIsInstance<GameEvent.TravelRejected>().any {
            it.reason.contains("Busy harbor")
        })
        assertEquals(HARBOR, sim.state.harborId)

        sim.state.completedQuests += "quest.busy_harbor"
        assertTrue(sim.view().harbors.first { it.harborId == "harbor.moon_cove" }.travelEnabled)

        val spot = sim.state.fishingSpots.first { it.zoneId == "zone.pier_end" }
        spot.stock = 3
        sim.state.coins = 777
        sim.state.player.bag.capacityUnits = 20
        sim.state.player.bag.add("species.silver_sprat", 2)

        val traveled = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.moon_cove", "go-2")))
        assertTrue(traveled.filterIsInstance<GameEvent.HarborTraveled>().any { !it.replayed && it.toHarborId == "harbor.moon_cove" })
        assertEquals("harbor.moon_cove", sim.state.harborId)
        assertEquals("Moon Cove", sim.view().harborName)
        assertEquals("moon_cove_blockout.glb", sim.view().blockoutAsset)
        assertEquals(777L, sim.state.coins)
        assertEquals(2, sim.state.player.bag.quantity("species.silver_sprat"))
        assertEquals(sim.harbor.playerSpawn.x, sim.state.player.x)
        assertEquals(sim.harbor.playerSpawn.z, sim.state.player.z)
        assertTrue(sim.state.fishingSpots.any { it.zoneId == "zone.cove_end" })
        assertTrue(sim.state.harborStashes.containsKey(HARBOR))
        assertEquals(3, sim.state.harborStashes.getValue(HARBOR).fishingSpots.first { it.zoneId == "zone.pier_end" }.stock)
        assertEquals(1L, sim.state.stat(Stats.HARBORS_TRAVELED))

        val replay = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.moon_cove", "go-2")))
        assertTrue(replay.filterIsInstance<GameEvent.HarborTraveled>().single().replayed)
        assertEquals(1L, sim.state.stat(Stats.HARBORS_TRAVELED))

        val back = sim.checkedStep(listOf(Command.TravelToHarbor(HARBOR, "go-back")))
        assertTrue(back.filterIsInstance<GameEvent.HarborTraveled>().any { it.toHarborId == HARBOR })
        assertEquals(HARBOR, sim.state.harborId)
        assertEquals(3, sim.state.fishingSpots.first { it.zoneId == "zone.pier_end" }.stock)
        assertEquals(2, sim.state.player.bag.quantity("species.silver_sprat"))
        assertTrue(sim.state.harborStashes.containsKey("harbor.moon_cove"))
        assertEquals(2L, sim.state.stat(Stats.HARBORS_TRAVELED))

        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":10,"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(HARBOR, restored.harborId)
        assertTrue(restored.harborStashes.containsKey("harbor.moon_cove"))
        assertEquals(3, restored.fishingSpots.first { it.zoneId == "zone.pier_end" }.stock)
    }

    @Test
    fun economySinksUnlockAfterFirstTenSalesAndChargeOrSpoil() {
        val sim = newSim()
        val locked = sim.view()
        assertFalse(locked.economyUnlocked)
        assertEquals("Requires: Make 10 sales", locked.economyLockedReason)
        assertEquals(0, locked.maintenanceCoinsPerStation)
        assertFalse(locked.bagFishSpoilActive)

        // Accrual is inert while locked.
        repeat(sim.content.economy.maintenancePeriodTicks) { sim.checkedStep() }
        assertEquals(0L, sim.state.stat(Stats.MAINTENANCE_PAID))
        assertEquals(0L, sim.state.stat(Stats.ITEMS_SPOILED))

        sim.state.completedQuests += "quest.first_ten_sales"
        val unlocked = sim.view()
        assertTrue(unlocked.economyUnlocked)
        assertNull(unlocked.economyLockedReason)
        assertEquals(2, unlocked.maintenanceCoinsPerStation)
        assertTrue(unlocked.bagFishSpoilActive)

        sim.state.coins = 50
        sim.state.maintenanceAccrualTicks = sim.content.economy.maintenancePeriodTicks - 1
        val maint = sim.checkedStep()
        // Locked grill stations are not billed until unlock_machine is owned.
        val stations = sim.harbor.stations.count {
            com.willio.jeanvilma.fishshopping.core.production.ProductionSystem.isUnlocked(it, sim.state)
        }
        assertEquals(2, stations)
        assertTrue(maint.filterIsInstance<GameEvent.MaintenancePaid>().any {
            it.stations == stations && it.coins == 2L * stations
        })
        assertEquals(50L - 2L * stations, sim.state.coins)
        assertEquals(2L * stations, sim.state.stat(Stats.MAINTENANCE_PAID))

        // Machine oil lowers the per-station rate.
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.machine_oil", "oil-1")))
        assertEquals(1, sim.state.maintenanceDiscountPerStation)
        assertEquals(1, sim.view().maintenanceCoinsPerStation)
        sim.state.maintenanceAccrualTicks = sim.content.economy.maintenancePeriodTicks - 1
        val cheaper = sim.checkedStep()
        assertTrue(cheaper.filterIsInstance<GameEvent.MaintenancePaid>().any { it.coins == 1L * stations })

        // Counter spoilage removes one product unit deterministically.
        val counter = sim.state.counters.single()
        sim.state.customers.clear()
        counter.stock.restore(emptyMap(), emptyMap())
        counter.stock.add("product.basic_portion", 3)
        sim.state.counterSpoilAccrualTicks = sim.content.economy.counterSpoilPeriodTicks - 1
        val spoiled = sim.checkedStep()
        val spoilEvt = spoiled.filterIsInstance<GameEvent.ItemsSpoiled>().single { it.location == "counter" }
        assertEquals(listOf(com.willio.jeanvilma.fishshopping.core.content.ItemQuantity("product.basic_portion", 1)), spoilEvt.items)
        assertEquals(2, counter.stock.quantity("product.basic_portion"))
        assertEquals(1L, sim.state.stat(Stats.ITEMS_SPOILED))

        // Bag fish spoil; ice box doubles the period.
        sim.state.customers.clear()
        sim.state.player.bag.capacityUnits = 10
        sim.state.player.bag.add("species.silver_sprat", 2)
        sim.state.bagSpoilAccrualTicks = sim.content.economy.bagFishSpoilPeriodTicks - 1
        val bagSpoil = sim.checkedStep()
        assertTrue(bagSpoil.filterIsInstance<GameEvent.ItemsSpoiled>().any { it.location == "bag" })
        assertEquals(1, sim.state.player.bag.quantity("species.silver_sprat"))
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.ice_box", "ice-1")))
        assertEquals(2000, sim.state.bagSpoilPeriodMultPermille)
        sim.state.bagSpoilAccrualTicks = 0
        repeat(sim.content.economy.bagFishSpoilPeriodTicks) { sim.checkedStep() }
        assertEquals(1, sim.state.player.bag.quantity("species.silver_sprat")) // not yet spoiled
        sim.state.bagSpoilAccrualTicks = sim.content.economy.bagFishSpoilPeriodTicks * 2 - 1
        sim.checkedStep()
        assertEquals(0, sim.state.player.bag.quantity("species.silver_sprat"))
    }

    @Test
    fun spoilTiersPreferFragileCounterStockAndSeparateCaseIce() {
        val c = Shared.content
        assertEquals("0.26.0", c.contentVersion)
        assertEquals(3, c.productsById.getValue("product.basic_portion").spoilTier)
        assertEquals(1, c.productsById.getValue("product.smoked_fillet").spoilTier)
        assertEquals(3, c.speciesById.getValue("species.silver_sprat").spoilTier)

        val sim = newSim()
        sim.state.completedQuests += "quest.first_ten_sales"
        val counter = sim.state.counters.single()
        sim.state.customers.clear()
        counter.stock.restore(emptyMap(), emptyMap())
        counter.stock.add("product.smoked_fillet", 2)
        counter.stock.add(portion, 2)
        val eco = com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
        sim.state.counterSpoilAccrualTicks = eco.counterSpoilPeriodTicks(sim.content, sim.state) - 1
        val spoiled = sim.checkedStep()
        val spoilEvt = spoiled.filterIsInstance<GameEvent.ItemsSpoiled>().single { it.location == "counter" }
        assertEquals(listOf(com.willio.jeanvilma.fishshopping.core.content.ItemQuantity(portion, 1)), spoilEvt.items)
        assertEquals(1, counter.stock.quantity(portion))
        assertEquals(2, counter.stock.quantity("product.smoked_fillet"))

        sim.state.coins = 200
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.display_case_ice", "case-1")))
        assertEquals(2000, sim.state.counterSpoilPeriodMultPermille)
        assertEquals(1000, sim.state.bagSpoilPeriodMultPermille)
        counter.stock.add(portion, 1)
        sim.state.counterSpoilAccrualTicks = 0
        repeat(sim.content.economy.counterSpoilPeriodTicks) { sim.checkedStep() }
        assertEquals(2, counter.stock.quantity(portion))
        sim.state.counterSpoilAccrualTicks = sim.content.economy.counterSpoilPeriodTicks * 2 - 1
        sim.checkedStep()
        assertEquals(1, counter.stock.quantity(portion))
    }

    @Test
    fun prestigeStaysLockedUntilBusyHarborThenGrantsBonusesAndCosmetics() {
        val sim = newSim()
        assertEquals("0.26.0", Shared.content.contentVersion)
        val locked = sim.view()
        assertFalse(locked.prestigeUnlocked)
        assertEquals("Requires: Busy harbor", locked.prestigeLockedReason)
        assertEquals(1, locked.harborRating) // revenue 0 meets the first threshold
        assertEquals(3, locked.prestige.size)
        assertTrue(locked.prestige.all { it.status == "locked" })
        // Board is locked: milestones should not complete even if goals are met.
        sim.state.bumpStat(Stats.REVENUE, 1000)
        sim.checkedStep()
        assertTrue(sim.state.completedPrestige.isEmpty())
        assertEquals(1000, sim.state.prestigeCatchSpeedPermille)
        assertEquals(1000, sim.state.prestigePriceBonusPermille)

        sim.state.completedQuests += "quest.busy_harbor"
        val board = sim.view()
        assertTrue(board.prestigeUnlocked)
        assertNull(board.prestigeLockedReason)
        assertEquals(3, board.prestige.size)
        assertEquals("active", board.prestige.first { it.id == "prestige.rising_tide" }.status)
        assertEquals("locked", board.prestige.first { it.id == "prestige.harbor_star" }.status)
        assertEquals("active", board.prestige.first { it.id == "prestige.twin_harbors" }.status)
        assertEquals(3, board.harborRating) // 1000 revenue → thresholds 0,250,750

        val coinsBefore = sim.state.coins
        val rising = sim.checkedStep().filterIsInstance<GameEvent.PrestigeUnlocked>().single()
        assertEquals("prestige.rising_tide", rising.prestigeId)
        assertEquals(100L, rising.coinsRewarded)
        assertEquals("banner.rising_tide", rising.cosmetic)
        assertEquals(1050, rising.catchSpeedPermille)
        assertEquals(coinsBefore + 100, sim.state.coins)
        assertEquals(1050, sim.state.prestigeCatchSpeedPermille)
        assertTrue("banner.rising_tide" in sim.state.unlockedCosmetics)
        assertEquals(1L, sim.state.stat(Stats.PRESTIGE_COMPLETED))
        assertEquals("completed", sim.view().prestige.first { it.id == "prestige.rising_tide" }.status)
        assertEquals("active", sim.view().prestige.first { it.id == "prestige.harbor_star" }.status)

        sim.state.bumpStat(Stats.SALES, 100)
        val star = sim.checkedStep().filterIsInstance<GameEvent.PrestigeUnlocked>().single()
        assertEquals("prestige.harbor_star", star.prestigeId)
        assertEquals(1050, sim.state.prestigePriceBonusPermille)
        assertTrue("banner.harbor_star" in sim.state.unlockedCosmetics)

        sim.state.bumpStat(Stats.HARBORS_TRAVELED, 2)
        val twin = sim.checkedStep().filterIsInstance<GameEvent.PrestigeUnlocked>().single()
        assertEquals("prestige.twin_harbors", twin.prestigeId)
        assertTrue("banner.twin_harbors" in sim.state.unlockedCosmetics)
        assertEquals(3L, sim.state.stat(Stats.PRESTIGE_COMPLETED))
        assertEquals(listOf("banner.harbor_star", "banner.rising_tide", "banner.twin_harbors"), sim.view().unlockedCosmetics)

        // Snapshot round-trip rebuilds permanent floors from completedPrestige.
        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":10,"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(setOf("prestige.rising_tide", "prestige.harbor_star", "prestige.twin_harbors"), restored.completedPrestige)
        assertEquals(1050, restored.prestigeCatchSpeedPermille)
        assertEquals(1050, restored.prestigePriceBonusPermille)
        assertEquals(
            setOf("banner.rising_tide", "banner.harbor_star", "banner.twin_harbors"),
            restored.unlockedCosmetics,
        )
    }
}
