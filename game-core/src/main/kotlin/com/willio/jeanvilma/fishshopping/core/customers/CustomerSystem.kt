package com.willio.jeanvilma.fishshopping.core.customers

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.CounterDef
import com.willio.jeanvilma.fishshopping.core.content.CounterKind
import com.willio.jeanvilma.fishshopping.core.content.CustomerDef
import com.willio.jeanvilma.fishshopping.core.content.CustomerKind
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.content.PointMm
import com.willio.jeanvilma.fishshopping.core.content.RushWindowDef
import com.willio.jeanvilma.fishshopping.core.content.WorkerRoleKind
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.progression.PrestigeSystem
import com.willio.jeanvilma.fishshopping.core.sim.CounterState
import com.willio.jeanvilma.fishshopping.core.sim.CustomerState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.WorkerTaskPhase
import kotlin.math.max

/**
 * Customer journey: spawn -> walk -> queue -> reserve (preferred product first) ->
 * checkout while the player or an on-duty cashier is at the counter -> pay once -> leave.
 *
 * Product demand (Phase 8): each customer rolls a preferred product from content
 * weights. Unmet preference drains patience faster while that SKU is missing and
 * lowers the paid price via unmetPriceMultPermille.
 *
 * Rush windows (Phase 9): periodic content schedules spike spawn speed and queue
 * capacity; transitions emit RushStarted / RushEnded for HUD/toasts.
 *
 * Pathing (Phase 10): approach follows entry → content waypoints → queue slot;
 * tick cost is the sum of per-segment ceil(dist/speed). Leaving is presentation-only.
 *
 * Cashier (Phase 12): a worker in WORK at the counter zone can serve instead of the player.
 *
 * Wholesale pad (Phase 15): second sell point gated by upgrade; spawn routes
 * wholesalers to unlocked wholesale counters when space allows.
 */
object CustomerSystem {

    fun isUnlocked(def: CounterDef, state: GameState): Boolean =
        def.requiresUpgrade == null || def.requiresUpgrade in state.ownedUpgrades

    fun step(ctx: StepContext) {
        announceRushTransitions(ctx)
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

            val availableAccepted = acceptedAvailable(front, counter, def)
            val basketReady = front.reserved > 0 &&
                (front.reserved == front.wants || availableAccepted == 0)
            val served = s.player.zoneId == def.zone || cashierCovering(ctx, def.zone)
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

        // Walkers advance; queued customers lose patience (faster when preferred stock is out).
        for (c in s.customers) if (c.walkTicksLeft > 0) c.walkTicksLeft--
        val leaving = mutableListOf<CustomerState>()
        for (c in s.customers) {
            if (!c.arrived) continue
            val counter = s.counters.first { it.counterId == c.counterId }
            val def = ctx.harbor.counters.first { it.id == c.counterId }
            val type = ctx.content.customersById.getValue(c.typeId)
            val drain = patienceDrain(ctx, c, counter, def, type.unmetPatienceDrainPermille)
            c.patienceLeft -= drain
            if (c.patienceLeft <= 0) leaving += c
        }
        for (c in leaving) {
            val counter = s.counters.first { it.counterId == c.counterId }
            releaseAll(c, counter)
            if (s.customers.firstOrNull { it.counterId == c.counterId && it.arrived } === c) counter.checkoutProgress = 0
            s.customers.remove(c)
            s.bumpStat(Stats.LOST_CUSTOMERS)
            ctx.emit(GameEvent.CustomerLeft(s.tick, c.id, paid = false))
        }
    }

    /**
     * Fill remaining basket slots: preferred product first, then other accepted stock
     * in sorted inventory key order.
     */
    private fun reserveTowardBasket(front: CustomerState, counter: CounterState, def: CounterDef) {
        var need = front.wants - front.reserved
        if (need <= 0) return
        val pref = front.preferredProductId
        if (pref != null && def.accepts(pref)) {
            val take = minOf(need, counter.stock.available(pref))
            if (take > 0 && counter.stock.reserve(pref, take)) {
                front.addReservation(pref, take)
                need -= take
                if (need == 0) return
            }
        }
        for ((itemId, _) in counter.stock.contents()) {
            if (!def.accepts(itemId)) continue
            if (itemId == pref) continue // already tried
            val take = minOf(need, counter.stock.available(itemId))
            if (take > 0 && counter.stock.reserve(itemId, take)) {
                front.addReservation(itemId, take)
                need -= take
                if (need == 0) return
            }
        }
    }

