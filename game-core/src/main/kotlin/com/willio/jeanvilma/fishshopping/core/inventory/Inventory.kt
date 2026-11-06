package com.willio.jeanvilma.fishshopping.core.inventory

import java.util.TreeMap

/**
 * Authoritative container. Quantities are whole items; capacity is in carry units.
 * Visible stacks in the renderer are only a presentation of this data.
 *
 * Maps are sorted so iteration (and therefore simulation and serialisation)
 * order is stable on every platform.
 */
class Inventory(
    val id: String,
    var capacityUnits: Int,
    private val unitsOf: (String) -> Int,
) {
    private val quantities = TreeMap<String, Int>()
    private val reserved = TreeMap<String, Int>()

    fun quantity(item: String): Int = quantities[item] ?: 0
    fun reservedQuantity(item: String): Int = reserved[item] ?: 0
    fun available(item: String): Int = quantity(item) - reservedQuantity(item)

    fun usedUnits(): Int = quantities.entries.sumOf { (item, q) -> unitsOf(item) * q }
    fun freeUnits(): Int = (capacityUnits - usedUnits()).coerceAtLeast(0)
    fun isEmpty() = quantities.isEmpty()

    /** Snapshot of non-zero quantities in stable order. */
    fun contents(): Map<String, Int> = TreeMap(quantities)
    fun reservations(): Map<String, Int> = TreeMap(reserved)

    /** How many of [item] fit in the remaining capacity. */
    fun roomFor(item: String): Int = freeUnits() / unitsOf(item)

    fun canAdd(item: String, count: Int) = count <= roomFor(item)

    fun add(item: String, count: Int) {
        require(count >= 0)
        if (count == 0) return
        check(canAdd(item, count)) { "$id: no room for $count x $item" }
        quantities[item] = quantity(item) + count
    }

    /** Removes unreserved items. */
    fun remove(item: String, count: Int) {
        require(count >= 0)
        if (count == 0) return
        check(available(item) >= count) { "$id: only ${available(item)} unreserved $item, tried to remove $count" }
        setQuantity(item, quantity(item) - count)
    }

    /** Marks items as claimed by someone travelling to collect them. */
    fun reserve(item: String, count: Int): Boolean {
        if (count <= 0 || available(item) < count) return false
        reserved[item] = reservedQuantity(item) + count
        return true
    }

    fun releaseReservation(item: String, count: Int) {
        val r = reservedQuantity(item)
        check(count in 0..r) { "$id: releasing $count of $r reserved $item" }
        if (r - count == 0) reserved.remove(item) else reserved[item] = r - count
    }

    /** Removes items that were previously reserved (the claim is fulfilled). */
    fun takeReserved(item: String, count: Int) {
        releaseReservation(item, count)
        setQuantity(item, quantity(item) - count)
    }

    private fun setQuantity(item: String, q: Int) {
        check(q >= 0) { "$id: negative quantity for $item" }
        if (q == 0) quantities.remove(item) else quantities[item] = q
    }

    /** Restores state from a snapshot. Only for persistence. */
    fun restore(q: Map<String, Int>, r: Map<String, Int>) {
        quantities.clear(); reserved.clear()
        q.forEach { (k, v) -> if (v > 0) quantities[k] = v }
        r.forEach { (k, v) -> if (v > 0) reserved[k] = v }
    }

    /** Returns a list of problems; empty when consistent. */
    fun invariantProblems(): List<String> {
        val p = mutableListOf<String>()
        quantities.forEach { (k, v) -> if (v < 0) p += "$id: negative $k" }
        reserved.forEach { (k, v) -> if (v > quantity(k)) p += "$id: reserved $v of ${quantity(k)} $k" }
        if (usedUnits() > capacityUnits) p += "$id: ${usedUnits()} units over capacity $capacityUnits"
        return p
    }
}

object Transfers {
    /**
     * Blueprint transfer rule: move min(source available, destination free capacity, requested)
     * whole units of one item, as a single mutation. Returns the count moved (0 when rejected).
     * Wrong item types are rejected by [accepts] without changing either inventory.
     */
    fun move(
        source: Inventory,
        destination: Inventory,
        item: String,
        requested: Int,
        accepts: (String) -> Boolean = { true },
    ): Int {
        if (requested <= 0 || !accepts(item)) return 0
        val count = minOf(source.available(item), destination.roomFor(item), requested)
        if (count <= 0) return 0
        source.remove(item, count)
        destination.add(item, count)
        return count
    }

    /** Moves one item of the first acceptable type found in [source] (stable order). */
    fun moveFirstAccepted(source: Inventory, destination: Inventory, accepts: (String) -> Boolean): String? {
        for (item in source.contents().keys) {
            if (move(source, destination, item, 1, accepts) == 1) return item
        }
        return null
    }
}
