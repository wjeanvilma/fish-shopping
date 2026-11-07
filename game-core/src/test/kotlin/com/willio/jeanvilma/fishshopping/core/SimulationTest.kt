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
import com.willio.jeanvilma.fishshopping.core.sim.Telemetry
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

    /** Walk onto a Phase 6 expansion marker (plot zone center). */
    private fun walkToPlot(pilot: Autopilot, sim: Simulation, plotId: String) {
        val plot = sim.harbor.plotsById.getValue(plotId)
        val zone = sim.harbor.zonesById.getValue(plot.zone)
        pilot.walkTo(zone.rect.centerX, zone.rect.centerZ)
        assertEquals(plot.zone, sim.state.player.zoneId)
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
        assertEquals("1.0.0", c.contentVersion)
        assertEquals(36, c.species.size)
        val sunrise = c.harborsById.getValue("harbor.sunrise_pier").fishingSpots.flatMap { it.species }
        val moon = c.harborsById.getValue("harbor.moon_cove").fishingSpots.flatMap { it.species }
        val northlight = c.harborsById.getValue("harbor.northlight_harbor").fishingSpots.flatMap { it.species }
        val marina = c.harborsById.getValue("harbor.grand_marina").fishingSpots.flatMap { it.species }
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
        for (id in listOf(
            "species.frost_smelt", "species.arctic_cod", "species.ice_char", "species.polar_herring",
        )) {
            assertTrue(id in northlight)
            assertTrue(id !in sunrise)
            assertTrue(id !in moon)
        }
        for (id in listOf(
            "species.marina_tuna", "species.saffron_sole", "species.pearl_grouper", "species.harbor_pompano",
        )) {
            assertTrue(id in marina)
            assertTrue(id !in sunrise)
            assertTrue(id !in moon)
            assertTrue(id !in northlight)
        }
        assertEquals("species.bronze_mullet", c.speciesById.getValue("species.copper_mullet").rareUpgrade!!.to)
        assertEquals("species.ruby_snapper", c.speciesById.getValue("species.amber_snapper").rareUpgrade!!.to)
        assertEquals("species.silver_dawn_anchovy", c.speciesById.getValue("species.dawn_anchovy").rareUpgrade!!.to)
        assertEquals("species.prism_lanternfish", c.speciesById.getValue("species.ghost_lanternfish").rareUpgrade!!.to)
        assertEquals("species.crystal_smelt", c.speciesById.getValue("species.frost_smelt").rareUpgrade!!.to)
        assertEquals("species.aurora_cod", c.speciesById.getValue("species.arctic_cod").rareUpgrade!!.to)
        assertEquals("species.gilt_tuna", c.speciesById.getValue("species.marina_tuna").rareUpgrade!!.to)
        assertEquals("species.gilt_sole", c.speciesById.getValue("species.saffron_sole").rareUpgrade!!.to)
        c.species.forEach { sp ->
            assertTrue("${sp.id} missing asset path", sp.asset!!.matches(Regex("""^models/fish_.+\.glb$""")))
        }
        c.products.forEach { prod ->
            assertTrue("${prod.id} missing asset path", prod.asset!!.matches(Regex("""^models/product_.+\.glb$""")))
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
            SnapshotCodec.decode(sim.content, saved.replace("\"schemaVersion\":20", "\"schemaVersion\":99"))
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
        val counter = sim.primaryCounter()
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
        val counter = sim.primaryCounter()
        counter.stock.add(portion, 1)
        sim.padNeutralScarcity()
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
        val counter = sim.primaryCounter()
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
    fun customerRosterIncludesPremiumBulkAndPhase11Archetypes() {
        val kinds = Shared.content.customers.map { it.kind }.toSet()
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.PREMIUM))
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.BULK))
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.TOURIST))
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.WHOLESALER))
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.CRITIC))
        assertTrue(kinds.contains(com.willio.jeanvilma.fishshopping.core.content.CustomerKind.NIGHT_REGULAR))
        assertTrue(Shared.content.customers.any { it.id == "customer.premium_visitor" && it.priceMultPermille > 1000 })
        assertTrue(Shared.content.customers.any { it.id == "customer.restaurant_buyer" && it.basketMin >= 6 })
        val night = Shared.content.customersById.getValue("customer.night_regular")
        assertTrue((night.dayPartSpawnMultPermille["night"] ?: 0) > (night.dayPartSpawnMultPermille["day"] ?: 9999))
    }

    @Test
    fun nightRegularSpawnWeightRisesAtNightAndCriticSaleTracks() {
        val sim = newSim()
        val CS = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
        val FS = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
        val nightType = sim.content.customersById.getValue("customer.night_regular")
        sim.state.tick = 0
        val dawnW = CS.effectiveSpawnWeight(sim.content, sim.state, sim.harbor, nightType)
        val dayLen = sim.content.ecology.dayLengthTicks.toLong()
        sim.state.tick = (dayLen * 850L) / 1000L
        assertEquals("night", FS.dayPartAt(sim.content, sim.state.tick).id)
        val nightW = CS.effectiveSpawnWeight(sim.content, sim.state, sim.harbor, nightType)
        assertTrue("dawn=$dawnW night=$nightW", nightW > dawnW)

        val critic = sim.content.customersById.getValue("customer.food_critic")
        val counter = sim.primaryCounter()
        counter.stock.add("product.grilled_fillet", 1)
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_critic", critic.id, counter.counterId, wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
            preferredProductId = "product.grilled_fillet",
        )
        Autopilot(sim).walkTo(3000, 2750)
        val events = (1..80).flatMap { sim.checkedStep() }
        assertTrue(events.any { it is GameEvent.SaleCommitted })
        assertEquals(1L, sim.state.stat(Stats.CRITIC_SALES))
    }

    @Test
    fun touristAndWholesalerKindsShowInCounterContext() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        val counter = sim.primaryCounter()
        counter.stock.add(portion, 20)
        val tourist = sim.content.customersById.getValue("customer.harbor_tourist")
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_tourist", tourist.id, counter.counterId, wants = 2, patienceLeft = 9_999, walkTicksTotal = 0,
        )
        pilot.walkTo(3000, 2750)
        pilot.tick(Command.Move(0, 0))
        assertTrue(sim.view().context!!.lines.any { it.contains("tourist tip") })
        sim.state.customers.clear()
        counter.stock.restore(emptyMap(), emptyMap())
        counter.checkoutProgress = 0
        sim.state.ownedUpgrades += "upgrade.wholesale_pad"
        val wholesale = sim.state.counters.first { it.counterId == "counter.wholesale_1" }
        wholesale.stock.add("product.ice_packed_crate", 4)
        val wholesaler = sim.content.customersById.getValue("customer.wholesaler")
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_wholesale", wholesaler.id, wholesale.counterId, wants = 2, patienceLeft = 9_999, walkTicksTotal = 0,
            preferredProductId = "product.ice_packed_crate",
        )
        pilot.walkTo(7000, 2750)
        pilot.tick(Command.Move(0, 0))
        assertTrue(sim.view().context!!.title.contains("Wholesale", ignoreCase = true) ||
            sim.view().context!!.lines.any { it.contains("wholesale order") })
        val events = (1..80).flatMap { pilot.tick(Command.Move(0, 0)) }
        assertTrue(events.any { it is GameEvent.SaleCommitted })
        assertEquals(1L, sim.state.stat(Stats.WHOLESALER_SALES))
    }

    @Test
    fun preferredProductIsReservedFirstAndPaysFullPrice() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        val counter = sim.primaryCounter()
        val fillet = "product.fillet"
        counter.stock.add(portion, 2)
        counter.stock.add(fillet, 1)
        sim.padNeutralScarcity()
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
        val counter = sim.primaryCounter()
        counter.stock.add(portion, 1)
        sim.padNeutralScarcity()
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
    fun reputationScoreBiasesSpawnMixAndShowsInTheView() {
        val c = Shared.content
        assertEquals("1.0.0", c.contentVersion)
        assertTrue(c.reputation.minSample >= 1)
        assertEquals(c.reputation.scoreBandThresholdsPermille.size + 1, c.reputation.kindSpawnMultPermille.size)

        val sim = newSim()
        val RS = com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
        val CS = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
        assertEquals(c.reputation.neutralScorePermille, RS.scorePermille(c, sim.state))
        assertEquals(c.reputation.neutralScorePermille, sim.view().reputationScorePermille)
        assertTrue(sim.view().reputationLabel.isNotBlank())

        val premium = c.customersById.getValue("customer.premium_visitor")
        val bulk = c.customersById.getValue("customer.restaurant_buyer")
        val neutralPremium = CS.effectiveSpawnWeight(c, sim.state, sim.harbor, premium)
        val neutralBulk = CS.effectiveSpawnWeight(c, sim.state, sim.harbor, bulk)

        sim.state.bumpStat(Stats.SALES, 2)
        sim.state.bumpStat(Stats.LOST_CUSTOMERS, 10)
        assertEquals(12L, RS.encounters(sim.state))
        assertTrue(RS.scorePermille(c, sim.state) < 400)
        assertEquals(0, RS.band(c, sim.state))
        assertEquals("Poor", sim.view().reputationLabel)
        val poorPremium = CS.effectiveSpawnWeight(c, sim.state, sim.harbor, premium)
        val poorBulk = CS.effectiveSpawnWeight(c, sim.state, sim.harbor, bulk)
        assertTrue(poorPremium < neutralPremium)
        assertTrue(poorBulk > neutralBulk)

        sim.state.stats[Stats.SALES] = 20
        sim.state.stats[Stats.LOST_CUSTOMERS] = 1
        assertTrue(RS.scorePermille(c, sim.state) >= 850)
        assertEquals("Excellent", RS.bandLabel(c, sim.state))
        assertTrue(CS.effectiveSpawnWeight(c, sim.state, sim.harbor, premium) > poorPremium)
    }

    @Test
    fun dynamicPricingStacksScarcityRushAndRatingIntoSaleMult() {
        val c = Shared.content
        assertEquals("1.0.0", c.contentVersion)
        assertEquals(5, c.economy.scarcityPriceCurvePermille.size)
        assertEquals(6, c.prestige.ratingPriceMultPermille.size)
        val lunch = c.harborsById.getValue(HARBOR).rushes.first { it.id == "rush.lunch" }
        assertTrue(lunch.priceMultPermille > 1000)

        val sim = newSim()
        val pilot = Autopilot(sim)
        val CS = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
        val counter = sim.primaryCounter()
        val def = sim.harbor.counters.first { it.id == counter.counterId }
        counter.stock.add(portion, 1)
        assertEquals(1150, CS.scarcityPriceMultPermille(sim.content, def, counter))
        pilot.walkTo(3000, 2750)
        pilot.tick(Command.Move(0, 0))
        assertTrue(sim.view().context!!.lines.any { it.startsWith("Demand prices +") })

        val type = sim.content.customersById.getValue("customer.local_shopper")
        sim.state.customers.clear()
        counter.stock.restore(emptyMap(), emptyMap())
        counter.stock.add(portion, 1)
        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_scarce", type.id, counter.counterId, wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
        )
        val scarceSale = (1..80).flatMap { pilot.tick(Command.Move(0, 0)) }
            .filterIsInstance<GameEvent.SaleCommitted>().single()
        assertEquals(1150, scarceSale.priceMultPermille)
        assertEquals(5L, scarceSale.coins)

        sim.state.customers.clear()
        counter.stock.restore(emptyMap(), emptyMap())
        sim.padNeutralScarcity()
        counter.stock.add(portion, 1)
        sim.padNeutralScarcity()
        sim.state.bumpStat(Stats.REVENUE, 3000)
        assertEquals(1100, CS.ratingPriceMultPermille(sim.content, sim.state))
        sim.state.tick = lunch.startTick.toLong()
        assertEquals(lunch.priceMultPermille, CS.rushPriceMultPermille(sim.harbor, sim.state.tick))
        val demand = CS.demandPriceMultPermille(sim.content, sim.state, sim.harbor, def, counter)
        assertEquals(1265, demand)

        sim.state.customers += com.willio.jeanvilma.fishshopping.core.sim.CustomerState(
            "customer.test_demand", type.id, counter.counterId, wants = 1, patienceLeft = 9_999, walkTicksTotal = 0,
        )
        val sale = (1..80).flatMap { pilot.tick(Command.Move(0, 0)) }
            .filterIsInstance<GameEvent.SaleCommitted>().single()
        assertEquals(1265, sale.priceMultPermille)
        assertEquals(6L, sale.coins)
    }

    @Test
    fun unmetPreferenceDrainsPatienceFasterWhilePreferredIsOut() {
        val sim = newSim()
        val counter = sim.primaryCounter()
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
        val counter = harbor.counters.first { it.requiresUpgrade == null }
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
        sim.primaryCounter().stock.add(portion, 10)
        pilot.walkTo(3000, 2750)
        val events = (1..1200).flatMap { pilot.tick(Command.Move(0, 0)) }
        val sales = events.filterIsInstance<GameEvent.SaleCommitted>()
        assertTrue(sales.isNotEmpty())
        assertEquals(sales.size, sales.map { it.saleId }.toSet().size)
        assertEquals(sales.sumOf { it.coins }, sim.state.coins)
        assertEquals(sales.sumOf { it.quantity }, 10 - sim.primaryCounter().stock.quantity(portion))
    }

    @Test
    fun customersWalkInBeforeTheyCanBeServed() {
        val sim = newSim()
        val pilot = Autopilot(sim)
        sim.primaryCounter().stock.add(portion, 10)
        pilot.walkTo(3000, 2750) // stand at the counter the whole time
        val events = (1..400).flatMap { pilot.tick(Command.Move(0, 0)) }
        val arrived = events.filterIsInstance<GameEvent.CustomerArrived>().first()
        val walk = sim.content.harborsById.getValue(HARBOR).let { h ->
            val path = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.approachPath(
                h, h.counters.first { it.requiresUpgrade == null }.queueSlot(0),
            )
            com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.pathWalkTicks(
                path, h.customerWalkMmPerTick,
            )
        }
        val firstSale = events.filterIsInstance<GameEvent.SaleCommitted>().first()
        val checkout = sim.content.harborsById.getValue(HARBOR).counters.first { it.requiresUpgrade == null }.checkoutTicks
        // Walk to slot 0, then the checkout timer: never earlier.
        assertEquals(arrived.tick + walk + checkout - 1, firstSale.tick)
    }

    @Test
    fun customerApproachFollowsWaypointsAroundObstacles() {
        val sim = newSim()
        val h = sim.harbor
        assertTrue(h.customerPathWaypoints.isNotEmpty())
        val slot = h.counters.first { it.requiresUpgrade == null }.queueSlot(0)
        val path = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.approachPath(h, slot)
        val routed = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.pathWalkTicks(
            path, h.customerWalkMmPerTick,
        )
        val straight = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.walkTicks(
            h.customerEntry, slot, h.customerWalkMmPerTick,
        )
        assertTrue("routed walk should be longer than a straight cut", routed > straight)

        sim.primaryCounter().stock.add(portion, 1)
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
        sim.primaryCounter().stock.add(portion, 5)
        sim.run(160) // first spawn on tick 160
        val c = sim.state.customers.single()
        assertTrue(c.walkTicksLeft > 0)
        val patience = c.patienceLeft
        sim.run(c.walkTicksLeft - 1)
        assertEquals(patience, c.patienceLeft)
        assertEquals(0, sim.primaryCounter().stock.reservedQuantity(portion))
        sim.run(2)
        assertTrue(c.arrived)
        assertTrue(sim.primaryCounter().stock.reservedQuantity(portion) > 0)
        val v = sim.view().customers.single()
        assertTrue(v.arrived)
        assertEquals(sim.harbor.counters.first { it.requiresUpgrade == null }.queueAnchor.x.toFloat(), v.xMm)
    }

    @Test
    fun schemaOneSaveMigratesWithCustomersAlreadyQueued() {
        val v1 = Shared.text("fixtures/legacy/snapshot-v1-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v1)
        assertEquals(2500L, s.tick)
        assertTrue(s.customers.isNotEmpty())
        assertTrue(s.customers.all { it.arrived && it.walkTicksTotal == 0 })
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
        val sim = Simulation(Shared.content, SnapshotCodec.decode(Shared.content, reencoded))
        repeat(200) { sim.checkedStep() }
    }

    @Test
    fun productLadderProducesFilletAndPremiumAndSellsMixedStock() {
        val sim = newSim()
        val m = cutter(sim)
        val counter = sim.primaryCounter()
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
        assertEquals(5, sim.state.machines.size)
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
        assertEquals("1.0.0", c.contentVersion)
        assertTrue(c.machinesById.containsKey("machine.harbor_grill"))
        val effect = c.upgradesById.getValue("upgrade.harbor_grill").effect
        assertTrue(effect is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine)
        assertEquals(
            "machine.harbor_grill",
            (effect as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        for (harborId in listOf(
            "harbor.sunrise_pier", "harbor.moon_cove", "harbor.obsidian_jetty",
            "harbor.northlight_harbor", "harbor.grand_marina",
        )) {
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
        val offPlot = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.harbor_grill", "grill-off")))
        assertTrue(offPlot.filterIsInstance<GameEvent.PurchaseRejected>().any { it.reason.contains("expansion marker") })
        walkToPlot(pilot, sim, "plot.sunrise_grill")
        val bought = sim.checkedStep(listOf(Command.BuildPlot("plot.sunrise_grill", "grill-1")))
        assertTrue(bought.filterIsInstance<GameEvent.PlotBuilt>().any { !it.replayed })
        assertTrue(bought.filterIsInstance<GameEvent.UpgradePurchased>().any { !it.replayed })
        pilot.walkTo(10700, -4000)
        assertEquals("zone.grill_in", sim.state.player.zoneId)
        repeat(30) { sim.checkedStep() }
        assertEquals(0, sim.state.player.bag.quantity("species.copper_mullet"))
        grill.preferredRecipeId = "recipe.grill_mullet"
        repeat(150) { sim.checkedStep() }
        assertEquals(2, grill.output.quantity("product.grilled_fillet"))
    }

    @Test
    fun harborFryerUnlocksPrepLineOnAllHarbors() {
        val c = Shared.content
        assertEquals("1.0.0", c.contentVersion)
        assertTrue(c.machinesById.containsKey("machine.harbor_fryer"))
        val effect = c.upgradesById.getValue("upgrade.harbor_fryer").effect
        assertTrue(effect is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine)
        assertEquals(
            "machine.harbor_fryer",
            (effect as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        assertEquals(listOf("quest.specialty_kitchen"), c.upgradesById.getValue("upgrade.harbor_fryer").requires)
        for (harborId in listOf(
            "harbor.sunrise_pier", "harbor.moon_cove", "harbor.obsidian_jetty",
            "harbor.northlight_harbor", "harbor.grand_marina",
        )) {
            val fryer = c.harborsById.getValue(harborId).stations.first { it.machine == "machine.harbor_fryer" }
            assertEquals("upgrade.harbor_fryer", fryer.requiresUpgrade)
        }
        assertTrue(c.productsById.containsKey("product.fried_portion"))
        assertTrue(c.productsById.containsKey("product.fish_and_chips"))
        assertTrue(c.productsById.containsKey("product.crispy_skewer"))

        val sim = newSim()
        val fryer = sim.state.machines.first { it.stationId == "station.fryer_1" }
        sim.checkedStep()
        assertEquals(MachineStatus.LOCKED, fryer.status)
        val pilot = Autopilot(sim)
        pilot.walkTo(10700, -1000)
        assertEquals("zone.fryer_in", sim.state.player.zoneId)
        sim.state.player.bag.add("species.silver_sprat", 1)
        repeat(20) { sim.checkedStep() }
        assertTrue(fryer.input.isEmpty())
        assertEquals(1, sim.state.player.bag.quantity("species.silver_sprat"))

        walkToPlot(pilot, sim, "plot.sunrise_fryer")
        val rejected = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.harbor_fryer", "fry-locked")))
        assertTrue(rejected.filterIsInstance<GameEvent.PurchaseRejected>().any { it.reason.contains("Specialty kitchen") })

        sim.state.completedQuests += "quest.specialty_kitchen"
        sim.state.coins = 200
        val bought = sim.checkedStep(listOf(Command.BuildPlot("plot.sunrise_fryer", "fry-1")))
        assertTrue(bought.filterIsInstance<GameEvent.PlotBuilt>().any { !it.replayed })
        pilot.walkTo(10700, -1000)
        assertEquals("zone.fryer_in", sim.state.player.zoneId)
        repeat(30) { sim.checkedStep() }
        assertEquals(0, sim.state.player.bag.quantity("species.silver_sprat"))
        fryer.preferredRecipeId = "recipe.fry_sprat"
        repeat(100) { sim.checkedStep() }
        assertEquals(2, fryer.output.quantity("product.fried_portion"))
    }

    @Test
    fun harborPackerUnlocksCartonLineForWholesale() {
        val c = Shared.content
        assertEquals("1.0.0", c.contentVersion)
        assertEquals(6, c.machines.size)
        assertTrue(c.machinesById.containsKey("machine.harbor_packer"))
        val effect = c.upgradesById.getValue("upgrade.harbor_packer").effect
        assertTrue(effect is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine)
        assertEquals(
            "machine.harbor_packer",
            (effect as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        assertEquals(
            listOf("upgrade.wholesale_pad", "quest.specialty_kitchen"),
            c.upgradesById.getValue("upgrade.harbor_packer").requires,
        )
        for (harborId in listOf(
            "harbor.sunrise_pier", "harbor.moon_cove", "harbor.obsidian_jetty",
            "harbor.northlight_harbor", "harbor.grand_marina",
        )) {
            val packer = c.harborsById.getValue(harborId).stations.first { it.machine == "machine.harbor_packer" }
            assertEquals("upgrade.harbor_packer", packer.requiresUpgrade)
            val wholesale = c.harborsById.getValue(harborId).counters.first { it.kind.wire == "wholesale" }
            assertTrue(wholesale.products.containsAll(listOf(
                "product.fried_carton", "product.chips_carton",
                "product.grill_carton", "product.skewer_carton",
            )))
        }

        val sim = newSim()
        val packer = sim.state.machines.first { it.stationId == "station.packer_1" }
        sim.checkedStep()
        assertEquals(MachineStatus.LOCKED, packer.status)
        val pilot = Autopilot(sim)
        pilot.walkTo(10700, 2500)
        assertEquals("zone.packer_in", sim.state.player.zoneId)

        sim.state.completedQuests += "quest.specialty_kitchen"
        sim.state.coins = 250
        walkToPlot(pilot, sim, "plot.sunrise_packer")
        val needPad = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.harbor_packer", "pack-locked")))
        assertTrue(needPad.filterIsInstance<GameEvent.PurchaseRejected>().any { it.reason.contains("Wholesale pad") })

        sim.state.completedQuests += "quest.first_ten_sales"
        walkToPlot(pilot, sim, "plot.sunrise_wholesale")
        sim.checkedStep(listOf(Command.BuildPlot("plot.sunrise_wholesale", "pad-1")))
        sim.state.coins = 250
        walkToPlot(pilot, sim, "plot.sunrise_packer")
        val bought = sim.checkedStep(listOf(Command.BuildPlot("plot.sunrise_packer", "pack-1")))
        assertTrue(bought.filterIsInstance<GameEvent.PlotBuilt>().any { !it.replayed })

        pilot.walkTo(10700, 2500)
        assertEquals("zone.packer_in", sim.state.player.zoneId)
        sim.state.player.bag.add("product.fried_portion", 4)
        repeat(40) { sim.checkedStep() }
        assertEquals(0, sim.state.player.bag.quantity("product.fried_portion"))
        packer.preferredRecipeId = "recipe.pack_fried_carton"
        repeat(160) { sim.checkedStep() }
        assertEquals(1, packer.output.quantity("product.fried_carton"))
    }

    @Test
    fun harborChillerUnlocksColdStorageOnAdvancedHarbors() {
        val c = Shared.content
        assertEquals("1.0.0", c.contentVersion)
        assertTrue(c.machinesById.containsKey("machine.harbor_chiller"))
        val effect = c.upgradesById.getValue("upgrade.harbor_chiller").effect
        assertTrue(effect is com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine)
        assertEquals(
            "machine.harbor_chiller",
            (effect as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        assertEquals(listOf("quest.obsidian_landing"), c.upgradesById.getValue("upgrade.harbor_chiller").requires)
        for (harborId in listOf("harbor.sunrise_pier", "harbor.moon_cove")) {
            assertTrue(c.harborsById.getValue(harborId).stations.none { it.machine == "machine.harbor_chiller" })
        }
        for (harborId in listOf("harbor.obsidian_jetty", "harbor.northlight_harbor", "harbor.grand_marina")) {
            val chiller = c.harborsById.getValue(harborId).stations.first { it.machine == "machine.harbor_chiller" }
            assertEquals("upgrade.harbor_chiller", chiller.requiresUpgrade)
        }
        assertTrue(c.productsById.containsKey("product.chilled_fillet"))
        assertTrue(c.productsById.containsKey("product.chilled_premium"))
        assertTrue(c.productsById.containsKey("product.chilled_crate"))

        val sim = newSim()
        sim.state.completedQuests += "quest.busy_harbor"
        sim.state.completedQuests += "quest.moon_crossing"
        sim.state.completedPrestige += "prestige.twin_harbors"
        val traveled = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.obsidian_jetty", "chill-travel")))
        assertTrue(traveled.filterIsInstance<GameEvent.HarborTraveled>().any { it.toHarborId == "harbor.obsidian_jetty" })
        val chiller = sim.state.machines.first { it.stationId == "station.jetty_chiller" }
        sim.checkedStep()
        assertEquals(MachineStatus.LOCKED, chiller.status)

        val pilot = Autopilot(sim)
        pilot.walkTo(-2200, -16700)
        assertEquals("zone.jetty_chiller_in", sim.state.player.zoneId)
        sim.state.player.bag.add("product.fillet", 1)
        repeat(20) { sim.checkedStep() }
        assertTrue(chiller.input.isEmpty())
        assertEquals(1, sim.state.player.bag.quantity("product.fillet"))

        walkToPlot(pilot, sim, "plot.jetty_chiller")
        val rejected = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.harbor_chiller", "chill-locked")))
        assertTrue(rejected.filterIsInstance<GameEvent.PurchaseRejected>().any { it.reason.contains("Obsidian landing") })

        sim.state.completedQuests += "quest.obsidian_landing"
        sim.state.coins = 250
        val bought = sim.checkedStep(listOf(Command.BuildPlot("plot.jetty_chiller", "chill-1")))
        assertTrue(bought.filterIsInstance<GameEvent.PlotBuilt>().any { !it.replayed })
        pilot.walkTo(-2200, -16700)
        assertEquals("zone.jetty_chiller_in", sim.state.player.zoneId)
        repeat(30) { sim.checkedStep() }
        assertEquals(0, sim.state.player.bag.quantity("product.fillet"))
        chiller.preferredRecipeId = "recipe.chill_fillet"
        repeat(120) { sim.checkedStep() }
        assertEquals(1, chiller.output.quantity("product.chilled_fillet"))
    }

    @Test
    fun productRecipeTreeSupportsMultiInputAndIntermediateCrafts() {
        val c = Shared.content
        assertEquals("1.0.0", c.contentVersion)
        val productIds = c.products.map { it.id }.toSet()
        assertTrue(productIds.containsAll(listOf(
            "product.diced_fish", "product.skewer", "product.soup_stock",
            "product.ice_packed_crate", "product.fillet_crate",
            "product.chilled_fillet", "product.chilled_premium", "product.chilled_crate",
            "product.fried_portion", "product.fish_and_chips", "product.crispy_skewer",
            "product.fried_carton", "product.chips_carton", "product.grill_carton", "product.skewer_carton",
        )))
        c.harbors.forEach { harbor ->
            val retail = harbor.counters.first { it.requiresUpgrade == null }
            assertTrue(retail.products.containsAll(listOf(
                "product.skewer", "product.soup_stock", "product.diced_fish",
                "product.fried_portion", "product.fish_and_chips", "product.crispy_skewer",
            )))
            val wholesale = harbor.counters.first { it.kind.wire == "wholesale" }
            assertTrue(wholesale.products.containsAll(listOf(
                "product.ice_packed_crate", "product.fillet_crate",
                "product.fried_carton", "product.chips_carton",
                "product.grill_carton", "product.skewer_carton",
            )))
            assertEquals("upgrade.wholesale_pad", wholesale.requiresUpgrade)
            if (harbor.id in setOf("harbor.obsidian_jetty", "harbor.northlight_harbor", "harbor.grand_marina")) {
                assertTrue(retail.products.containsAll(listOf(
                    "product.chilled_fillet", "product.chilled_premium",
                )))
                assertTrue(wholesale.products.contains("product.chilled_crate"))
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
    fun goodReelFinishesCastEarlyAndPaysHalfTip() {
        val sim = newSim(seed = 99)
        val pilot = Autopilot(sim)
        pilot.walkTo(-14250, 0)
        // Enter Good window (650) but stay before Perfect (720).
        repeat(5) { pilot.tick(Command.Move(0, 0)) }
        assertNotNull(sim.state.player.fishingSpecies)
        while (sim.view().fishingTimingTier != "good") {
            pilot.tick(Command.Move(0, 0))
            assertTrue(sim.state.player.fishingSpecies != null)
        }
        assertEquals("good", sim.view().fishingTimingTier)
        assertTrue(sim.view().fishingCanReel)
        val beforeCoins = sim.state.coins
        val events = pilot.tick(Command.Move(0, 0), listOf(Command.Reel))
        val caught = events.filterIsInstance<GameEvent.FishCaught>().single()
        assertTrue(caught.timingBonus)
        assertEquals(com.willio.jeanvilma.fishshopping.core.sim.TimingTier.GOOD, caught.timingTier)
        assertTrue(sim.state.stat(Stats.TIMING_BONUSES) >= 1)
        assertTrue(sim.state.stat(Stats.GOOD_REELS) >= 1)
        assertTrue(sim.state.coins > beforeCoins)
        assertNull(sim.state.player.fishingSpecies)
    }

    @Test
    fun perfectReelPaysFullTipAndTimingWindowUpgradeWidens() {
        val sim = newSim(seed = 99)
        val pilot = Autopilot(sim)
        pilot.walkTo(-14250, 0)
        repeat(5) { pilot.tick(Command.Move(0, 0)) }
        while (sim.view().fishingTimingTier != "perfect") {
            pilot.tick(Command.Move(0, 0))
            assertTrue(sim.state.player.fishingSpecies != null)
        }
        assertEquals("perfect", sim.view().fishingTimingTier)
        val beforeCoins = sim.state.coins
        val events = pilot.tick(Command.Move(0, 0), listOf(Command.Reel))
        val caught = events.filterIsInstance<GameEvent.FishCaught>().single()
        assertEquals(com.willio.jeanvilma.fishshopping.core.sim.TimingTier.PERFECT, caught.timingTier)
        assertTrue(sim.state.stat(Stats.PERFECT_REELS) >= 1)
        assertTrue(sim.state.coins > beforeCoins)

        val baseStart = sim.content.player.timingWindowStartPermille
        sim.state.coins = 10_000
        sim.state.ownedUpgrades += "upgrade.rod_speed_2"
        val buy = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.timing_sights", "req-sights")))
        assertTrue(buy.any { it is GameEvent.UpgradePurchased && it.upgradeId == "upgrade.timing_sights" })
        assertTrue(sim.state.player.timingWindowStartPermille < baseStart)
        assertTrue(sim.state.player.timingWindowEndPermille > sim.content.player.timingWindowEndPermille)
    }

    @Test
    fun emptySpotRegenUsesSlowerCurveThanNearFull() {
        val sim = newSim()
        val def = sim.content.harborsById.getValue(HARBOR).fishingSpots.first { it.zone == "zone.pier_end" }
        val FS = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
        val empty = FS.regenTicksFor(sim.content, sim.state, def, stock = 0)
        val nearlyFull = FS.regenTicksFor(sim.content, sim.state, def, stock = def.stockMax - 1)
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
        val FS = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
        val base = FS.regenTicksFor(sim.content, sim.state, def, 0)
        sim.state.player.fishRegenPermille = 1250
        val boosted = FS.regenTicksFor(sim.content, sim.state, def, 0)
        assertTrue(boosted < base)
        val spot = sim.state.fishingSpots.first { it.zoneId == "zone.pier_end" }
        spot.stock = 0
        spot.regenProgress = 0
        repeat(boosted - 1) { sim.checkedStep() }
        assertEquals(0, spot.stock)
        sim.checkedStep()
        assertEquals(1, spot.stock)
    }

    @Test
    fun dayPartEcologySlowsNightRegenAndTideChartEasesIt() {
        val sim = newSim()
        val def = sim.content.harborsById.getValue(HARBOR).fishingSpots.first { it.zone == "zone.pier_end" }
        val FS = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
        val dayLen = sim.content.ecology.dayLengthTicks.toLong()
        // Dawn phase (tick 0) vs night (last quarter of the day cycle).
        sim.state.tick = 0
        val dawn = FS.regenTicksFor(sim.content, sim.state, def, 0)
        sim.state.tick = (dayLen * 850L) / 1000L
        val night = FS.regenTicksFor(sim.content, sim.state, def, 0)
        assertTrue("dawn=$dawn night=$night", night > dawn)
        assertEquals("night", FS.dayPartAt(sim.content, sim.state.tick).id)

        sim.state.ownedUpgrades += "upgrade.tide_chart"
        sim.state.player.fishRegenPermille = 1250
        val nightWithChart = FS.regenTicksFor(sim.content, sim.state, def, 0)
        assertTrue("night=$night chart=$nightWithChart", nightWithChart < night)
        assertTrue(FS.hasTideChart(sim.state))
        assertTrue(sim.view().tideChartOwned)
    }

    @Test
    fun tideChartBoostsDawnCatchSpeed() {
        val sim = newSim()
        val FS = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
        sim.state.tick = 0
        sim.state.player.catchSpeedPermille = 1000
        assertEquals(1000, FS.effectiveCatchSpeed(sim.content, sim.state))
        sim.state.ownedUpgrades += "upgrade.tide_chart"
        sim.state.player.fishRegenPermille = 1250
        // Dawn catchSpeedMultPermille is 1100 → 1100 with chart.
        assertEquals(1100, FS.effectiveCatchSpeed(sim.content, sim.state))
        assertEquals("dawn", sim.view().dayPartId)
    }

    @Test
    fun baitKioskSellsPacksAndPreferredBaitIsSnapshotted() {
        val sim = newSim()
        val bait = sim.content.baitById.getValue("bait.shrimp_nibble")
        sim.state.coins = 100
        val coinsBefore = sim.state.coins
        val rejected = sim.checkedStep(listOf(Command.BuyBait(bait.id, "bait-away")))
        assertTrue(rejected.any { it is GameEvent.BaitPurchaseRejected })

        Autopilot(sim).walkTo(-7000, -2000)
        assertEquals("zone.bait_kiosk", sim.state.player.zoneId)
        val offers = sim.view().baitOffers
        assertEquals(sim.content.bait.size, offers.size)
        assertTrue(offers.first { it.id == bait.id }.purchasable)

        val bought = sim.checkedStep(listOf(Command.BuyBait(bait.id, "bait-1")))
        assertTrue(bought.any { it is GameEvent.BaitPurchased && it.quantity == bait.packQuantity })
        assertEquals(coinsBefore - bait.cost, sim.state.coins)
        assertEquals(bait.packQuantity, sim.state.player.bag.quantity(bait.id))
        assertEquals(bait.id, sim.state.player.preferredBaitId)
        assertEquals(bait.packQuantity.toLong(), sim.state.stat(Stats.BAIT_BOUGHT))

        val replay = sim.checkedStep(listOf(Command.BuyBait(bait.id, "bait-1")))
        assertTrue(replay.any { it is GameEvent.BaitPurchased && it.replayed })
        assertEquals(bait.packQuantity, sim.state.player.bag.quantity(bait.id))

        sim.checkedStep(listOf(Command.SelectBait(null)))
        assertNull(sim.state.player.preferredBaitId)
        sim.checkedStep(listOf(Command.SelectBait(bait.id)))
        assertEquals(bait.id, sim.state.player.preferredBaitId)

        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.contains("\"preferredBaitId\":\"bait.shrimp_nibble\""))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(bait.id, restored.player.preferredBaitId)
        assertEquals(bait.packQuantity, restored.player.bag.quantity(bait.id))
    }

    @Test
    fun trophyBoardRecordsPersonalBestsAndCompletesMuseumSets() {
        val sim = newSim(7)
        assertTrue(sim.content.trophies.sets.size >= 3)
        Autopilot(sim).walkTo(-14250, 0)
        var i = 0
        while (i < 800 && sim.state.stat(Stats.FISH_CAUGHT) < 1) {
            sim.checkedStep(); i++
        }
        assertTrue(sim.state.stat(Stats.FISH_CAUGHT) >= 1)
        assertTrue(sim.state.trophies.isNotEmpty())
        assertTrue(sim.state.stat(Stats.TROPHY_SPECIES) >= 1)
        assertTrue(sim.state.stat(Stats.TROPHY_RECORDS) >= 1)
        val view = sim.view()
        assertEquals(sim.state.trophies.size, view.trophies.size)
        assertEquals(sim.content.trophies.sets.size, view.trophySets.size)

        val moon = sim.content.trophySetsById.getValue("gallery.moon_cove")
        for (id in moon.species) {
            sim.state.trophies[id] = com.willio.jeanvilma.fishshopping.core.sim.TrophyRecord(
                sizePermille = 1000, valueCoins = 5, tick = sim.state.tick,
            )
        }
        com.willio.jeanvilma.fishshopping.core.fishing.TrophySystem.rebuildSetStats(sim.content, sim.state)
        assertEquals(1L, sim.state.stat("stat.trophy_set_moon_cove"))
        assertTrue(sim.view().trophySets.first { it.id == "gallery.moon_cove" }.completed)

        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(sim.state.trophies.size, restored.trophies.size)
        assertEquals(1L, restored.stat("stat.trophy_set_moon_cove"))
    }

    @Test
    fun baitPouchGrantAndCatchConsumesBaitWithRareModifiers() {
        val sim = newSim()
        val shrimp = sim.content.baitById.getValue("bait.shrimp_nibble")
        val BS = com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem
        val rareCapable = sim.content.species.first { it.rareUpgrade != null }
        assertEquals(
            ((rareCapable.rarityWeight.toLong() * shrimp.rareSpeciesWeightMultPermille) / 1000L).toInt().coerceAtLeast(1),
            BS.effectiveWeight(rareCapable, shrimp),
        )
        assertEquals(140, BS.rareChancePermille(100, shrimp))

        sim.state.coins = 10_000
        sim.state.ownedUpgrades += "upgrade.bag_capacity_2"
        sim.state.player.bag.capacityUnits = 12
        val grant = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.bait_pouch", "pouch-1")))
        assertTrue(grant.any { it is GameEvent.UpgradePurchased })
        assertTrue(sim.state.player.bag.quantity(shrimp.id) > 0)
        assertEquals(shrimp.id, sim.state.player.preferredBaitId)

        val before = sim.state.player.bag.quantity(shrimp.id)
        Autopilot(sim).walkTo(-14250, 0)
        var i = 0
        while (i < 800 && sim.state.stat(Stats.FISH_CAUGHT) < 1) {
            sim.checkedStep(); i++
        }
        assertTrue(sim.state.stat(Stats.FISH_CAUGHT) >= 1)
        assertTrue(sim.state.stat(Stats.BAIT_USED) >= 1)
        assertEquals(before - 1, sim.state.player.bag.quantity(shrimp.id))
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
        sim.state.completedQuests += "quest.specialty_kitchen"
        val buy = sim.checkedStep(
            listOf(
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
        assertEquals("1.0.0", Shared.content.contentVersion)
        assertTrue(sim.view().staff.any { it.roleId == "worker.fisher" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.operator" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.cashier" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.supervisor" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.ice_runner" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.smoker_specialist" })
        assertTrue(sim.view().staff.any { it.roleId == "worker.greeter" })
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
        assertTrue(sim.state.workers.all { it.level == 1 && it.xp == 0 && it.traits.isNotEmpty() && it.onShift })
        assertTrue(sim.view().workers.all { it.traitNames.isNotEmpty() && it.level == 1 && it.onShift })
        assertTrue(sim.view().staff.none { it.reason == "Coming soon" })
        assertTrue(sim.view().staff.filter { it.roleId == "worker.operator" || it.roleId == "worker.cashier" }
            .all { it.purchasable || it.reason?.startsWith("Need") == true })
        assertTrue(sim.view().staff.first { it.roleId == "worker.supervisor" }.reason!!.startsWith("Requires:"))
        assertTrue(sim.view().staff.first { it.roleId == "worker.ice_runner" }.reason!!.startsWith("Requires:"))
        // First hire completes quest.first_hire, which unlocks the greeter.
        assertTrue(sim.view().staff.first { it.roleId == "worker.greeter" }.purchasable)
        assertTrue(sim.view().staff.first { it.roleId == "worker.smoker_specialist" }.reason!!.startsWith("Requires:"))
    }

    @Test
    fun specializedRolesHireAndApplyBuffs() {
        val sim = newSim()
        assertEquals("1.0.0", Shared.content.contentVersion)
        unlockStaffHiring(sim)
        sim.state.completedQuests += "quest.first_hire"
        sim.state.completedQuests += "quest.specialty_kitchen"
        sim.state.ownedUpgrades += "upgrade.staff_boots"
        sim.state.ownedUpgrades += "upgrade.harbor_grill"
        sim.state.coins = 800
        sim.checkedStep(listOf(Command.HireWorker("worker.ice_runner", "hire-ice")))
        sim.checkedStep(listOf(Command.HireWorker("worker.greeter", "hire-greet")))
        sim.checkedStep(listOf(Command.HireWorker("worker.smoker_specialist", "hire-smoke")))
        assertEquals(3, sim.state.workers.size)
        assertTrue(sim.view().workers.any { it.roleKind == "ice_runner" })
        assertTrue(sim.view().workers.any { it.roleKind == "greeter" })
        assertTrue(sim.view().workers.any { it.roleKind == "smoker_specialist" })
        // Greeter walks to entry then posts; smoker specialist posts at smoker.
        repeat(2_000) { sim.checkedStep() }
        assertTrue(com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem.greeterOnDuty(sim.content, sim.state))
        assertTrue(
            com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem
                .smokerSpecialistOnDuty(sim.content, sim.state, sim.harbor),
        )
        val type = sim.content.customers.first()
        val counter = sim.primaryCounter()
        val cdef = sim.harbor.counters.first { it.id == counter.counterId }
        val customer = CustomerState(
            "cust.test", type.id, counter.counterId, wants = 2, patienceLeft = 100, walkTicksTotal = 0,
            preferredProductId = cdef.products.first(),
        )
        customer.walkTicksLeft = 0
        sim.state.customers += customer
        val before = customer.patienceLeft
        sim.checkedStep()
        val drained = before - customer.patienceLeft
        assertTrue("greeter should slow patience drain", drained <= 1)
        val smoker = smoker(sim)
        val recipe = sim.content.recipesById.getValue(
            sim.content.machinesById.getValue(smoker.machineId).recipes.first(),
        )
        val base = com.willio.jeanvilma.fishshopping.core.production.ProductionSystem.durationFor(smoker, recipe)
        val boosted = com.willio.jeanvilma.fishshopping.core.production.ProductionSystem.durationFor(
            com.willio.jeanvilma.fishshopping.core.sim.StepContext(sim.content, sim.state),
            smoker,
            recipe,
        )
        assertTrue(boosted < base)
    }

    @Test
    fun workerGainsXpLevelsAndPersistsTraits() {
        val sim = newSim()
        assertEquals("1.0.0", Shared.content.contentVersion)
        unlockStaffHiring(sim)
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.HireWorker("worker.fisher", "hf-xp")))
        val fisher = sim.state.workers.single()
        val traits = fisher.traits.toList()
        assertTrue(traits.isNotEmpty())
        assertTrue(traits.all { it in Shared.content.workerTraitsById })
        val events = (1..8_000).flatMap { sim.checkedStep() }
        assertTrue(events.filterIsInstance<GameEvent.FishCaught>().isNotEmpty())
        assertTrue(sim.state.stat(Stats.WORKER_XP) > 0)
        assertTrue(fisher.xp > 0)
        if (fisher.level > 1) {
            assertTrue(events.filterIsInstance<GameEvent.WorkerLeveledUp>().isNotEmpty())
            assertTrue(sim.state.stat(Stats.WORKER_LEVEL_UPS) > 0)
        }
        val view = sim.view().workers.single()
        assertEquals(fisher.level, view.level)
        assertEquals(fisher.xp, view.xp)
        assertEquals(traits.map { Shared.content.workerTraitsById.getValue(it).name }, view.traitNames)
        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        val loaded = SnapshotCodec.decode(sim.content, saved)
        val w = loaded.workers.single()
        assertEquals(fisher.xp, w.xp)
        assertEquals(fisher.level, w.level)
        assertEquals(traits, w.traits)
    }

    @Test
    fun schemaTwelveSaveMigratesWorkerProgressionDefaults() {
        val v12 = Shared.text("fixtures/legacy/snapshot-v12-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v12)
        assertEquals(2500L, s.tick)
        assertTrue(s.workers.all { it.xp == 0 && it.level == 1 && it.traits.isEmpty() && it.onShift })
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
        val again = SnapshotCodec.decode(Shared.content, reencoded)
        assertTrue(again.workers.all { it.xp == 0 && it.level == 1 && it.onShift })
    }

    @Test
    fun schemaThirteenSaveMigratesOnShiftDefault() {
        val v13 = Shared.text("fixtures/legacy/snapshot-v13-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v13)
        assertEquals(2500L, s.tick)
        assertTrue(s.workers.all { it.onShift })
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
    }

    @Test
    fun schemaFourteenSaveMigratesEquipmentDefaults() {
        val v14 = Shared.text("fixtures/legacy/snapshot-v14-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v14)
        assertEquals(2500L, s.tick)
        assertTrue(s.workers.all { it.onShift })
        // No staff gear owned in the frozen starter-line mid-save — equipment stays empty.
        assertTrue(s.workers.all { it.equipment.isEmpty() })
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
    }

    @Test
    fun schemaSixteenSaveMigratesWearDefaults() {
        val v16 = Shared.text("fixtures/legacy/snapshot-v16-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v16)
        assertEquals(2500L, s.tick)
        assertTrue(s.machines.all { !it.broken && it.slowUntilTick == 0L })
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
        assertTrue(reencoded.contains("\"broken\":false"))
        assertTrue(reencoded.contains("\"slowUntilTick\":0"))
    }

    @Test
    fun schemaSeventeenSaveMigratesBankDefaults() {
        val v17 = Shared.text("fixtures/legacy/snapshot-v17-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v17)
        assertEquals(2500L, s.tick)
        assertEquals(0L, s.loanOwed)
        assertEquals(0L, s.loanDueTick)
        assertEquals(0L, s.coinGoal)
        assertFalse(s.coinGoalCelebrated)
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
        assertTrue(reencoded.contains("\"loanOwed\":0"))
        assertTrue(reencoded.contains("\"coinGoal\":0"))
    }

    @Test
    fun schemaEighteenSaveMigratesSpeciesCatchDefaults() {
        val v18 = Shared.text("fixtures/legacy/snapshot-v18-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v18)
        assertEquals(2500L, s.tick)
        assertTrue(s.speciesCatches.isEmpty())
        s.recordSpeciesCatch("species.silver_sprat", 4)
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
        assertTrue(reencoded.contains("\"species.silver_sprat\":4"))
        val restored = SnapshotCodec.decode(Shared.content, reencoded)
        assertEquals(4L, restored.speciesCatches["species.silver_sprat"])
        val served = restored.stat(Stats.SALES)
        val lost = restored.stat(Stats.LOST_CUSTOMERS)
        assertEquals((lost * 1000L) / (served + lost), Telemetry.abandonPermille(restored))
    }

    @Test
    fun schemaFifteenSaveMigratesOwnedDecorDefault() {
        val v15 = Shared.text("fixtures/legacy/snapshot-v15-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v15)
        assertEquals(2500L, s.tick)
        assertTrue(s.ownedDecor.isEmpty())
        assertFalse(s.fullHarborUnlock)
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
    }

    @Test
    fun schemaNineteenSaveMigratesFullHarborUnlockDefault() {
        val v19 = Shared.text("fixtures/legacy/snapshot-v19-starter-line-t2500.json").trimEnd()
        val s = SnapshotCodec.decode(Shared.content, v19)
        assertEquals(2500L, s.tick)
        assertTrue(s.speciesCatches.isNotEmpty())
        assertFalse(s.fullHarborUnlock)
        val reencoded = SnapshotCodec.encode(Shared.content, s)
        assertTrue(reencoded.startsWith("{\"schemaVersion\":20,"))
        assertTrue(reencoded.contains("\"fullHarborUnlock\":false"))
        val restored = SnapshotCodec.decode(Shared.content, reencoded)
        assertFalse(restored.fullHarborUnlock)
        assertEquals(3L, restored.speciesCatches["species.silver_sprat"])
    }

    @Test
    fun workerShiftToggleAndOvertimeWages() {
        val sim = newSim()
        assertEquals("1.0.0", Shared.content.contentVersion)
        unlockStaffHiring(sim)
        sim.state.coins = 500
        sim.state.workerWagePerWorkerPerHour = 10
        sim.checkedStep(listOf(Command.HireWorker("worker.fisher", "hf1")))
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp1")))
        sim.checkedStep(listOf(Command.HireWorker("worker.operator", "ho1")))
        assertEquals(3, sim.state.workers.count { it.onShift })
        assertEquals(2, sim.view().freeOnShiftSlots)
        assertEquals(1, sim.view().overtimeOnShiftCount)
        val off = sim.state.workers.first { it.roleId == "worker.operator" }
        val events = sim.checkedStep(listOf(Command.SetWorkerShift(off.id, false)))
        assertTrue(events.filterIsInstance<GameEvent.WorkerShiftChanged>().any { !it.onShift })
        assertFalse(off.onShift)
        assertEquals(2, sim.view().onShiftCount)
        assertEquals(0, sim.view().overtimeOnShiftCount)
        // Force an hourly wage tick.
        sim.state.workerWageAccrualTicks = 3600 * 20 - 1
        val wageEvents = sim.checkedStep()
        assertTrue(wageEvents.filterIsInstance<GameEvent.WagesPaid>().isNotEmpty())
        assertEquals(0L, sim.state.stat(Stats.OVERTIME_WAGES))
        // Put third back on shift → overtime next hour.
        sim.checkedStep(listOf(Command.SetWorkerShift(off.id, true)))
        sim.state.workerWageAccrualTicks = 3600 * 20 - 1
        sim.state.coins = 500
        sim.checkedStep()
        assertTrue(sim.state.stat(Stats.OVERTIME_WAGES) > 0)
        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.contains("\"onShift\":false") || saved.contains("\"onShift\":true"))
        val loaded = SnapshotCodec.decode(sim.content, saved)
        assertEquals(sim.state.workers.map { it.onShift }, loaded.workers.map { it.onShift })
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
            it.to == sim.primaryCounter().stock.id
        })
        assertTrue(sim.primaryCounter().stock.quantity(portion) > 0)
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

        val counter = sim.primaryCounter()
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
        assertEquals(0, sim.primaryCounter().stock.quantity(fillet))
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
        val counter = sim.primaryCounter()
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
        val counter = sim.primaryCounter()
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
        // Phase 19: staff gear is pool-only until assigned; wages still apply globally.
        assertEquals(1000, sim.state.workerMoveSpeedPermille)
        assertEquals(0, sim.state.workerCarryCapacityFloor)
        assertEquals(0, sim.state.workerCatchSpeedPermille)
        assertEquals(3, sim.state.workerWagePerWorkerPerHour)
        assertEquals(3, sim.view().workerWagePerWorkerPerHour)
        assertEquals(3, sim.view().staffGear.size)
        assertTrue(sim.view().staffGear.all { it.equippedOnWorkerId == null })
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp-wage")))
        val porter = sim.state.workers.single()
        assertEquals(porter.bag.capacityUnits, Shared.content.workersById.getValue("worker.porter").carryCapacityUnits)
        sim.checkedStep(listOf(Command.AssignWorkerGear(porter.id, "upgrade.staff_satchels")))
        assertEquals(5, porter.bag.capacityUnits)
        assertEquals("upgrade.staff_satchels", porter.equipment["satchel"])
        assertTrue(sim.view().staffGear.first { it.upgradeId == "upgrade.staff_satchels" }.equippedOnWorkerId == porter.id)
        sim.state.workerWageAccrualTicks = 3600 * 20 - 1
        val coinsBefore = sim.state.coins
        val events = sim.checkedStep()
        assertTrue(events.filterIsInstance<GameEvent.WagesPaid>().any { it.workers == 1 && it.coins == 3L })
        assertEquals(coinsBefore - 3, sim.state.coins)
        assertEquals(3L, sim.state.stat(Stats.WAGES_PAID))
    }

    @Test
    fun staffGearAssignUnequipAndPersists() {
        val sim = newSim()
        assertEquals("1.0.0", Shared.content.contentVersion)
        unlockStaffHiring(sim)
        sim.state.coins = 10_000
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.staff_boots", "ub")))
        sim.checkedStep(listOf(Command.HireWorker("worker.fisher", "hf-gear")))
        sim.checkedStep(listOf(Command.HireWorker("worker.porter", "hp-gear")))
        val fisher = sim.state.workers.first { it.roleId == "worker.fisher" }
        val porter = sim.state.workers.first { it.roleId == "worker.porter" }
        val baseFisherSpeed = com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem.moveSpeed(
            sim.content, sim.state, sim.content.workersById.getValue(fisher.roleId), fisher,
        )
        val assigned = sim.checkedStep(listOf(Command.AssignWorkerGear(fisher.id, "upgrade.staff_boots")))
        assertTrue(assigned.filterIsInstance<GameEvent.WorkerGearAssigned>().any {
            it.workerId == fisher.id && it.upgradeId == "upgrade.staff_boots" && it.slotId == "boots"
        })
        val boosted = com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem.moveSpeed(
            sim.content, sim.state, sim.content.workersById.getValue(fisher.roleId), fisher,
        )
        assertTrue(boosted > baseFisherSpeed)
        // Reassign to porter (moves the single pair of boots).
        sim.checkedStep(listOf(Command.AssignWorkerGear(porter.id, "upgrade.staff_boots")))
        assertTrue("boots" !in fisher.equipment)
        assertEquals("upgrade.staff_boots", porter.equipment["boots"])
        sim.checkedStep(listOf(Command.UnequipWorkerGear(porter.id, "boots")))
        assertTrue(porter.equipment.isEmpty())
        assertTrue(sim.view().staffGear.single().equippedOnWorkerId == null)
        // Re-equip and persist through snapshot.
        sim.checkedStep(listOf(Command.AssignWorkerGear(fisher.id, "upgrade.staff_boots")))
        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        val loaded = SnapshotCodec.decode(sim.content, saved)
        assertEquals("upgrade.staff_boots", loaded.workers.first { it.id == fisher.id }.equipment["boots"])
    }

    @Test
    fun automationIssuesAndRushIdleAlert() {
        val sim = newSim()
        assertEquals("1.0.0", Shared.content.contentVersion)
        assertEquals(60, Shared.content.automationAlerts.machineIdleTicksDuringRush)
        // Force OUTPUT_FULL: ready inputs exist but output cannot fit the batch.
        val cutter = cutter(sim)
        cutter.output.add(portion, 19)
        cutter.input.add(sprat, 3)
        sim.checkedStep()
        assertEquals(MachineStatus.OUTPUT_FULL, cutter.status)
        assertTrue(sim.view().automationIssues.any { it.kind == "machine" && it.reason == "Output full" })

        val lunch = sim.harbor.rushesById.getValue("rush.lunch")
        sim.state.tick = lunch.startTick.toLong() - 1
        cutter.idleTicks = 0
        cutter.lastIdleAlertTick = 0
        // Enter rush, then idle through the threshold.
        sim.checkedStep()
        val threshold = Shared.content.automationAlerts.machineIdleTicksDuringRush
        val events = (1..threshold).flatMap { sim.checkedStep() }
        assertTrue(
            events.filterIsInstance<GameEvent.MachineIdleAlert>().any {
                it.stationId == cutter.stationId && it.reason == "Output full"
            },
        )
        // Cooldown suppresses immediate re-fire.
        cutter.idleTicks = threshold
        val quiet = sim.checkedStep()
        assertTrue(quiet.filterIsInstance<GameEvent.MachineIdleAlert>().isEmpty())
    }

    @Test
    fun questChainLocksRewardsAndShowsLog() {
        val sim = newSim()
        val log = sim.view().quests
        assertEquals(11, log.size)
        assertEquals("active", log.first { it.id == "quest.first_cast" }.status)
        assertTrue(log.filter { it.id != "quest.first_cast" }.all { it.status == "locked" })

        sim.state.bumpStat(Stats.FISH_CAUGHT, 5)
        val cast = sim.checkedStep().filterIsInstance<GameEvent.QuestCompleted>().single()
        assertEquals("quest.first_cast", cast.questId)
        assertEquals(20L, cast.coinsRewarded)
        assertEquals("active", sim.view().quests.first { it.id == "quest.line_running" }.status)

        sim.state.bumpStat(Stats.MACHINE_INPUTS, 8)
        sim.checkedStep()
        assertTrue("quest.line_running" in sim.state.completedQuests)
        assertEquals("active", sim.view().quests.first { it.id == "quest.first_ten_sales" }.status)

        sim.state.bumpStat(Stats.SALES, 10)
        val coinsBefore = sim.state.coins
        val salesDone = sim.checkedStep().filterIsInstance<GameEvent.QuestCompleted>().single()
        assertEquals("quest.first_ten_sales", salesDone.questId)
        assertEquals(50L, salesDone.coinsRewarded)
        assertEquals(coinsBefore + 50, sim.state.coins)
        assertEquals(3L, sim.state.stat(Stats.QUESTS_COMPLETED))

        val afterSales = sim.view().quests
        assertEquals("completed", afterSales.first { it.id == "quest.first_ten_sales" }.status)
        assertEquals("active", afterSales.first { it.id == "quest.fill_the_hold" }.status)
        assertEquals("active", afterSales.first { it.id == "quest.first_hire" }.status)
        assertEquals("locked", afterSales.first { it.id == "quest.specialty_kitchen" }.status)
        assertEquals("locked", afterSales.first { it.id == "quest.busy_harbor" }.status)

        sim.state.bumpStat(Stats.FISH_CAUGHT, 20) // total 25
        sim.state.bumpStat(Stats.WORKERS_HIRED, 1)
        sim.checkedStep()
        assertTrue("quest.fill_the_hold" in sim.state.completedQuests)
        assertTrue("quest.first_hire" in sim.state.completedQuests)
        assertTrue("upgrade.harbor_grill" in sim.state.ownedUpgrades)
        assertEquals("active", sim.view().quests.first { it.id == "quest.specialty_kitchen" }.status)
        assertEquals("locked", sim.view().quests.first { it.id == "quest.busy_harbor" }.status)

        sim.state.bumpStat(Stats.OUTPUTS_COLLECTED, 12)
        val specialty = sim.checkedStep().filterIsInstance<GameEvent.QuestCompleted>().single()
        assertEquals("quest.specialty_kitchen", specialty.questId)
        assertEquals(listOf("upgrade.side_pier"), specialty.unlockUpgrades)
        assertTrue("upgrade.side_pier" in sim.state.ownedUpgrades)
        assertEquals("active", sim.view().quests.first { it.id == "quest.busy_harbor" }.status)

        sim.state.bumpStat(Stats.REVENUE, 250)
        val busy = sim.checkedStep().filterIsInstance<GameEvent.QuestCompleted>().single()
        assertEquals("quest.busy_harbor", busy.questId)
        assertEquals(listOf("upgrade.tide_chart"), busy.unlockUpgrades)
        assertTrue("upgrade.tide_chart" in sim.state.ownedUpgrades)
        assertEquals(1250, sim.state.player.fishRegenPermille)
        assertEquals("completed", sim.view().quests.first { it.id == "quest.busy_harbor" }.status)
        assertEquals("active", sim.view().quests.first { it.id == "quest.moon_crossing" }.status)

        sim.state.bumpStat(Stats.HARBORS_TRAVELED, 1)
        val crossing = sim.checkedStep().filterIsInstance<GameEvent.QuestCompleted>().single()
        assertEquals("quest.moon_crossing", crossing.questId)
        assertEquals(100L, crossing.coinsRewarded)
        assertEquals("completed", sim.view().quests.first { it.id == "quest.moon_crossing" }.status)
        assertEquals("active", sim.view().quests.first { it.id == "quest.obsidian_landing" }.status)
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

        val offer = sim.state.contractOffers.firstOrNull { o ->
            sim.content.contractTemplatesById[o.templateId]?.isStanding != true
        } ?: sim.state.contractOffers.first()
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
        val payout = job.payout
        val delivered = sim.checkedStep(listOf(Command.DeliverContract(job.id, "del-1")))
        assertTrue(delivered.filterIsInstance<GameEvent.ContractCompleted>().any { it.payout == payout })
        assertEquals(coinsBefore + payout, sim.state.coins)
        assertEquals(1L, sim.state.stat(Stats.CONTRACTS_COMPLETED))
        assertTrue(sim.state.activeContracts.isEmpty())

        // Second job: miss the deadline and pay the penalty.
        val offer2 = sim.state.contractOffers.firstOrNull { o ->
            sim.content.contractTemplatesById[o.templateId]?.isStanding != true
        } ?: sim.state.contractOffers.first()
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
    fun standingOrdersRefreshEscalateAndCoolDownAfterFail() {
        val c = Shared.content
        assertEquals("1.0.0", c.contentVersion)
        val standing = c.contractTemplatesById.getValue("contract.portion_order")
        assertTrue(standing.isStanding)
        assertTrue(standing.payoutEscalatePermille >= 1000)

        val sim = newSim()
        val CS = com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
        sim.state.completedQuests += "quest.first_ten_sales"
        sim.checkedStep()
        sim.state.contractOffers.clear()
        sim.state.contractOffers += com.willio.jeanvilma.fishshopping.core.sim.ContractOffer(
            id = "offer.standing_test",
            templateId = standing.id,
            itemId = standing.item,
            quantity = standing.quantity,
            durationTicks = standing.durationTicks,
            payout = standing.payout,
            penalty = standing.penalty,
        )
        sim.checkedStep(listOf(Command.AcceptContract("offer.standing_test", "stand-acc")))
        val job = sim.state.activeContracts.single()
        assertTrue(sim.view().activeContracts.single().standing)
        assertEquals(0, sim.view().activeContracts.single().standingStreak)

        sim.state.player.bag.capacityUnits = 100
        sim.state.player.bag.add(standing.item, standing.quantity)
        val basePay = job.payout
        assertTrue(sim.checkedStep(listOf(Command.DeliverContract(job.id, "stand-del-1")))
            .filterIsInstance<GameEvent.ContractCompleted>().isNotEmpty())
        assertEquals(1, sim.state.activeContracts.size)
        assertEquals(0, job.delivered)
        assertEquals(1, CS.standingStreak(sim.state, standing.id))
        assertEquals(
            CS.scaleAmount(standing.payout, standing.payoutEscalatePermille, 1, standing.maxStreak),
            job.payout,
        )
        assertTrue(job.payout > basePay)
        assertEquals(1, sim.view().activeContracts.single().standingStreak)

        sim.state.player.bag.add(standing.item, standing.quantity)
        sim.checkedStep(listOf(Command.DeliverContract(job.id, "stand-del-2")))
        assertEquals(2, CS.standingStreak(sim.state, standing.id))
        assertEquals(2L, sim.state.stat(Stats.CONTRACTS_COMPLETED))

        job.deadlineTick = sim.state.tick
        sim.state.coins = 500
        assertTrue(sim.checkedStep().filterIsInstance<GameEvent.ContractFailed>().isNotEmpty())
        assertTrue(sim.state.activeContracts.isEmpty())
        assertEquals(0, CS.standingStreak(sim.state, standing.id))
        assertEquals(sim.state.tick + standing.failCooldownTicks.toLong(), CS.standingCooldownUntil(sim.state, standing.id))

        sim.state.contractOffers.clear()
        sim.state.contractBoardRefreshAt = sim.state.tick
        assertTrue(sim.checkedStep().filterIsInstance<GameEvent.ContractBoardRefreshed>().isNotEmpty())
        assertTrue(sim.state.contractOffers.none { it.templateId == standing.id })
    }

    @Test
    fun moonCoveUnlocksAfterBusyHarborAndTravelStashesWorld() {
        val sim = newSim()
        val map = sim.view().harbors
        assertEquals(5, map.size)
        assertEquals("harbor.sunrise_pier", map[0].harborId)
        assertTrue(map[0].current)
        assertTrue(map[0].unlocked)
        assertFalse(map[0].travelEnabled)
        assertEquals("harbor.moon_cove", map[1].harborId)
        assertFalse(map[1].unlocked)
        assertEquals("Requires: Busy harbor", map[1].reason)
        assertEquals("moon_cove_blockout.glb", map[1].blockoutAsset)
        assertEquals("harbor.obsidian_jetty", map[2].harborId)
        assertFalse(map[2].unlocked)
        assertEquals("Requires: Twin Harbors", map[2].reason)
        assertEquals("obsidian_jetty_blockout.glb", map[2].blockoutAsset)
        assertEquals("harbor.northlight_harbor", map[3].harborId)
        assertFalse(map[3].unlocked)
        assertEquals("Requires: Triple Harbors", map[3].reason)
        assertEquals("northlight_harbor_blockout.glb", map[3].blockoutAsset)
        assertEquals("harbor.grand_marina", map[4].harborId)
        assertFalse(map[4].unlocked)
        assertEquals("Requires: Quad Harbors", map[4].reason)
        assertEquals("grand_marina_blockout.glb", map[4].blockoutAsset)

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
        assertTrue(traveled.filterIsInstance<GameEvent.QuestCompleted>().any { it.questId == "quest.moon_crossing" })
        assertEquals("harbor.moon_cove", sim.state.harborId)
        assertEquals("Moon Cove", sim.view().harborName)
        assertEquals("moon_cove_blockout.glb", sim.view().blockoutAsset)
        assertEquals(877L, sim.state.coins) // +100 from moon_crossing
        assertEquals(2, sim.state.player.bag.quantity("species.silver_sprat"))
        assertEquals(sim.harbor.playerSpawn.x, sim.state.player.x)
        assertEquals(sim.harbor.playerSpawn.z, sim.state.player.z)
        assertTrue(sim.state.fishingSpots.any { it.zoneId == "zone.cove_end" })
        assertTrue(sim.state.harborStashes.containsKey(HARBOR))
        assertEquals(3, sim.state.harborStashes.getValue(HARBOR).fishingSpots.first { it.zoneId == "zone.pier_end" }.stock)
        assertEquals(1L, sim.state.stat(Stats.HARBORS_TRAVELED))
        assertTrue("quest.moon_crossing" in sim.state.completedQuests)

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
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(HARBOR, restored.harborId)
        assertTrue(restored.harborStashes.containsKey("harbor.moon_cove"))
        assertEquals(3, restored.fishingSpots.first { it.zoneId == "zone.pier_end" }.stock)
    }

    @Test
    fun obsidianJettyUnlocksAfterTwinHarborsPrestigeAndCompletesLandingQuest() {
        val jettyDef = Shared.content.harborsById.getValue("harbor.obsidian_jetty")
        assertEquals(listOf("rush.jetty_dawn", "rush.jetty_midnight"), jettyDef.rushes.map { it.id })

        val sim = newSim()
        fun jetty() = sim.view().harbors.first { it.harborId == "harbor.obsidian_jetty" }
        assertFalse(jetty().unlocked)
        assertEquals("Requires: Twin Harbors", jetty().reason)

        sim.state.completedQuests += "quest.busy_harbor"
        sim.state.completedQuests += "quest.moon_crossing"
        assertFalse(jetty().unlocked)

        val rejected = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.obsidian_jetty", "jet-1")))
        assertTrue(rejected.filterIsInstance<GameEvent.TravelRejected>().any { it.reason.contains("Twin Harbors") })

        sim.state.completedPrestige += "prestige.twin_harbors"
        assertTrue(jetty().travelEnabled)

        val traveled = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.obsidian_jetty", "jet-2")))
        assertTrue(traveled.filterIsInstance<GameEvent.HarborTraveled>().any {
            !it.replayed && it.toHarborId == "harbor.obsidian_jetty"
        })
        assertEquals("harbor.obsidian_jetty", sim.state.harborId)
        assertEquals("Obsidian Jetty", sim.view().harborName)
        assertEquals("obsidian_jetty_blockout.glb", sim.view().blockoutAsset)
        assertTrue(sim.state.fishingSpots.any { it.zoneId == "zone.jetty_end" })
        assertEquals(1L, sim.state.stat(Stats.HARBORS_TRAVELED))

        sim.state.bumpStat(Stats.HARBORS_TRAVELED, 2)
        val after = sim.checkedStep()
        assertTrue(after.filterIsInstance<GameEvent.QuestCompleted>().any { it.questId == "quest.obsidian_landing" })
        assertTrue(after.filterIsInstance<GameEvent.PrestigeUnlocked>().any { it.prestigeId == "prestige.triple_harbors" })
        assertTrue("quest.obsidian_landing" in sim.state.completedQuests)
        assertTrue("prestige.triple_harbors" in sim.state.completedPrestige)
        assertTrue("banner.triple_harbors" in sim.state.unlockedCosmetics)
    }

    @Test
    fun northlightHarborUnlocksAfterTripleHarborsPrestigeAndCompletesLandingQuest() {
        val northDef = Shared.content.harborsById.getValue("harbor.northlight_harbor")
        assertEquals(listOf("rush.nl_aurora", "rush.nl_frost_market"), northDef.rushes.map { it.id })
        assertEquals(
            listOf("species.frost_smelt", "species.arctic_cod", "species.ice_char", "species.polar_herring"),
            Shared.content.trophySetsById.getValue("gallery.northlight_harbor").species,
        )

        val sim = newSim()
        fun north() = sim.view().harbors.first { it.harborId == "harbor.northlight_harbor" }
        assertFalse(north().unlocked)
        assertEquals("Requires: Triple Harbors", north().reason)

        sim.state.completedQuests += "quest.busy_harbor"
        sim.state.completedQuests += "quest.moon_crossing"
        sim.state.completedQuests += "quest.obsidian_landing"
        sim.state.completedPrestige += "prestige.twin_harbors"
        assertFalse(north().unlocked)

        val rejected = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.northlight_harbor", "nl-1")))
        assertTrue(rejected.filterIsInstance<GameEvent.TravelRejected>().any { it.reason.contains("Triple Harbors") })

        sim.state.completedPrestige += "prestige.triple_harbors"
        assertTrue(north().travelEnabled)

        val traveled = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.northlight_harbor", "nl-2")))
        assertTrue(traveled.filterIsInstance<GameEvent.HarborTraveled>().any {
            !it.replayed && it.toHarborId == "harbor.northlight_harbor"
        })
        assertEquals("harbor.northlight_harbor", sim.state.harborId)
        assertEquals("Northlight Harbor", sim.view().harborName)
        assertEquals("northlight_harbor_blockout.glb", sim.view().blockoutAsset)
        assertEquals("Cold current", sim.view().harborSpecializationName)
        assertTrue(sim.state.fishingSpots.any { it.zoneId == "zone.nl_end" })
        assertEquals(1L, sim.state.stat(Stats.HARBORS_TRAVELED))

        sim.state.bumpStat(Stats.HARBORS_TRAVELED, 3)
        val after = sim.checkedStep()
        assertTrue(after.filterIsInstance<GameEvent.QuestCompleted>().any { it.questId == "quest.northlight_landing" })
        assertTrue(after.filterIsInstance<GameEvent.PrestigeUnlocked>().any { it.prestigeId == "prestige.quad_harbors" })
        assertTrue("quest.northlight_landing" in sim.state.completedQuests)
        assertTrue("prestige.quad_harbors" in sim.state.completedPrestige)
        assertTrue("banner.quad_harbors" in sim.state.unlockedCosmetics)
    }

    @Test
    fun grandMarinaUnlocksAfterQuadHarborsPrestigeAndCompletesLandingQuest() {
        val marinaDef = Shared.content.harborsById.getValue("harbor.grand_marina")
        assertEquals(listOf("rush.gm_regatta", "rush.gm_tasting"), marinaDef.rushes.map { it.id })
        assertEquals(3, marinaDef.fishingSpots.size)
        assertEquals(
            listOf("species.marina_tuna", "species.saffron_sole", "species.pearl_grouper", "species.harbor_pompano"),
            Shared.content.trophySetsById.getValue("gallery.grand_marina").species,
        )

        val sim = newSim()
        fun marina() = sim.view().harbors.first { it.harborId == "harbor.grand_marina" }
        assertFalse(marina().unlocked)
        assertEquals("Requires: Quad Harbors", marina().reason)

        sim.state.completedQuests += "quest.busy_harbor"
        sim.state.completedQuests += "quest.moon_crossing"
        sim.state.completedQuests += "quest.obsidian_landing"
        sim.state.completedQuests += "quest.northlight_landing"
        sim.state.completedPrestige += "prestige.twin_harbors"
        sim.state.completedPrestige += "prestige.triple_harbors"
        assertFalse(marina().unlocked)

        val rejected = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.grand_marina", "gm-1")))
        assertTrue(rejected.filterIsInstance<GameEvent.TravelRejected>().any { it.reason.contains("Quad Harbors") })

        sim.state.completedPrestige += "prestige.quad_harbors"
        assertTrue(marina().travelEnabled)

        val traveled = sim.checkedStep(listOf(Command.TravelToHarbor("harbor.grand_marina", "gm-2")))
        assertTrue(traveled.filterIsInstance<GameEvent.HarborTraveled>().any {
            !it.replayed && it.toHarborId == "harbor.grand_marina"
        })
        assertEquals("harbor.grand_marina", sim.state.harborId)
        assertEquals("Grand Marina", sim.view().harborName)
        assertEquals("grand_marina_blockout.glb", sim.view().blockoutAsset)
        assertEquals("Premium marina", sim.view().harborSpecializationName)
        assertTrue(sim.state.fishingSpots.any { it.zoneId == "zone.gm_end" })
        assertTrue(sim.state.fishingSpots.any { it.zoneId == "zone.gm_east" })
        assertTrue(sim.state.fishingSpots.any { it.zoneId == "zone.gm_west" })
        assertEquals(1L, sim.state.stat(Stats.HARBORS_TRAVELED))

        sim.state.bumpStat(Stats.HARBORS_TRAVELED, 4)
        val after = sim.checkedStep()
        assertTrue(after.filterIsInstance<GameEvent.QuestCompleted>().any { it.questId == "quest.grand_marina_landing" })
        assertTrue(after.filterIsInstance<GameEvent.PrestigeUnlocked>().any { it.prestigeId == "prestige.five_harbors" })
        assertTrue("quest.grand_marina_landing" in sim.state.completedQuests)
        assertTrue("prestige.five_harbors" in sim.state.completedPrestige)
        assertTrue("banner.five_harbors" in sim.state.unlockedCosmetics)
    }

    @Test
    fun shopDecorBuysWithCoinsOrBannersAndBuffsCustomerPatience() {
        assertEquals("1.0.0", Shared.content.contentVersion)
        assertEquals(7, Shared.content.decor.items.size)
        val lantern = Shared.content.decorById.getValue("decor.lantern_string")
        val pennant = Shared.content.decorById.getValue("decor.rising_tide_pennant")
        assertEquals(20, lantern.patienceBonusTicks)
        assertEquals("banner.rising_tide", pennant.requiresCosmetic)

        val sim = newSim()
        assertEquals(7, sim.view().decorOffers.size)
        assertEquals(0, sim.view().decorPatienceBonusTicks)
        val locked = sim.checkedStep(listOf(Command.PurchaseDecor(pennant.id, "decor-pennant")))
        assertTrue(locked.filterIsInstance<GameEvent.DecorPurchaseRejected>().any { it.reason.contains("Rising Tide") })

        sim.state.coins = 200
        val bought = sim.checkedStep(listOf(Command.PurchaseDecor(lantern.id, "decor-lantern")))
        assertTrue(bought.filterIsInstance<GameEvent.DecorPurchased>().any { !it.replayed })
        assertTrue(lantern.id in sim.state.ownedDecor)
        assertEquals(200L - lantern.cost, sim.state.coins)
        assertEquals(20, sim.view().decorPatienceBonusTicks)
        assertEquals(1L, sim.state.stat(Stats.DECOR_BOUGHT))

        sim.state.unlockedCosmetics += "banner.rising_tide"
        sim.state.coins = 100
        sim.checkedStep(listOf(Command.PurchaseDecor(pennant.id, "decor-pennant-2")))
        assertTrue(pennant.id in sim.state.ownedDecor)
        assertEquals(50, sim.view().decorPatienceBonusTicks)

        val beforeSpawn = sim.state.customers.size
        sim.state.customerSpawnProgress = sim.harbor.customerSpawnTicks - 1
        sim.checkedStep()
        assertTrue(sim.state.customers.size > beforeSpawn)
        val spawned = sim.state.customers.last()
        val type = Shared.content.customersById.getValue(spawned.typeId)
        assertEquals(type.patienceTicks + 50, spawned.patienceLeft)

        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(setOf(lantern.id, pennant.id), restored.ownedDecor)
    }

    @Test
    fun machineWearBreaksAndRepairsWithCoins() {
        assertEquals("1.0.0", Shared.content.contentVersion)
        val wear = Shared.content.economy.wear
        assertEquals(listOf("quest.busy_harbor"), wear.requires)
        assertEquals(40L, wear.repairCoins)
        assertTrue(wear.slowProcessMultPermille > 1000)

        val sim = newSim()
        assertFalse(com.willio.jeanvilma.fishshopping.core.economy.EconomySystem.wearUnlocked(sim.content, sim.state))
        sim.state.completedQuests += "quest.busy_harbor"
        assertTrue(com.willio.jeanvilma.fishshopping.core.economy.EconomySystem.wearUnlocked(sim.content, sim.state))

        val cutter = sim.state.machines.first { it.stationId == "station.cutter_1" }
        cutter.broken = true
        sim.checkedStep()
        assertEquals(MachineStatus.NEEDS_REPAIR, cutter.status)
        val view = sim.view().stations.first { it.stationId == cutter.stationId }
        assertTrue(view.needsRepair)
        assertEquals(40L, view.repairCost)
        assertEquals("Needs repair", view.statusText)

        sim.state.coins = 10
        val poor = sim.checkedStep(listOf(Command.RepairMachine(cutter.stationId, "fix-poor")))
        assertTrue(poor.filterIsInstance<GameEvent.MachineRepairRejected>().any { it.reason.contains("more coins") })
        assertTrue(cutter.broken)

        sim.state.coins = 100
        val fixed = sim.checkedStep(listOf(Command.RepairMachine(cutter.stationId, "fix-1")))
        assertTrue(fixed.filterIsInstance<GameEvent.MachineRepaired>().any { !it.replayed })
        assertFalse(cutter.broken)
        assertEquals(0L, cutter.slowUntilTick)
        assertEquals(60L, sim.state.coins)
        assertEquals(1L, sim.state.stat(Stats.MACHINES_REPAIRED))
        assertEquals(40L, sim.state.stat(Stats.REPAIR_SPENT))

        cutter.slowUntilTick = sim.state.tick + 500
        assertTrue(com.willio.jeanvilma.fishshopping.core.economy.EconomySystem.isSlowed(cutter, sim.state.tick))
        val slowView = sim.view().stations.first { it.stationId == cutter.stationId }
        assertTrue(slowView.slowed)
        assertEquals("Running slow", slowView.statusText)

        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        assertTrue(saved.contains("\"slowUntilTick\":"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        val restoredCutter = restored.machines.first { it.stationId == "station.cutter_1" }
        assertEquals(cutter.slowUntilTick, restoredCutter.slowUntilTick)
        assertFalse(restoredCutter.broken)
    }

    @Test
    fun seasonalEventsBoostWeightsGateContractsAndUnlockBanners() {
        assertEquals("1.0.0", Shared.content.contentVersion)
        val SE = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem
        val silver = Shared.content.seasonalEventsById.getValue("event.silver_tide")
        assertEquals(4, Shared.content.seasonalEvents.events.size)
        assertEquals("banner.silver_tide", silver.banner)
        assertEquals(2200, silver.speciesWeightMultPermille.getValue("species.silver_sprat"))
        assertNotNull(Shared.content.contractTemplatesById["contract.silver_tide_crate"])
        assertEquals(
            "event.silver_tide",
            Shared.content.contractTemplatesById.getValue("contract.silver_tide_crate").requiresSeasonalEvent,
        )

        assertNull(SE.active(Shared.content, 6199))
        assertEquals(silver.id, SE.active(Shared.content, 6200)!!.id)
        assertEquals(2000, SE.ticksRemaining(silver, 6200))
        assertEquals(2200, SE.scaledWeight(1000, Shared.content, 6200, "species.silver_sprat"))
        assertEquals(1000, SE.scaledWeight(1000, Shared.content, 6200, "species.copper_mullet"))

        val sim = newSim()
        // Jump near the festival window without replaying the whole starter line.
        sim.state.tick = 6199L
        assertNull(sim.view().seasonalEvent)
        val started = sim.checkedStep()
        assertTrue(started.filterIsInstance<GameEvent.SeasonalEventStarted>().any { it.eventId == silver.id })
        assertTrue("banner.silver_tide" in sim.state.unlockedCosmetics)
        val banner = sim.view().seasonalEvent!!
        assertEquals(silver.id, banner.eventId)
        assertEquals(silver.name, banner.name)
        assertTrue(banner.ticksRemaining > 0)

        sim.state.completedQuests.addAll(Shared.content.contracts.requires)
        val gated = Shared.content.contracts.templates.filter { it.requiresSeasonalEvent == silver.id }
        assertEquals(listOf("contract.silver_tide_crate"), gated.map { it.id })
        var sawEventOffer = false
        repeat(40) {
            if (sawEventOffer) return@repeat
            sim.state.contractBoardRefreshAt = sim.state.tick
            sim.checkedStep()
            sawEventOffer = sim.state.contractOffers.any { o ->
                Shared.content.contractTemplatesById.getValue(o.templateId).requiresSeasonalEvent == silver.id
            }
        }
        assertTrue(sawEventOffer)

        sim.state.tick = 8199L
        val ended = sim.checkedStep()
        assertTrue(ended.filterIsInstance<GameEvent.SeasonalEventEnded>().any { it.eventId == silver.id })
        assertNull(SE.active(Shared.content, sim.state.tick))
        assertNull(sim.view().seasonalEvent)
        assertTrue("banner.silver_tide" in sim.state.unlockedCosmetics)
    }

    @Test
    fun harborSpecializationsApplyMaintenanceRareChanceAndTouristDemand() {
        assertEquals("1.0.0", Shared.content.contentVersion)
        val sunrise = Shared.content.harborsById.getValue("harbor.sunrise_pier").specialization!!
        val moon = Shared.content.harborsById.getValue("harbor.moon_cove").specialization!!
        val jetty = Shared.content.harborsById.getValue("harbor.obsidian_jetty").specialization!!
        val northlight = Shared.content.harborsById.getValue("harbor.northlight_harbor").specialization!!
        val marina = Shared.content.harborsById.getValue("harbor.grand_marina").specialization!!
        assertEquals("spec.efficient_docks", sunrise.id)
        assertEquals(1, sunrise.maintenanceDiscountPerStation)
        assertEquals("spec.rare_waters", moon.id)
        assertEquals(80, moon.rareChanceBonusPermille)
        assertEquals("spec.tourist_strip", jetty.id)
        assertEquals(1300, jetty.kindSpawnMultPermille.getValue("tourist"))
        assertEquals("spec.cold_current", northlight.id)
        assertEquals(80, northlight.rareChanceBonusPermille)
        assertEquals(1250, northlight.kindSpawnMultPermille.getValue("critic"))
        assertEquals("spec.premium_marina", marina.id)
        assertEquals(40, marina.rareChanceBonusPermille)
        assertEquals(1350, marina.kindSpawnMultPermille.getValue("premium"))

        val sim = newSim()
        assertEquals("Efficient docks", sim.view().harborSpecializationName)
        assertEquals("Efficient docks", sim.view().harbors[0].specializationName)
        assertEquals(sunrise.description, sim.view().harbors[0].specializationDescription)

        val BS = com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem
        assertEquals(100, BS.rareChancePermille(100, null))
        assertEquals(180, BS.rareChancePermille(100, null, moon.rareChanceBonusPermille))

        val CS = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
        val tourist = Shared.content.customersById.getValue("customer.harbor_tourist")
        val atSunrise = CS.effectiveSpawnWeight(sim.content, sim.state, sim.harbor, tourist)
        sim.state.completedPrestige += "prestige.twin_harbors"
        sim.checkedStep(listOf(Command.TravelToHarbor("harbor.obsidian_jetty", "spec-jet")))
        assertEquals("harbor.obsidian_jetty", sim.state.harborId)
        assertEquals("Tourist strip", sim.view().harborSpecializationName)
        val atJetty = CS.effectiveSpawnWeight(sim.content, sim.state, sim.harbor, tourist)
        assertEquals((atSunrise.toLong() * 1300L / 1000L).toInt(), atJetty)
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
        // Sunrise Pier specialization (Efficient docks) cuts 1 from the base rate of 2.
        assertEquals(1, unlocked.maintenanceCoinsPerStation)
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
            it.stations == stations && it.coins == 1L * stations
        })
        assertEquals(50L - 1L * stations, sim.state.coins)
        assertEquals(1L * stations, sim.state.stat(Stats.MAINTENANCE_PAID))

        // Machine oil + harbor specialty zeros the per-station rate.
        sim.state.coins = 200
        sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.machine_oil", "oil-1")))
        assertEquals(1, sim.state.maintenanceDiscountPerStation)
        assertEquals(0, sim.view().maintenanceCoinsPerStation)
        sim.state.maintenanceAccrualTicks = sim.content.economy.maintenancePeriodTicks - 1
        val cheaper = sim.checkedStep()
        assertTrue(cheaper.filterIsInstance<GameEvent.MaintenancePaid>().isEmpty())

        // Counter spoilage removes one product unit deterministically.
        val counter = sim.primaryCounter()
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
        assertEquals("1.0.0", c.contentVersion)
        assertEquals(3, c.productsById.getValue("product.basic_portion").spoilTier)
        assertEquals(1, c.productsById.getValue("product.smoked_fillet").spoilTier)
        assertEquals(3, c.speciesById.getValue("species.silver_sprat").spoilTier)

        val sim = newSim()
        sim.state.completedQuests += "quest.first_ten_sales"
        val counter = sim.primaryCounter()
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
        assertEquals("1.0.0", Shared.content.contentVersion)
        val locked = sim.view()
        assertFalse(locked.prestigeUnlocked)
        assertEquals("Requires: Busy harbor", locked.prestigeLockedReason)
        assertEquals(1, locked.harborRating) // revenue 0 meets the first threshold
        assertEquals(12, locked.prestige.size)
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
        assertEquals(12, board.prestige.size)
        assertEquals("active", board.prestige.first { it.id == "prestige.rising_tide" }.status)
        assertEquals("locked", board.prestige.first { it.id == "prestige.harbor_star" }.status)
        assertEquals("active", board.prestige.first { it.id == "prestige.twin_harbors" }.status)
        assertEquals("locked", board.prestige.first { it.id == "prestige.triple_harbors" }.status)
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
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(setOf("prestige.rising_tide", "prestige.harbor_star", "prestige.twin_harbors"), restored.completedPrestige)
        assertEquals(1050, restored.prestigeCatchSpeedPermille)
        assertEquals(1050, restored.prestigePriceBonusPermille)
        assertEquals(
            setOf("banner.rising_tide", "banner.harbor_star", "banner.twin_harbors"),
            restored.unlockedCosmetics,
        )
    }

    @Test
    fun wholesalePadUnlocksB2BCounterAndCashiersRouteByDemand() {
        val sim = newSim()
        val CS = com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
        val wholesaleDef = sim.harbor.counters.first { it.kind.wire == "wholesale" }
        assertEquals("upgrade.wholesale_pad", wholesaleDef.requiresUpgrade)
        assertFalse(CS.isUnlocked(wholesaleDef, sim.state))
        val pilot = Autopilot(sim)
        sim.state.player.bag.add("product.ice_packed_crate", 1)
        pilot.walkTo(7000, 2750)
        assertEquals(wholesaleDef.zone, sim.state.player.zoneId)
        assertEquals(1, sim.state.player.bag.quantity("product.ice_packed_crate"))

        sim.state.completedQuests += "quest.first_ten_sales"
        sim.state.coins = 400
        walkToPlot(pilot, sim, "plot.sunrise_wholesale")
        val bought = sim.checkedStep(
            listOf(Command.BuildPlot("plot.sunrise_wholesale", "ws-1")),
        )
        assertTrue(bought.any { it is GameEvent.PlotBuilt })
        assertTrue(CS.isUnlocked(wholesaleDef, sim.state))

        pilot.walkTo(7000, 2750)
        assertEquals(wholesaleDef.zone, sim.state.player.zoneId)
        val wholesale = sim.state.counters.first { it.counterId == wholesaleDef.id }
        // Unlock tick may already stock one crate from the bag while standing on the pad.
        if (sim.state.player.bag.quantity("product.ice_packed_crate") > 0) {
            (1..20).forEach { pilot.tick(Command.Move(0, 0)) }
        }
        assertEquals(0, sim.state.player.bag.quantity("product.ice_packed_crate"))
        assertTrue(wholesale.stock.quantity("product.ice_packed_crate") >= 1)

        val open = sim.harbor.counters.filter { CS.isUnlocked(it, sim.state) }
        val wholesaler = sim.content.customersById.getValue("customer.wholesaler")
        val pick = CS.pickCounter(open, wholesaler, "product.ice_packed_crate", sim.state)
        assertEquals(wholesaleDef.id, pick!!.id)

        unlockStaffHiring(sim)
        sim.state.coins = 400
        sim.checkedStep(listOf(Command.HireWorker("worker.cashier", "hc-ws")))
        wholesale.stock.add("product.ice_packed_crate", 3)
        sim.state.customers += CustomerState(
            "customer.ws_queue", wholesaler.id, wholesale.counterId, wants = 2, patienceLeft = 9_999, walkTicksTotal = 0,
            preferredProductId = "product.ice_packed_crate",
        )
        var routed = false
        repeat(4_000) {
            sim.checkedStep()
            val cashier = sim.state.workers.single { it.roleId == "worker.cashier" }
            if (cashier.taskZoneId == wholesaleDef.zone &&
                (cashier.phase == WorkerTaskPhase.WORK || cashier.phase == WorkerTaskPhase.WALK_TO_WORK)
            ) {
                routed = true
                return@repeat
            }
        }
        assertTrue("cashier should route to the busy wholesale pad", routed)
    }

    @Test
    fun bankLoanRepayCollectAndCoinGoals() {
        assertEquals("1.0.0", Shared.content.contentVersion)
        val bank = Shared.content.bank
        assertEquals(listOf("quest.first_ten_sales"), bank.requires)
        assertEquals(80L, bank.loanPrincipal)
        assertEquals(100L, bank.repayAmount())
        assertEquals(listOf(150L, 300L, 600L, 1200L), bank.goalPresets)

        val sim = newSim()
        val BS = com.willio.jeanvilma.fishshopping.core.economy.BankSystem
        assertFalse(BS.unlocked(sim.content, sim.state))
        assertEquals("Requires: Make 10 sales", sim.view().bank.lockedReason)

        val locked = sim.checkedStep(listOf(Command.TakeLoan("loan-locked")))
        assertTrue(locked.filterIsInstance<GameEvent.LoanRejected>().any { it.reason.contains("Requires") })

        sim.state.completedQuests += "quest.first_ten_sales"
        assertTrue(BS.unlocked(sim.content, sim.state))
        val coinsBefore = sim.state.coins
        val taken = sim.checkedStep(listOf(Command.TakeLoan("loan-1")))
        assertTrue(taken.filterIsInstance<GameEvent.LoanTaken>().any { !it.replayed })
        assertEquals(coinsBefore + bank.loanPrincipal, sim.state.coins)
        assertEquals(bank.repayAmount(), sim.state.loanOwed)
        assertEquals(sim.state.tick + bank.termTicks, sim.state.loanDueTick)
        assertEquals(1L, sim.state.stat(Stats.LOANS_TAKEN))
        assertEquals(20L, sim.state.stat(Stats.LOAN_INTEREST_ACCRUED))

        val view = sim.view().bank
        assertTrue(view.unlocked)
        assertTrue(view.canRepayLoan)
        assertFalse(view.canTakeLoan)
        assertEquals(bank.repayAmount(), view.loanOwed)

        val again = sim.checkedStep(listOf(Command.TakeLoan("loan-again")))
        assertTrue(again.filterIsInstance<GameEvent.LoanRejected>().any { it.reason.contains("already") })

        sim.state.coins = 40
        val partial = sim.checkedStep(listOf(Command.RepayLoan("repay-1")))
        assertTrue(partial.filterIsInstance<GameEvent.LoanRepaid>().any { !it.replayed })
        assertEquals(0L, sim.state.coins)
        assertEquals(60L, sim.state.loanOwed)
        assertEquals(40L, sim.state.stat(Stats.LOAN_REPAID))

        sim.state.coins = 200
        sim.checkedStep(listOf(Command.RepayLoan("repay-2")))
        assertEquals(0L, sim.state.loanOwed)
        assertEquals(0L, sim.state.loanDueTick)
        assertEquals(140L, sim.state.coins)
        assertEquals(100L, sim.state.stat(Stats.LOAN_REPAID))

        sim.checkedStep(listOf(Command.TakeLoan("loan-2")))
        sim.state.loanDueTick = sim.state.tick
        sim.state.coins = 50
        sim.state.loanCollectionAccrualTicks = bank.collectionPeriodTicks - 1
        val collected = sim.checkedStep()
        assertTrue(collected.filterIsInstance<GameEvent.LoanCollected>().isNotEmpty())
        assertEquals(0L, sim.state.coins)
        assertEquals(50L, sim.state.loanOwed)
        assertEquals(50L, sim.state.stat(Stats.LOAN_COLLECTED))

        sim.checkedStep(listOf(Command.SetCoinGoal(300)))
        assertEquals(300L, sim.state.coinGoal)
        assertFalse(sim.state.coinGoalCelebrated)
        assertEquals(300L, sim.view().bank.coinGoal)

        sim.state.coins = 300
        val reached = sim.checkedStep()
        assertTrue(reached.filterIsInstance<GameEvent.CoinGoalReached>().any { it.amount == 300L })
        assertTrue(sim.state.coinGoalCelebrated)
        assertEquals(1L, sim.state.stat(Stats.COIN_GOALS_REACHED))

        sim.checkedStep(listOf(Command.SetCoinGoal(0)))
        assertEquals(0L, sim.state.coinGoal)
        assertFalse(sim.state.coinGoalCelebrated)

        val saved = SnapshotCodec.encode(sim.content, sim.state)
        assertTrue(saved.startsWith("{\"schemaVersion\":20,"))
        assertTrue(saved.contains("\"loanOwed\":"))
        assertTrue(saved.contains("\"coinGoal\":"))
        val restored = SnapshotCodec.decode(sim.content, saved)
        assertEquals(sim.state.loanOwed, restored.loanOwed)
        assertEquals(sim.state.loanDueTick, restored.loanDueTick)
        assertEquals(0L, restored.coinGoal)
    }

    @Test
    fun warehouseRollsUpAvailableVsReservedAcrossLocations() {
        val sim = newSim()
        val empty = sim.view().warehouse
        assertTrue(empty.empty)
        assertTrue(empty.reconcileOk)
        assertNull(empty.reconcileError)
        assertEquals(0, empty.quantity)

        sim.state.player.bag.add(sprat, 3)
        assertTrue(sim.state.player.bag.reserve(sprat, 1))
        cutter(sim).input.add(sprat, 2)
        assertTrue(cutter(sim).input.reserve(sprat, 1))
        cutter(sim).output.add(portion, 4)
        sim.state.counters.first().stock.add(portion, 5)
        assertTrue(sim.state.counters.first().stock.reserve(portion, 2))

        val wh = sim.view().warehouse
        assertFalse(wh.empty)
        assertTrue(wh.reconcileOk)
        assertNull(wh.reconcileError)
        assertEquals(3 + 2 + 4 + 5, wh.quantity)
        assertEquals(1 + 1 + 2, wh.reserved)
        assertEquals(wh.quantity - wh.reserved, wh.available)

        val spratLine = wh.lines.first { it.itemId == sprat }
        assertEquals(5, spratLine.quantity)
        assertEquals(2, spratLine.reserved)
        assertEquals(3, spratLine.available)
        assertTrue(spratLine.locations.any { it.label == "Bag" && it.quantity == 3 && it.reserved == 1 })
        assertTrue(spratLine.locations.any { it.label.endsWith(" in") && it.quantity == 2 && it.reserved == 1 })

        val portionLine = wh.lines.first { it.itemId == portion }
        assertEquals(9, portionLine.quantity)
        assertEquals(2, portionLine.reserved)
        assertEquals(7, portionLine.available)
        assertTrue(portionLine.locations.any { it.label.endsWith(" out") && it.quantity == 4 })
        assertTrue(portionLine.locations.any { it.label == "Retail counter" && it.reserved == 2 })
    }

    @Test
    fun speciesBookTracksDiscoveryZonesRecipesAndTrophies() {
        val sim = newSim()
        val empty = sim.view().speciesBook
        assertTrue(empty.empty)
        assertEquals(0, empty.discovered)
        assertEquals(sim.content.species.size, empty.total)
        assertTrue(empty.entries.all { !it.discovered && it.name == "???" })

        sim.state.recordSpeciesCatch(sprat, 2)
        sim.state.trophies[sprat] = com.willio.jeanvilma.fishshopping.core.sim.TrophyRecord(
            sizePermille = 1120,
            valueCoins = 3,
            tick = 10,
        )

        val book = sim.view().speciesBook
        assertFalse(book.empty)
        assertEquals(1, book.discovered)
        val entry = book.entries.first { it.speciesId == sprat }
        assertTrue(entry.discovered)
        assertEquals("Silver sprat", entry.name)
        assertEquals(2L, entry.catches)
        assertTrue(entry.harborNames.contains("Sunrise Pier"))
        assertTrue(entry.recipeNames.any { it.contains("→") })
        assertEquals(1120, entry.trophyBestSizePermille)
        assertEquals(3L, entry.trophyBestValueCoins)

        val rare = book.entries.first { it.speciesId == "species.golden_sprat" }
        assertFalse(rare.discovered)
        assertEquals("species.silver_sprat", rare.baseSpeciesId)
    }

    @Test
    fun businessDashboardUsesCommittedSalesAndIntervalLabels() {
        val sim = newSim()
        val empty = sim.view().businessDashboard
        assertTrue(empty.empty)
        assertEquals("0s", empty.sessionLabel)
        assertEquals("awaiting 1m", empty.rateIntervalLabel)
        assertEquals(0L, empty.committedRevenue)

        // One minute of session time without simulating customers.
        sim.state.tick = 20L * 60L
        sim.state.stats[Stats.SALES] = 10L
        sim.state.stats[Stats.ITEMS_SOLD] = 14L
        sim.state.stats[Stats.REVENUE] = 200L
        sim.state.stats[Stats.CONTRACT_REVENUE] = 50L
        sim.state.stats[Stats.LOST_CUSTOMERS] = 2L
        sim.state.stats[Stats.WAGES_PAID] = 40L
        sim.state.stats[Stats.FISH_CAUGHT] = 5L
        sim.state.speciesCatches.clear()
        sim.state.recordSpeciesCatch(sprat, 5)
        // Force OUTPUT_FULL bottleneck (same setup as automationIssues test).
        val cutter = cutter(sim)
        cutter.output.add(portion, 19)
        cutter.input.add(sprat, 3)
        sim.checkedStep()
        assertEquals(MachineStatus.OUTPUT_FULL, cutter.status)

        val dash = sim.view().businessDashboard
        assertFalse(dash.empty)
        assertEquals("1m 0s", dash.sessionLabel)
        assertEquals("per min", dash.rateIntervalLabel)
        assertEquals(200L, dash.committedRevenue)
        assertEquals(50L, dash.contractRevenue)
        assertEquals(10L, dash.salesCount)
        assertEquals(14L, dash.itemsSold)
        assertEquals(200L, dash.revenuePerMinute)
        assertEquals(10L, dash.salesPerMinute)
        assertEquals((2L * 1000L) / 12L, dash.abandonPermille)
        assertEquals((40L * 1000L) / 200L, dash.wageRatioPermille)
        // Wallet coins are not committed revenue.
        assertTrue(dash.committedRevenue == 200L)
        assertTrue(sim.state.coins != dash.committedRevenue + dash.contractRevenue)
        assertTrue(dash.bottlenecks.any { it.kind == "machine" && it.reason == "Output full" })
        assertTrue(dash.topSpecies.any { it.speciesId == sprat })
    }
}
