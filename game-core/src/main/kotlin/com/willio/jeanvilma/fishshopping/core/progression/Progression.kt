package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.QuestDef
import com.willio.jeanvilma.fishshopping.core.content.TutorialTrigger
import com.willio.jeanvilma.fishshopping.core.content.UpgradeDef
import com.willio.jeanvilma.fishshopping.core.content.UpgradeEffect
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

object UpgradeSystem {

    sealed interface Availability {
        data object Owned : Availability
        data class Locked(val reason: String) : Availability
        data class TooExpensive(val missing: Long) : Availability
        data object Purchasable : Availability
    }

    fun availability(content: ContentPack, s: GameState, u: UpgradeDef): Availability {
        if (u.id in s.ownedUpgrades) return Availability.Owned
        val missing = u.requires.firstOrNull { it !in s.ownedUpgrades && it !in s.completedQuests }
        if (missing != null) {
            val name = content.upgradesById[missing]?.name ?: content.questsById[missing]?.name ?: missing
            return Availability.Locked("Requires: $name")
        }
        if (s.coins < u.cost) return Availability.TooExpensive(u.cost - s.coins)
        return Availability.Purchasable
    }

    /**
     * Validates at commit and applies atomically. A retried request ID returns the
     * original receipt instead of charging again (blueprint "App closes during purchase").
     */
    fun purchase(ctx: StepContext, upgradeId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let {
            ctx.emit(GameEvent.UpgradePurchased(s.tick, upgradeId, it, replayed = true))
            return
        }
        val u = ctx.content.upgradesById[upgradeId]
        if (u == null) {
            ctx.emit(GameEvent.PurchaseRejected(s.tick, upgradeId, requestId, "Unknown upgrade"))
            return
        }
        when (val a = availability(ctx.content, s, u)) {
            Availability.Owned -> ctx.emit(GameEvent.PurchaseRejected(s.tick, upgradeId, requestId, "Already owned"))
            is Availability.Locked -> ctx.emit(GameEvent.PurchaseRejected(s.tick, upgradeId, requestId, a.reason))
            is Availability.TooExpensive -> ctx.emit(GameEvent.PurchaseRejected(s.tick, upgradeId, requestId, "Need ${a.missing} more coins"))
            Availability.Purchasable -> {
                s.coins -= u.cost
                s.ownedUpgrades += u.id
                applyEffect(s, u.effect)
                grantBaitOnPurchase(ctx, u.effect)
                s.bumpStat(Stats.UPGRADES_BOUGHT)
                val receipt = Receipt(s.newId("receipt"), "upgrade", -u.cost, s.tick, requestId)
                s.purchaseReceipts[requestId] = receipt
                s.record(receipt)
                ctx.emit(GameEvent.UpgradePurchased(s.tick, u.id, receipt, replayed = false))
                ctx.emit(GameEvent.CheckpointRequested(s.tick, "purchase"))
            }
        }
    }

    /** Effects are also re-applied on load from owned upgrades, so they must be idempotent. */
    fun applyEffect(s: GameState, effect: UpgradeEffect) {
        when (effect) {
            is UpgradeEffect.CarryCapacity ->
                s.player.bag.capacityUnits = maxOf(s.player.bag.capacityUnits, effect.capacityUnits)
            is UpgradeEffect.RecipeDuration ->
                s.machines.filter { it.machineId == effect.machine }.forEach { m ->
                    val current = m.recipeDurations[effect.recipe]
                    if (current == null || effect.durationTicks < current) m.recipeDurations[effect.recipe] = effect.durationTicks
                }
            is UpgradeEffect.CatchSpeed ->
                s.player.catchSpeedPermille = maxOf(s.player.catchSpeedPermille, effect.speedPermille)
            is UpgradeEffect.GrantBait -> Unit // granted only at purchase via grantBaitOnPurchase
            is UpgradeEffect.TimingWindow -> {
                val p = s.player
                p.timingWindowStartPermille = minOf(p.timingWindowStartPermille, effect.windowStartPermille)
                p.timingWindowEndPermille = maxOf(p.timingWindowEndPermille, effect.windowEndPermille)
                p.timingPerfectStartPermille = minOf(p.timingPerfectStartPermille, effect.perfectStartPermille)
                p.timingPerfectEndPermille = maxOf(p.timingPerfectEndPermille, effect.perfectEndPermille)
                p.timingPerfectStartPermille =
                    p.timingPerfectStartPermille.coerceIn(p.timingWindowStartPermille, p.timingWindowEndPermille - 1)
                p.timingPerfectEndPermille =
                    p.timingPerfectEndPermille.coerceIn(p.timingPerfectStartPermille + 1, p.timingWindowEndPermille)
            }
            is UpgradeEffect.FishRegen ->
                s.player.fishRegenPermille = maxOf(s.player.fishRegenPermille, effect.speedPermille)
            is UpgradeEffect.UnlockFishingSpot -> Unit // gated by ownedUpgrades in FishingSystem
            is UpgradeEffect.UnlockMachine -> Unit // gated by ownedUpgrades in ProductionSystem
            is UpgradeEffect.UnlockCounter -> Unit // gated by ownedUpgrades in CustomerSystem
            // Phase 19: staff gear is assigned per-worker via loadouts — purchasing only unlocks the pool.
            is UpgradeEffect.WorkerMoveSpeed -> Unit
            is UpgradeEffect.WorkerCarry -> Unit
            is UpgradeEffect.WorkerCatchSpeed -> Unit
            is UpgradeEffect.WorkerWage ->
                s.workerWagePerWorkerPerHour = maxOf(s.workerWagePerWorkerPerHour, effect.coinsPerWorkerPerHour)
            is UpgradeEffect.MaintenanceDiscount ->
                s.maintenanceDiscountPerStation = maxOf(s.maintenanceDiscountPerStation, effect.coinsOffPerStation)
            is UpgradeEffect.BagSpoilResist ->
                s.bagSpoilPeriodMultPermille = maxOf(s.bagSpoilPeriodMultPermille, effect.periodMultPermille)
            is UpgradeEffect.CounterSpoilResist ->
                s.counterSpoilPeriodMultPermille = maxOf(s.counterSpoilPeriodMultPermille, effect.periodMultPermille)
        }
    }