    /** Units still useful for this customer's remaining demand. */
    private fun acceptedAvailable(front: CustomerState, counter: CounterState, def: CounterDef): Int {
        val need = front.wants - front.reserved
        if (need <= 0) return 0
        return counter.stock.contents().keys.filter { def.accepts(it) }.sumOf { counter.stock.available(it) }
    }

    private fun patienceDrain(
        ctx: StepContext,
        c: CustomerState,
        counter: CounterState,
        def: CounterDef,
        unmetDrainPermille: Int,
    ): Int {
        val pref = c.preferredProductId
        val stillNeeds = c.wants - c.reserved
        var drain = if (pref == null || stillNeeds <= 0) {
            1
        } else {
            val prefAvailable = if (def.accepts(pref)) counter.stock.available(pref) else 0
            if (prefAvailable > 0) 1
            else (unmetDrainPermille / 1000).coerceAtLeast(1)
        }
        if (com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem.greeterOnDuty(ctx.content, ctx.state)) {
            val mult = ctx.content.staffProgression.roleBuffs.greeterPatienceDrainMultPermille
            drain = ((drain.toLong() * mult) / 1000L).toInt().coerceAtLeast(1)
        }
        return drain
    }

    private fun releaseAll(c: CustomerState, counter: CounterState) {
        for ((itemId, qty) in c.reservedItems) {
            counter.stock.releaseReservation(itemId, qty)
        }
        c.clearReservations()
    }

    private fun pay(ctx: StepContext, c: CustomerState, counter: CounterState) {
        val s = ctx.state
        val type = ctx.content.customersById.getValue(c.typeId)
        val items = c.reservedItems.map { (item, qty) -> ItemQuantity(item, qty) }
        var base = 0L
        for ((itemId, qty) in c.reservedItems) {
            val price = ctx.content.productsById.getValue(itemId).unitPrice
            base = SafeMath.add(base, SafeMath.multiply(price, qty.toLong()))
        }
        val met = c.preferenceMet()
        var mult = type.priceMultPermille.toLong()
        if (!met) mult = (mult * type.unmetPriceMultPermille.toLong()) / 1000L
        val counterDef = ctx.harbor.counters.first { it.id == counter.counterId }
        mult = (mult * demandPriceMultPermille(ctx.content, s, ctx.harbor, counterDef, counter).toLong()) / 1000L
        mult = (mult * s.prestigePriceBonusPermille.toLong()) / 1000L
        val amount = (base * mult) / 1000L
        val saleId = s.newId("sale")
        s.coins = SafeMath.creditCoins(s.coins, amount)
        s.bumpStat(Stats.SALES)
        s.bumpStat(Stats.ITEMS_SOLD, c.reserved.toLong())
        s.bumpStat(Stats.REVENUE, amount)
        when (type.kind) {
            CustomerKind.PREMIUM -> s.bumpStat(Stats.PREMIUM_SALES)
            CustomerKind.BULK -> s.bumpStat(Stats.BULK_SALES)
            CustomerKind.TOURIST -> s.bumpStat(Stats.TOURIST_SALES)
            CustomerKind.WHOLESALER -> s.bumpStat(Stats.WHOLESALER_SALES)
            CustomerKind.CRITIC -> s.bumpStat(Stats.CRITIC_SALES)
            CustomerKind.NIGHT_REGULAR -> s.bumpStat(Stats.NIGHT_SALES)
            CustomerKind.STANDARD -> Unit
        }
        if (!met) s.bumpStat(Stats.UNMET_PREFERENCE_SALES)
        s.record(Receipt(saleId, "sale", amount, s.tick, c.id))
        for ((itemId, qty) in c.reservedItems) {
            counter.stock.takeReserved(itemId, qty)
        }
        c.clearReservations()
        // Phase 16: on-duty cashier at this pad earns XP for the assist.
        val counterZone = ctx.harbor.counters.first { it.id == counter.counterId }.zone
        ctx.state.workers.firstOrNull { w ->
            val role = ctx.content.workersById[w.roleId]?.role
            role == WorkerRoleKind.CASHIER &&
                !w.busyWalking &&
                w.phase == WorkerTaskPhase.WORK &&
                w.taskZoneId == counterZone
        }?.let { cashier ->
            com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem.grantXp(
                ctx, cashier, ctx.content.staffProgression.xpSaleAssisted,
            )
        }
        ctx.emit(
            GameEvent.SaleCommitted(
                s.tick, saleId, c.id, items, amount,
                customerTypeId = type.id,
                priceMultPermille = mult.toInt(),
                preferenceMet = met,
                preferredProductId = c.preferredProductId,
            ),
        )
    }

