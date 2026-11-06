package com.willio.jeanvilma.fishshopping.core.customers

import com.willio.jeanvilma.fishshopping.core.content.CounterDef
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.content.PointMm
import com.willio.jeanvilma.fishshopping.core.sim.CounterState
import com.willio.jeanvilma.fishshopping.core.sim.CustomerState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Customer journey: spawn at the harbor entry -> walk to the queue (canonical walking
 * time, so the presentation and the rules agree) -> join counter queue ->
 * front customer reserves stock across accepted products (sorted item order) ->
 * checkout while the player (later: a cashier) stands at the counter ->
 * pay once under a sale ID -> leave.
 * Patience expiry releases all reservations; unpaid goods return to stock.
 *
 * Walking is a straight line from the entry to the customer's queue slot at spawn time;
 * the slot's distance fixes the walking ticks. Leaving is presentation only.
 *
 * TODO(blueprint): routed paths around obstacles, rush groups,
 * restaurant bulk orders, premium visitors, cashier staff.
 */
object CustomerSystem {

    fun step(ctx: StepContext) {
        spawn(ctx)
        val s = ctx.state
        for (counter in s.counters) {
            val def = ctx.harbor.counters.first { it.id == counter.counterId }
            val front = s.customers.firstOrNull { it.counterId == counter.counterId && it.arrived }
            if (front == null) {
                counter.checkoutProgress = 0
                continue
            }

            reserveTowardBasket(front, counter, def)

            val availableAccepted = acceptedAvailable(counter, def)
            val basketReady = front.reserved > 0 &&
                (front.reserved == front.wants || availableAccepted == 0)
            val served = s.player.zoneId == def.zone
            if (basketReady && served) {
                if (++counter.checkoutProgress >= def.checkoutTicks) {
                    pay(ctx, front, counter)
                    s.customers.remove(front)
                    counter.checkoutProgress = 0
                    ctx.emit(GameEvent.CustomerLeft(s.tick, front.id, paid = true))
                }
            } else {
                counter.checkoutProgress = 0
            }
        }

        // Walkers advance; queued customers lose patience; abandoning releases reserved stock.
        for (c in s.customers) if (c.walkTicksLeft > 0) c.walkTicksLeft--
        val leaving = s.customers.filter { it.arrived && --it.patienceLeft <= 0 }
        for (c in leaving) {
            val counter = s.counters.first { it.counterId == c.counterId }
            releaseAll(c, counter)
            if (s.customers.firstOrNull { it.counterId == c.counterId && it.arrived } === c) counter.checkoutProgress = 0
            s.customers.remove(c)
            s.bumpStat(Stats.LOST_CUSTOMERS)
            ctx.emit(GameEvent.CustomerLeft(s.tick, c.id, paid = false))
        }
    }

    /** Fill remaining basket slots from accepted stock in sorted inventory key order. */
    private fun reserveTowardBasket(front: CustomerState, counter: CounterState, def: CounterDef) {
        var need = front.wants - front.reserved
        if (need <= 0) return
        for ((itemId, _) in counter.stock.contents()) {
            if (!def.accepts(itemId)) continue
            val take = minOf(need, counter.stock.available(itemId))
            if (take > 0 && counter.stock.reserve(itemId, take)) {
                front.addReservation(itemId, take)
                need -= take
                if (need == 0) return
            }
        }
    }

    private fun acceptedAvailable(counter: CounterState, def: CounterDef): Int =
        counter.stock.contents().keys.filter { def.accepts(it) }.sumOf { counter.stock.available(it) }

    private fun releaseAll(c: CustomerState, counter: CounterState) {
        for ((itemId, qty) in c.reservedItems) {
            counter.stock.releaseReservation(itemId, qty)
        }
        c.clearReservations()
    }

    private fun pay(ctx: StepContext, c: CustomerState, counter: CounterState) {
        val s = ctx.state
        val items = c.reservedItems.map { (item, qty) -> ItemQuantity(item, qty) }
        var amount = 0L
        for ((itemId, qty) in c.reservedItems) {
            val price = ctx.content.productsById.getValue(itemId).unitPrice
            amount = SafeMath.add(amount, SafeMath.multiply(price, qty.toLong()))
        }
        val saleId = s.newId("sale")
        s.coins = SafeMath.creditCoins(s.coins, amount)
        s.bumpStat(Stats.SALES)
        s.bumpStat(Stats.ITEMS_SOLD, c.reserved.toLong())
        s.bumpStat(Stats.REVENUE, amount)
        s.record(Receipt(saleId, "sale", amount, s.tick, c.id))
        for ((itemId, qty) in c.reservedItems) {
            counter.stock.takeReserved(itemId, qty)
        }
        c.clearReservations()
        ctx.emit(GameEvent.SaleCommitted(s.tick, saleId, c.id, items, amount))
    }

    /** ceil(straight-line distance / speed), integer only. */
    fun walkTicks(from: PointMm, to: PointMm, mmPerTick: Int): Int {
        val dx = (to.x - from.x).toLong()
        val dz = (to.z - from.z).toLong()
        val dist = SafeMath.isqrt(dx * dx + dz * dz)
        return ((dist + mmPerTick - 1) / mmPerTick).toInt()
    }

    private fun spawn(ctx: StepContext) {
        val s = ctx.state
        if (++s.customerSpawnProgress < ctx.harbor.customerSpawnTicks) return
        s.customerSpawnProgress = 0
        // First counter (stable order) with queue space.
        val counterDef = ctx.harbor.counters.firstOrNull { d -> s.customers.count { it.counterId == d.id } < d.maxQueue }
            ?: return
        val types = ctx.content.customers
        val type = types[s.rng.pickWeighted(types.map { it.spawnWeight })]
        val wants = s.rng.nextInRange(type.basketMin, type.basketMax)
        val slot = counterDef.queueSlot(s.customers.count { it.counterId == counterDef.id })
        val c = CustomerState(
            s.newId("customer"), type.id, counterDef.id, wants, type.patienceTicks,
            walkTicks(ctx.harbor.customerEntry, slot, ctx.harbor.customerWalkMmPerTick),
        )
        s.customers += c
        ctx.emit(GameEvent.CustomerArrived(s.tick, c.id, counterDef.id))
    }
}
