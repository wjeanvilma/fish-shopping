package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.ContentException
import com.willio.jeanvilma.fishshopping.core.content.ContentLoader
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.inventory.Transfers
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class ContentAndInventoryTest {

    @Test
    fun sharedContentPackIsValid() {
        val c = Shared.content
        assertEquals(20, c.ticksPerSecond)
        assertEquals(6L, c.productsById.getValue("product.basic_portion").unitPrice)
        assertEquals(13L, c.productsById.getValue("product.fillet").unitPrice)
        assertEquals(20L, c.productsById.getValue("product.premium_portion").unitPrice)
        assertEquals(5, c.harbors.size)
        assertEquals(listOf("quest.first_ten_sales"), c.economy.requires)
        assertEquals(2, c.economy.maintenanceCoinsPerStation)
        assertEquals(listOf("quest.busy_harbor"), c.prestige.requires)
        assertEquals(11, c.quests.size)
        assertEquals(
            listOf(
                "quest.first_cast",
                "quest.line_running",
                "quest.first_ten_sales",
                "quest.fill_the_hold",
                "quest.first_hire",
                "quest.specialty_kitchen",
                "quest.busy_harbor",
                "quest.moon_crossing",
                "quest.obsidian_landing",
                "quest.northlight_landing",
                "quest.grand_marina_landing",
            ),
            c.quests.map { it.id },
        )
        assertEquals(listOf("upgrade.harbor_grill"), c.questsById.getValue("quest.fill_the_hold").reward.unlockUpgrades)
        assertEquals(listOf("upgrade.side_pier"), c.questsById.getValue("quest.specialty_kitchen").reward.unlockUpgrades)
        assertEquals(listOf("quest.specialty_kitchen"), c.upgradesById.getValue("upgrade.side_pier").requires)
        assertEquals(11, c.tutorial.size)
        assertEquals("tutorial.first_contract", c.tutorial[7].id)
        assertEquals("tutorial.hire_staff", c.tutorial[8].id)
        assertEquals("tutorial.grill_line", c.tutorial[9].id)
        assertEquals("tutorial.plot_marker", c.tutorial[10].id)
        assertEquals(4, c.harborsById.getValue("harbor.sunrise_pier").plots.size)
        assertTrue(c.harborsById.getValue("harbor.sunrise_pier").plotsByUpgrade.containsKey("upgrade.harbor_grill"))
        assertEquals(5, c.harborsById.getValue("harbor.obsidian_jetty").plots.size)
        assertEquals(12, c.prestige.milestones.size)
        assertEquals(listOf(0L, 250L, 750L, 1500L, 3000L), c.prestige.ratingThresholds)
        val pierCounters = c.harborsById.getValue("harbor.sunrise_pier").counters
        assertEquals(2, pierCounters.size)
        assertEquals(12, pierCounters.first { it.requiresUpgrade == null }.products.size)
        assertEquals(6, pierCounters.first { it.kind.wire == "wholesale" }.products.size)
        assertEquals(5, c.harborsById.getValue("harbor.sunrise_pier").stations.size)
        assertEquals(6, c.machines.size)
        assertEquals(emptyList<String>(), c.harborsById.getValue("harbor.sunrise_pier").requires)
        val cove = c.harborsById.getValue("harbor.moon_cove")
        assertEquals(listOf("quest.busy_harbor"), cove.requires)
        assertEquals("moon_cove_blockout.glb", cove.blockoutAsset)
        assertEquals(5, cove.stations.size)
        val jetty = c.harborsById.getValue("harbor.obsidian_jetty")
        assertEquals(listOf("prestige.twin_harbors"), jetty.requires)
        assertEquals("obsidian_jetty_blockout.glb", jetty.blockoutAsset)
        assertEquals(6, jetty.stations.size)
        assertEquals(2, jetty.rushes.size)
        assertTrue(jetty.stations.any { it.machine == "machine.harbor_chiller" })
        assertTrue(jetty.stations.any { it.machine == "machine.harbor_fryer" })
        assertTrue(jetty.stations.any { it.machine == "machine.harbor_packer" })
        val northlight = c.harborsById.getValue("harbor.northlight_harbor")
        assertEquals(listOf("prestige.triple_harbors"), northlight.requires)
        assertEquals("northlight_harbor_blockout.glb", northlight.blockoutAsset)
        assertEquals(6, northlight.stations.size)
        assertEquals(2, northlight.rushes.size)
        val marina = c.harborsById.getValue("harbor.grand_marina")
        assertEquals(listOf("prestige.quad_harbors"), marina.requires)
        assertEquals("grand_marina_blockout.glb", marina.blockoutAsset)
        assertEquals(6, marina.stations.size)
        assertEquals(3, marina.fishingSpots.size)
        assertEquals(2, marina.rushes.size)
        assertTrue(c.machinesById.containsKey("machine.harbor_chiller"))
        assertTrue(c.machinesById.containsKey("machine.harbor_fryer"))
        assertTrue(c.machinesById.containsKey("machine.harbor_packer"))
        assertEquals(
            "machine.harbor_chiller",
            (c.upgradesById.getValue("upgrade.harbor_chiller").effect
                as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        assertEquals(
            "machine.harbor_fryer",
            (c.upgradesById.getValue("upgrade.harbor_fryer").effect
                as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        assertEquals(
            "machine.harbor_packer",
            (c.upgradesById.getValue("upgrade.harbor_packer").effect
                as com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect.UnlockMachine).machine,
        )
        assertEquals("spec.efficient_docks", c.harborsById.getValue("harbor.sunrise_pier").specialization!!.id)
        assertEquals(1, c.harborsById.getValue("harbor.sunrise_pier").specialization!!.maintenanceDiscountPerStation)
        assertEquals(80, c.harborsById.getValue("harbor.moon_cove").specialization!!.rareChanceBonusPermille)
        assertEquals(1300, jetty.specialization!!.kindSpawnMultPermille.getValue("tourist"))
        assertEquals("spec.cold_current", northlight.specialization!!.id)
        assertEquals(80, northlight.specialization!!.rareChanceBonusPermille)
        assertEquals("spec.premium_marina", marina.specialization!!.id)
        assertEquals(1350, marina.specialization!!.kindSpawnMultPermille.getValue("premium"))
        assertTrue(c.machinesById.containsKey("machine.basic_smoker"))
        assertEquals(18L, c.productsById.getValue("product.smoked_fillet").unitPrice)
        assertEquals(100, c.recipesById.getValue("recipe.basic_portions").durationTicks)
    }

    private fun expectError(mutate: (String) -> String, fragment: String) {
        val text = mutate(Shared.text("content/content-pack.json"))
        try {
            ContentLoader.load(text)
            fail("expected content error containing '$fragment'")
        } catch (e: ContentException) {
            assertTrue("'${e.message}' should mention '$fragment'", e.message!!.contains(fragment))
        }
    }

    @Test
    fun validatorReportsBrokenReferencesAndCycles() {
        expectError({ it.replace("\"machine\": \"machine.basic_cutter\",\n      \"inputs\"", "\"machine\": \"machine.nope\",\n      \"inputs\"") }, "unknown machine 'machine.nope'")
        expectError({ it.replace("\"requires\": [],", "\"requires\": [\"upgrade.bag_capacity_3\"],") }, "cycle")
        expectError({ it.replace("\"catchTicks\": 80", "\"catchTicks\": \"80\"") }, "$.species[0].catchTicks: expected a 32-bit integer")
        expectError({ it.replace("\"id\": \"species.blue_mackerel\"", "\"id\": \"species.silver_sprat\"") }, "Duplicate id 'species.silver_sprat'")
    }

    private fun units(item: String) = if (item == "big") 3 else 1

    @Test
    fun transferMovesMinOfAvailableFreeAndRequested() {
        val a = Inventory("a", 10, ::units).apply { add("fish", 6) }
        val b = Inventory("b", 4, ::units).apply { add("fish", 1) }
        assertEquals(3, Transfers.move(a, b, "fish", 5))
        assertEquals(3, a.quantity("fish"))
        assertEquals(4, b.quantity("fish"))
        assertEquals(0, Transfers.move(a, b, "fish", 5)) // destination full
    }

    @Test
    fun wrongItemTypeChangesNothing() {
        val a = Inventory("a", 10, ::units).apply { add("fish", 2) }
        val b = Inventory("b", 10, ::units)
        assertEquals(0, Transfers.move(a, b, "fish", 1) { it == "portion" })
        assertEquals(2, a.quantity("fish"))
        assertTrue(b.isEmpty())
    }

    @Test
    fun multiUnitItemsRespectCapacity() {
        val bag = Inventory("bag", 5, ::units)
        assertEquals(1, bag.roomFor("big"))
        bag.add("big", 1)
        assertFalse(bag.canAdd("big", 1))
        assertEquals(2, bag.roomFor("fish"))
    }

    @Test
    fun reservedStockCannotBeTakenTwice() {
        val counter = Inventory("counter", 10, ::units).apply { add("portion", 3) }
        assertTrue(counter.reserve("portion", 2))
        assertFalse(counter.reserve("portion", 2)) // only 1 unreserved left
        assertEquals(1, counter.available("portion"))
        counter.takeReserved("portion", 2)
        assertEquals(1, counter.quantity("portion"))
        assertEquals(0, counter.reservedQuantity("portion"))
        assertEquals(emptyList<String>(), counter.invariantProblems())
    }
}