    /** ceil(straight-line distance / speed), integer only. */
    fun walkTicks(from: PointMm, to: PointMm, mmPerTick: Int): Int {
        val dx = (to.x - from.x).toLong()
        val dz = (to.z - from.z).toLong()
        val dist = SafeMath.isqrt(dx * dx + dz * dz)
        return ((dist + mmPerTick - 1) / mmPerTick).toInt()
    }

    /** Approach polyline: entry → harbor waypoints → [destination]. */
    fun approachPath(harbor: HarborDef, destination: PointMm): List<PointMm> =
        listOf(harbor.customerEntry) + harbor.customerPathWaypoints + destination

    /** Sum of per-segment [walkTicks] along [path]. */
    fun pathWalkTicks(path: List<PointMm>, mmPerTick: Int): Int {
        if (path.size < 2) return 0
        var total = 0
        for (i in 0 until path.lastIndex) {
            total += walkTicks(path[i], path[i + 1], mmPerTick)
        }
        return total
    }

    /**
     * Point along [path] after [elapsedTicks] of [totalTicks]. Uses cumulative
     * segment length so presentation matches the deterministic tick cost.
     */
    fun pointAlongPath(path: List<PointMm>, elapsedTicks: Int, totalTicks: Int): Pair<Float, Float> {
        if (path.isEmpty()) return 0f to 0f
        if (totalTicks <= 0 || elapsedTicks >= totalTicks) {
            val last = path.last()
            return last.x.toFloat() to last.z.toFloat()
        }
        if (elapsedTicks <= 0) {
            val first = path.first()
            return first.x.toFloat() to first.z.toFloat()
        }
        val lengths = LongArray(path.lastIndex) { i ->
            val a = path[i]
            val b = path[i + 1]
            val dx = (b.x - a.x).toLong()
            val dz = (b.z - a.z).toLong()
            SafeMath.isqrt(dx * dx + dz * dz)
        }
        val totalLen = lengths.sum()
        if (totalLen <= 0L) {
            val last = path.last()
            return last.x.toFloat() to last.z.toFloat()
        }
        var target = (elapsedTicks.toLong() * totalLen) / totalTicks
        for (i in lengths.indices) {
            val len = lengths[i]
            if (target <= len) {
                val a = path[i]
                val b = path[i + 1]
                if (len == 0L) return a.x.toFloat() to a.z.toFloat()
                val x = a.x + ((b.x - a.x).toLong() * target) / len
                val z = a.z + ((b.z - a.z).toLong() * target) / len
                return x.toFloat() to z.toFloat()
            }
            target -= len
        }
        val last = path.last()
        return last.x.toFloat() to last.z.toFloat()
    }