    /** Purchase-time bait grant (never re-applied on snapshot load). */
    fun grantBaitOnPurchase(ctx: StepContext, effect: UpgradeEffect) {
        if (effect !is UpgradeEffect.GrantBait) return
        val bait = ctx.content.baitById[effect.bait] ?: return
        val bag = ctx.state.player.bag
        var added = 0
        repeat(effect.quantity) {
            if (bag.roomFor(bait.id) < 1) return@repeat
            bag.add(bait.id, 1)
            added++
        }
        if (added > 0) {
            ctx.state.bumpStat(Stats.BAIT_BOUGHT, added.toLong())
            if (ctx.state.player.preferredBaitId == null) ctx.state.player.preferredBaitId = bait.id
        }
    }
}

/** Quests and tutorial advance on state, never on animation timing. */
object ProgressionSystem {
    fun step(ctx: StepContext) {
        val s = ctx.state
        for (q in ctx.content.quests) {
            if (q.id in s.completedQuests) continue
            if (!requirementsMet(s, q)) continue
            if (s.stat(q.goal.stat) < q.goal.atLeast) continue
            completeQuest(ctx, q)
        }
        val step = ctx.content.tutorial.getOrNull(s.tutorialIndex) ?: return
        val done = when (val t = step.advanceOn) {
            is TutorialTrigger.EnterZone -> s.player.zoneId == t.zone
            is TutorialTrigger.Stat -> s.stat(t.goal.stat) >= t.goal.atLeast
        }
        if (done) {
            s.tutorialIndex++
            ctx.emit(GameEvent.TutorialAdvanced(s.tick, s.tutorialIndex))
        }
    }

    fun requirementsMet(s: GameState, q: QuestDef): Boolean =
        q.requires.all { it in s.ownedUpgrades || it in s.completedQuests }

    fun missingRequirement(content: ContentPack, s: GameState, q: QuestDef): String? {
        val missing = q.requires.firstOrNull { it !in s.ownedUpgrades && it !in s.completedQuests } ?: return null
        return content.upgradesById[missing]?.name ?: content.questsById[missing]?.name ?: missing
    }

    private fun completeQuest(ctx: StepContext, q: QuestDef) {
        val s = ctx.state
        s.completedQuests += q.id
        s.bumpStat(Stats.QUESTS_COMPLETED)
        val reward = q.reward
        if (reward.coins > 0) {
            s.coins = SafeMath.creditCoins(s.coins, reward.coins)
            val receipt = Receipt(s.newId("quest"), "quest_reward", reward.coins, s.tick, q.id)
            s.record(receipt)
        }
        for (uid in reward.unlockUpgrades) {
            val u = ctx.content.upgradesById[uid] ?: continue
            s.ownedUpgrades += uid
            UpgradeSystem.applyEffect(s, u.effect)
            UpgradeSystem.grantBaitOnPurchase(ctx, u.effect)
        }
        ctx.emit(GameEvent.QuestCompleted(s.tick, q.id, reward.coins, reward.unlockUpgrades))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "quest"))
    }
}
