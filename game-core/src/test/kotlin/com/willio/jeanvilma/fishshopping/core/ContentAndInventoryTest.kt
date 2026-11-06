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
        assertEquals(5L, c.productsById.getValue("product.basic_portion").unitPrice)
        assertEquals(12L, c.productsById.getValue("product.fillet").unitPrice)
        assertEquals(20L, c.productsById.getValue("product.premium_portion").unitPrice)
        assertEquals(4, c.harborsById.getValue("harbor.sunrise_pier").counters.single().products.size)
        assertEquals(2, c.harborsById.getValue("harbor.sunrise_pier").stations.size)
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