    private fun spawn(ctx: StepContext) {
        val s = ctx.state
        val interval = spawnIntervalTicks(ctx.content, s, ctx.harbor)
        if (++s.customerSpawnProgress < interval) return
        s.customerSpawnProgress = 0
        val rush = activeRush(ctx.harbor, s.tick)
        val open = ctx.harbor.counters.filter { d ->
            isUnlocked(d, s) &&
                s.customers.count { it.counterId == d.id } < effectiveMaxQueue(d, rush)
        }
        if (open.isEmpty()) return
        val types = ctx.content.customers
        val type = types[s.rng.pickWeighted(types.map { effectiveSpawnWeight(ctx.content, s, ctx.harbor, it) })]
        val wants = s.rng.nextInRange(type.basketMin, type.basketMax)
        val preferredRoll = if (type.preferredProducts.isEmpty()) null
        else type.preferredProducts[s.rng.pickWeighted(type.preferredProducts.map { it.weight })].item
        val counterDef = pickCounter(open, type, preferredRoll, s) ?: return
        val preferred = preferredRoll?.takeIf { counterDef.accepts(it) }
        val slot = counterDef.queueSlot(s.customers.count { it.counterId == counterDef.id })
        val path = approachPath(ctx.harbor, slot)
        val patience = type.patienceTicks +
            com.willio.jeanvilma.fishshopping.core.world.DecorSystem.patienceBonusTicks(ctx.content, s)
        val c = CustomerState(
            s.newId("customer"), type.id, counterDef.id, wants, patience,
            pathWalkTicks(path, ctx.harbor.customerWalkMmPerTick),
            preferredProductId = preferred,
        )
        s.customers += c
        ctx.emit(GameEvent.CustomerArrived(s.tick, c.id, counterDef.id))
    }

    /**
     * Choose an open unlocked counter: wholesalers prefer wholesale pads;
     * others prefer a pad that can sell their preferred SKU; then least queue.
     */
    fun pickCounter(
        open: List<CounterDef>,
        type: CustomerDef,
        preferred: String?,
        state: GameState,
    ): CounterDef? {
        if (open.isEmpty()) return null
        val matching = preferred?.let { p -> open.filter { it.accepts(p) } }.orEmpty()
        val wholesale = open.filter { it.kind == CounterKind.WHOLESALE }
        val pool = when {
            type.kind == CustomerKind.WHOLESALER && matching.any { it.kind == CounterKind.WHOLESALE } ->
                matching.filter { it.kind == CounterKind.WHOLESALE }
            type.kind == CustomerKind.WHOLESALER && wholesale.isNotEmpty() -> wholesale
            matching.isNotEmpty() -> matching
            else -> open
        }
        return pool.minWithOrNull(
            compareBy<CounterDef> { d -> state.customers.count { it.counterId == d.id } }
                .thenBy { it.id },
        )
    }

    /** True when a cashier is on duty at [counterZoneId] (arrived, not walking). */
    fun cashierCovering(ctx: StepContext, counterZoneId: String): Boolean =
        ctx.state.workers.any { w ->
            val role = ctx.content.workersById[w.roleId]?.role
            role == WorkerRoleKind.CASHIER &&
                !w.busyWalking &&
                w.phase == WorkerTaskPhase.WORK &&
                w.taskZoneId == counterZoneId
        }

    /** Active rush for [tick], or null outside every window. */
    fun activeRush(harbor: HarborDef, tick: Long): RushWindowDef? {
        if (harbor.rushes.isEmpty() || tick <= 0L) return null
        for (r in harbor.rushes) {
            val phase = (tick % r.periodTicks.toLong()).toInt()
            if (phase >= r.startTick && phase < r.endTick) return r
        }
        return null
    }

    fun spawnIntervalTicks(content: ContentPack, state: GameState, harbor: HarborDef): Int {
        val rush = activeRush(harbor, state.tick)
        var ticks = if (rush == null) {
            harbor.customerSpawnTicks
        } else {
            max(1, ((harbor.customerSpawnTicks.toLong() * 1000L) / rush.spawnSpeedPermille).toInt())
        }
        val crowd = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem
            .customerSpawnMultPermille(content, state)
        ticks = max(1, ((ticks.toLong() * 1000L) / crowd.toLong()).toInt())
        // Finish 2.0 Phase 16 — festival weekends stack on weather/tide crowd.
        val festival = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem
            .customerSpawnMultPermille(content, state.tick)
        ticks = max(1, ((ticks.toLong() * 1000L) / festival.toLong()).toInt())
        return ticks
    }

