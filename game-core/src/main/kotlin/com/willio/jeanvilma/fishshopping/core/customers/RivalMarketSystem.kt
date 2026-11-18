package com.willio.jeanvilma.fishshopping.core.customers

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.CounterDef
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.content.RivalMarketDef
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.sim.CounterState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.max
import kotlin.math.min

/**
 * Finish 3.0 Phase 14 — single-player rival NPC markets.
 * Active rivals siphon demand when specialty shelves are empty, undercut sale
 * prices, and can be beaten by well-stocked specialty sales. Schema 23 stats only.
 */
object RivalMarketSystem {
    /** Keep the scripted tutorial free of rival siphon / undercut RNG. */
    fun tutorialClear(content: ContentPack, state: GameState): Boolean =
        state.tutorialIndex >= content.tutorial.size

    fun activeRivals(content: ContentPack, state: GameState, harborId: String): List<RivalMarketDef> {
        if (!tutorialClear(content, state)) return emptyList()
        val partId = FishingSystem.dayPartAt(content, state.tick).id
        return content.rivalMarkets.rivals.filter {
            harborId in it.harbors && partId in it.activeDayParts
        }
    }

    fun specialtyStockUnits(state: GameState, specialtyProducts: List<String>): Int {
        var units = 0
        for (counter in state.counters) {
            for (productId in specialtyProducts) {
                // Count reserved lines too — shelves still hold the SKU while checkout runs.
                units += counter.stock.quantity(productId)
            }
        }
        return units
    }

    fun isPressuring(content: ContentPack, state: GameState, harborId: String): Boolean {
        val active = activeRivals(content, state, harborId)
        if (active.isEmpty()) return false
        if (ReputationSystem.band(content, state) >= content.rivalMarkets.minReputationBandToResist) {
            return false
        }
        for (rival in active) {
            if (specialtyStockUnits(state, rival.specialtyProducts) < content.rivalMarkets.wellStockedUnits) {
                return true
            }
        }
        return false
    }

    fun customerSpawnMultPermille(content: ContentPack, state: GameState, harborId: String): Int =
        if (isPressuring(content, state, harborId)) content.rivalMarkets.pressureSpawnMultPermille else 1000

    fun salePriceMultPermille(
        content: ContentPack,
        state: GameState,
        harborId: String,
        def: CounterDef,
        @Suppress("UNUSED_PARAMETER") counter: CounterState,
    ): Int {
        val active = activeRivals(content, state, harborId)
        if (active.isEmpty()) return 1000
        var best = 1000
        for (rival in active) {
            val specialtyOnPad = rival.specialtyProducts.any { it in def.products }
            if (!specialtyOnPad) continue
            val stocked = specialtyStockUnits(state, rival.specialtyProducts)
            if (stocked >= content.rivalMarkets.wellStockedUnits) continue
            if (rival.undercutPriceMultPermille < best) best = rival.undercutPriceMultPermille
        }
        return best
    }

    fun noteSaleOutcome(ctx: StepContext, items: List<ItemQuantity>) {
        val active = activeRivals(ctx.content, ctx.state, ctx.state.harborId)
        if (active.isEmpty()) return
        for (rival in active) {
            val hit = items.firstOrNull { it.item in rival.specialtyProducts } ?: continue
            val stocked = specialtyStockUnits(ctx.state, rival.specialtyProducts)
            if (stocked >= ctx.content.rivalMarkets.wellStockedUnits) {
                ctx.state.bumpStat(Stats.RIVAL_BEATS)
                ctx.state.beatenRivalIds += rival.id
                ctx.emit(GameEvent.RivalBeaten(ctx.state.tick, rival.id, hit.item))
            } else {
                ctx.state.bumpStat(Stats.RIVAL_UNDERCUTS)
            }
            return
        }
    }

    private fun announceTransitions(ctx: StepContext) {
        val s = ctx.state
        if (!tutorialClear(ctx.content, s)) return
        val prevPart = FishingSystem.dayPartAt(ctx.content, max(0L, s.tick - 1)).id
        val curPart = FishingSystem.dayPartAt(ctx.content, s.tick).id
        if (prevPart == curPart && s.tick > 1L) return
        val prevActive = ctx.content.rivalMarkets.rivals.filter {
            s.harborId in it.harbors && prevPart in it.activeDayParts
        }
        val curActive = activeRivals(ctx.content, s, s.harborId)
        for (r in prevActive) {
            if (curActive.none { it.id == r.id }) {
                ctx.emit(GameEvent.RivalMarketClosed(s.tick, r.id, r.name))
            }
        }
        for (r in curActive) {
            if (prevActive.none { it.id == r.id }) {
                ctx.emit(GameEvent.RivalMarketOpened(s.tick, r.id, r.name))
            }
        }
    }

    fun step(ctx: StepContext) {
        announceTransitions(ctx)
        val s = ctx.state
        val cat = ctx.content.rivalMarkets
        if (cat.tickInterval < 1 || s.tick % cat.tickInterval.toLong() != 0L) return
        val active = activeRivals(ctx.content, s, s.harborId)
        if (active.isEmpty()) return
        if (ReputationSystem.band(ctx.content, s) >= cat.minReputationBandToResist) return
        for (rival in active) {
            val stocked = specialtyStockUnits(s, rival.specialtyProducts)
            if (stocked >= cat.wellStockedUnits) continue
            var chance = cat.emptyStockSiphonChancePermille
            chance = min(
                1000,
                chance + ((rival.aggressionPermille.toLong() * cat.lowRepSiphonBonusPermille) / 1000L).toInt(),
            )
            if (s.rng.nextInRange(0, 999) >= chance) continue
            val productId = rival.specialtyProducts[s.rng.nextInRange(0, rival.specialtyProducts.lastIndex)]
            s.bumpStat(Stats.RIVAL_SALES_STOLEN)
            ctx.emit(GameEvent.RivalSaleStolen(s.tick, rival.id, productId))
        }
    }
}