    /**
     * Base spawn weight scaled by day-part (Phase 11), reputation kind bias (Phase 13),
     * harbor specialization (Phase 22), and festival-only gating (Finish 2.0 Phase 16).
     */
    fun effectiveSpawnWeight(
        content: ContentPack,
        state: GameState,
        harbor: HarborDef,
        type: CustomerDef,
    ): Int {
        val event = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.active(content, state.tick)
        val req = type.requiresSeasonalEvent
        if (req != null && event?.id != req) return 0
        val part = FishingSystem.dayPartAt(content, state.tick)
        val dayMult = type.dayPartSpawnMultPermille[part.id] ?: 1000
        val repMult = ReputationSystem.kindSpawnMultPermille(content, state, type.kind)
        val harborMult = harbor.specialization?.kindSpawnMultPermille?.get(type.kind.wire) ?: 1000
        var weight = type.spawnWeight.toLong()
        weight = (weight * dayMult.toLong()) / 1000L
        weight = (weight * repMult.toLong()) / 1000L
        weight = (weight * harborMult.toLong()) / 1000L
        if (event != null && type.id in event.festivalCustomerIds) {
            weight = (weight * 2000L) / 1000L
        }
        return max(1, weight.toInt())
    }

    /** Soft rush price tip while a rush window is active (Phase 12). */
    fun rushPriceMultPermille(harbor: HarborDef, tick: Long): Int =
        activeRush(harbor, tick)?.priceMultPermille ?: 1000

    /**
     * Soft scarcity tip from counter fill ratio vs [EconomyDef.scarcityPriceCurvePermille].
     * Empty shelves land in band 0; a full counter lands in the last band.
     */
    fun scarcityPriceMultPermille(content: ContentPack, def: CounterDef, counter: CounterState): Int {
        val curve = content.economy.scarcityPriceCurvePermille
        if (curve.isEmpty() || def.capacityUnits <= 0) return 1000
        val used = counter.stock.usedUnits().coerceIn(0, def.capacityUnits)
        val band = ((used.toLong() * curve.size) / def.capacityUnits.toLong())
            .toInt()
            .coerceIn(0, curve.lastIndex)
        return curve[band]
    }

    /** Soft harbor-rating tip from [PrestigeDef.ratingPriceMultPermille] (Phase 12). */
    fun ratingPriceMultPermille(content: ContentPack, state: GameState): Int {
        val table = content.prestige.ratingPriceMultPermille
        if (table.isEmpty()) return 1000
        val stars = PrestigeSystem.harborRating(content, state).coerceIn(0, table.lastIndex)
        return table[stars]
    }

    /**
     * Combined ephemeral demand multiplier (rush × scarcity × rating × festival),
     * excluding permanent prestige.
     */
    fun demandPriceMultPermille(
        content: ContentPack,
        state: GameState,
        harbor: HarborDef,
        def: CounterDef,
        counter: CounterState,
    ): Int {
        var mult = 1000L
        mult = (mult * rushPriceMultPermille(harbor, state.tick).toLong()) / 1000L
        mult = (mult * scarcityPriceMultPermille(content, def, counter).toLong()) / 1000L
        mult = (mult * ratingPriceMultPermille(content, state).toLong()) / 1000L
        mult = (mult * com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem
            .priceMultPermille(content, state.tick).toLong()) / 1000L
        return max(1, mult.toInt())
    }

    fun effectiveMaxQueue(def: CounterDef, rush: RushWindowDef?): Int =
        def.maxQueue + (rush?.queueBonus ?: 0)

    fun ticksRemaining(rush: RushWindowDef, tick: Long): Int {
        val phase = (tick % rush.periodTicks.toLong()).toInt()
        return (rush.endTick - phase).coerceAtLeast(0)
    }

    private fun announceRushTransitions(ctx: StepContext) {
        val s = ctx.state
        val cur = activeRush(ctx.harbor, s.tick)
        val prev = if (s.tick <= 1L) null else activeRush(ctx.harbor, s.tick - 1)
        if (prev?.id == cur?.id) return
        if (prev != null) ctx.emit(GameEvent.RushEnded(s.tick, prev.id, prev.name))
        if (cur != null) ctx.emit(GameEvent.RushStarted(s.tick, cur.id, cur.name))
    }
}
