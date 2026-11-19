package com.willio.jeanvilma.fishshopping.game.vm

import com.willio.jeanvilma.fishshopping.analytics.AnalyticsBus
import com.willio.jeanvilma.fishshopping.audio.AudioBus
import com.willio.jeanvilma.fishshopping.audio.SfxCue
import com.willio.jeanvilma.fishshopping.audio.sfxFromEvent
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelController
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId
import com.willio.jeanvilma.fishshopping.core.ship.VfxJuice5
import com.willio.jeanvilma.fishshopping.core.ship.VfxJuice6
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.core.world.WeatherSystem
import com.willio.jeanvilma.fishshopping.render.FlyingTransferCue
import com.willio.jeanvilma.fishshopping.render.ShakeKind
import com.willio.jeanvilma.fishshopping.render.WorldBurstCue
import com.willio.jeanvilma.fishshopping.render.resolveAchievementBurst
import com.willio.jeanvilma.fishshopping.render.resolveAuroraCrestBurst
import com.willio.jeanvilma.fishshopping.render.resolveBaitBurst
import com.willio.jeanvilma.fishshopping.render.resolveCastStrikeBurst
import com.willio.jeanvilma.fishshopping.render.resolveCatchBurst
import com.willio.jeanvilma.fishshopping.render.resolveCelebrateBurst
import com.willio.jeanvilma.fishshopping.render.resolveContractAcceptBurst
import com.willio.jeanvilma.fishshopping.render.resolveContractDeadlineBurst
import com.willio.jeanvilma.fishshopping.render.resolveContractDoneBurst
import com.willio.jeanvilma.fishshopping.render.resolveCosmeticBurst
import com.willio.jeanvilma.fishshopping.render.resolveDecorBurst
import com.willio.jeanvilma.fishshopping.render.resolveEndgameChallengeBurst
import com.willio.jeanvilma.fishshopping.render.resolveEndgameTierBurst
import com.willio.jeanvilma.fishshopping.render.resolveFermentReadyBurst
import com.willio.jeanvilma.fishshopping.render.resolveFestivalBurst
import com.willio.jeanvilma.fishshopping.render.resolveFlyingTransfer
import com.willio.jeanvilma.fishshopping.render.resolveFullUnlockBurst
import com.willio.jeanvilma.fishshopping.render.resolveGoalClaimBurst
import com.willio.jeanvilma.fishshopping.render.resolveHarborTravelBurst
import com.willio.jeanvilma.fishshopping.render.resolveHireBurst
import com.willio.jeanvilma.fishshopping.render.resolveLoanBurst
import com.willio.jeanvilma.fishshopping.render.resolveMachineBreakBurst
import com.willio.jeanvilma.fishshopping.render.resolveMachineDoneBurst
import com.willio.jeanvilma.fishshopping.render.resolveNestSettleBurst
import com.willio.jeanvilma.fishshopping.render.resolvePayBurst
import com.willio.jeanvilma.fishshopping.render.resolvePrestigeBurst
import com.willio.jeanvilma.fishshopping.render.resolveQuestNearBurst
import com.willio.jeanvilma.fishshopping.render.resolveRivalBeatBurst
import com.willio.jeanvilma.fishshopping.render.resolveRoastReadyBurst
import com.willio.jeanvilma.fishshopping.render.resolveSchoolFlashBurst
import com.willio.jeanvilma.fishshopping.render.resolveSpoilBurst
import com.willio.jeanvilma.fishshopping.render.resolveTrophySetBurst
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * Finish 6.0 Phase 5 — Android sim-step event bus (SFX + VFX cue enqueue).
 * Mirrors web `hostStepBus.ts` / `processHostStep`.
 */
interface VmStepSink {
    fun emitMessage(text: String)
    fun save()
    fun publish(force: Boolean)
    fun syncMusicBed()
    val audio: AudioBus
    val panels: ShellPanelController
    val flyingTransfers: ConcurrentLinkedQueue<FlyingTransferCue>
    val worldBursts: ConcurrentLinkedQueue<WorldBurstCue>
    val pendingShakes: ConcurrentLinkedQueue<ShakeKind>
    var latestView: SimView?
}

object VmStepBus {
    fun process(s: Simulation, commands: ConcurrentLinkedQueue<Command>, sink: VmStepSink) {
        val batch = ArrayList<Command>()
        var next = commands.poll()
        while (next != null) {
            batch += next
            next = commands.poll()
        }
        val events = s.step(batch)
        AnalyticsBus.shared.onGameEvents(events, s.state)
        var transaction = false
        val transferred = ArrayList<GameEvent.ItemsTransferred>()
        val payCustomers = ArrayList<String>()
        val machineDone = ArrayList<String>()
        var celebrate = false
        var catchCount = 0
        var achievementBurst = false
        var festivalBurst = false
        var contractDoneBurst = false
        var goalClaimBurst = false
        var rivalBeatBurst = false
        var prestigeBurst = false
        var trophySetBurst = false
        var harborTravelBurst = false
        var hireBurst = false
        var loanBurst = false
        var decorBurst = false
        var cosmeticBurst = false
        var endgameTierBurst = false
        var endgameChallengeBurst = false
        var contractAcceptBurst = false
        var baitBurst = false
        var fullUnlockBurst = false
        var castStrikeBurst = false
        var spoilBurst = false
        var machineBreakBurst = false
        var machineBreakStationId: String? = null
        var roastReadyBurst = false
        var roastReadyStationId: String? = null
        var fermentReadyBurst = false
        var fermentReadyStationId: String? = null
        var schoolFlashBurst = false
        var prevSpoilWarn = (sink.latestView?.bagSpoilPressurePermille ?: 0) > VfxJuice5.CRITICAL_PERMILLE
        var prevServiceQueue = (sink.latestView?.serviceQueuePressurePermille ?: 0) >= VfxJuice5.RISING_PERMILLE
        var prevDeadline =
            (sink.latestView?.ticksUntilNearestContractDeadline ?: Int.MAX_VALUE) <= VfxJuice5.CONTRACT_DEADLINE_WARN_TICKS
        var prevQuestNear =
            (sink.latestView?.nextQuestProgressPermille ?: 0) >= VfxJuice5.QUEST_NEAR_COMPLETE_PERMILLE
        val prevTide = sink.latestView?.tidePhaseId.orEmpty()
        val prevNight = prevTide == "night" || prevTide == "dusk"
        val prevPlacements = sink.latestView?.decorPlacements?.size ?: 0
        var prevNestSettle = prevPlacements >= VfxJuice6.SETTLED_MIN_PLACEMENTS
        var prevAuroraCrest = prevNight && prevPlacements >= VfxJuice6.ROOSTING_MIN_PLACEMENTS
        for (e in events) {
            sfxFromEvent(e)?.let { sink.audio.play(it) }
            when (e) {
                is GameEvent.ItemsTransferred -> transferred += e
                is GameEvent.BatchCompleted -> {
                    machineDone += e.stationId
                    sink.pendingShakes.offer(ShakeKind.CUT)
                    val machine = s.state.machines.firstOrNull { it.stationId == e.stationId }
                    val mid = machine?.machineId.orEmpty()
                    if (mid.contains("roaster")) {
                        roastReadyBurst = true
                        roastReadyStationId = e.stationId
                        sink.audio.play(SfxCue.ROAST_READY)
                    } else if (mid.contains("fermenter")) {
                        fermentReadyBurst = true
                        fermentReadyStationId = e.stationId
                        sink.audio.play(SfxCue.FERMENT_READY)
                    }
                }
                is GameEvent.SaleCommitted -> {
                    val tip = when {
                        e.tipped && e.preferenceMet -> " Premium tip!"
                        !e.preferenceMet -> " (substituted)"
                        else -> ""
                    }
                    sink.emitMessage("+${e.coins} coins$tip")
                    payCustomers += e.customerId
                    sink.pendingShakes.offer(ShakeKind.SALE)
                    transaction = true
                }
                is GameEvent.FishCaught -> {
                    catchCount += 1
                    sink.pendingShakes.offer(ShakeKind.CATCH)
                    val tide = WeatherSystem.tidePhaseAt(s.content, s.state.tick).id
                    if (tide == "night" || tide == "dusk") {
                        schoolFlashBurst = true
                        sink.audio.play(SfxCue.SCHOOL_FLASH)
                    }
                    if (e.personalBest) {
                        val name = s.content.itemName(e.speciesId)
                        sink.emitMessage("New trophy: $name · ${e.sizePermille}%")
                        celebrate = true
                        transaction = true
                    } else if (e.timingBonus) {
                        val tip = s.content.speciesById[e.speciesId]?.baseValue ?: 0L
                        sink.emitMessage("Perfect reel! +$tip")
                        celebrate = true
                        transaction = true
                    }
                    if (e.rareUpgrade) {
                        sink.emitMessage("Rare catch: ${s.content.speciesById[e.speciesId]?.name ?: e.speciesId}")
                        celebrate = true
                        transaction = true
                    }
                }
                is GameEvent.TrophySetCompleted -> {
                    val setName = s.content.trophySetsById[e.setId]?.name ?: e.setId
                    sink.emitMessage("Gallery complete: $setName")
                    trophySetBurst = true
                    transaction = true
                }
                is GameEvent.CoinGoalReached -> {
                    sink.emitMessage("Coin goal reached!")
                    celebrate = true
                    transaction = true
                }
                is GameEvent.FishingSpotDepleted -> {
                    sink.emitMessage("Pier empty — fish are returning")
                    transaction = true
                }
                is GameEvent.RushStarted -> {
                    sink.emitMessage("${e.name}!")
                    celebrate = true
                    transaction = true
                }
                is GameEvent.MachineIdleAlert -> {
                    val name = s.content.machinesById[e.machineId]?.name ?: e.stationId
                    sink.emitMessage("$name: ${e.reason}")
                    transaction = true
                }
                is GameEvent.UpgradePurchased -> if (!e.replayed) {
                    sink.emitMessage("Bought ${s.content.upgradesById[e.upgradeId]?.name ?: e.upgradeId}")
                    transaction = true
                }
                is GameEvent.FullHarborUnlockGranted -> if (!e.replayed) {
                    sink.emitMessage("All harbors unlocked")
                    fullUnlockBurst = true
                    transaction = true
                }
                is GameEvent.IapCosmeticGranted -> if (!e.replayed) {
                    sink.emitMessage("Unlocked ${e.cosmeticId}")
                    cosmeticBurst = true
                    transaction = true
                }
                is GameEvent.DecorPlaced -> sink.emitMessage(
                    "${if (e.moved) "Moved" else "Placed"} ${s.content.decorById[e.decorId]?.name ?: e.decorId}",
                )
                is GameEvent.DecorStored -> sink.emitMessage("Stored ${s.content.decorById[e.decorId]?.name ?: e.decorId}")
                is GameEvent.DecorPlaceRejected -> sink.emitMessage(e.reason)
                is GameEvent.DecorPurchased -> if (!e.replayed) {
                    sink.emitMessage("Decor: ${s.content.decorById[e.decorId]?.name ?: e.decorId}")
                    decorBurst = true
                    transaction = true
                }
                is GameEvent.EndgameTierUnlocked -> {
                    sink.emitMessage("Endgame tier unlocked (+${e.coinsRewarded})")
                    endgameTierBurst = true
                    transaction = true
                }
                is GameEvent.EndgameChallengeCompleted -> {
                    sink.emitMessage("Endgame challenge cleared (+${e.coinsRewarded})")
                    endgameChallengeBurst = true
                    transaction = true
                }
                is GameEvent.BaitPurchased -> if (!e.replayed) {
                    sink.emitMessage("Bait purchased")
                    baitBurst = true
                    transaction = true
                }
                is GameEvent.MachineBroke -> {
                    sink.emitMessage("Machine broke: ${s.content.machinesById[e.machineId]?.name ?: e.stationId}")
                    machineBreakBurst = true
                    machineBreakStationId = e.stationId
                    transaction = true
                }
                is GameEvent.CastStrikeReel -> {
                    castStrikeBurst = true
                }
                is GameEvent.IapCosmeticRejected -> {
                    sink.emitMessage(e.reason)
                    transaction = true
                }
                is GameEvent.PurchaseRejected -> { sink.emitMessage(e.reason); transaction = true }
                is GameEvent.WorkerHired -> if (!e.replayed) {
                    sink.emitMessage("Hired ${s.content.workersById[e.roleId]?.name ?: e.roleId}")
                    hireBurst = true
                    transaction = true
                }
                is GameEvent.RivalMarketOpened -> {
                    sink.emitMessage("Rival open: ${e.name}")
                    transaction = true
                }
                is GameEvent.RivalSaleStolen -> {
                    sink.emitMessage("Rival stole a sale")
                    transaction = true
                }
                is GameEvent.RivalBeaten -> {
                    sink.emitMessage("Rival beaten!")
                    rivalBeatBurst = true
                    transaction = true
                }
                is GameEvent.LoanTaken -> if (!e.replayed) {
                    sink.emitMessage("Loan +${e.principal}")
                    loanBurst = true
                    transaction = true
                }
                is GameEvent.WorkerLeveledUp -> {
                    val name = s.content.workersById[e.roleId]?.name ?: e.roleId
                    sink.emitMessage("$name reached level ${e.level}")
                }
                is GameEvent.WorkerShiftChanged -> {
                    val name = s.content.workersById[e.roleId]?.name ?: e.roleId
                    sink.emitMessage(if (e.onShift) "$name on shift" else "$name off shift")
                }
                is GameEvent.HireRejected -> { sink.emitMessage(e.reason); transaction = true }
                is GameEvent.WagesPaid -> {
                    sink.emitMessage("Paid ${e.coins} coins in wages")
                    transaction = true
                }
                is GameEvent.QuestCompleted -> {
                    val name = s.content.questsById[e.questId]?.name ?: e.questId
                    val tip = buildString {
                        append("Goal complete: $name")
                        if (e.coinsRewarded > 0) append(" (+${e.coinsRewarded})")
                    }
                    sink.emitMessage(tip)
                    transaction = true
                }
                is GameEvent.PrestigeUnlocked -> {
                    val name = s.content.prestigeMilestonesById[e.prestigeId]?.name ?: e.prestigeId
                    val tip = buildString {
                        append("Prestige: $name")
                        if (e.coinsRewarded > 0) append(" (+${e.coinsRewarded})")
                    }
                    sink.emitMessage(tip)
                    prestigeBurst = true
                    transaction = true
                }
                is GameEvent.AchievementUnlocked -> {
                    val name = s.content.achievementsById[e.achievementId]?.name ?: e.achievementId
                    val tip = buildString {
                        append("Achievement: $name")
                        if (e.coinsRewarded > 0) append(" (+${e.coinsRewarded})")
                    }
                    sink.emitMessage(tip)
                    achievementBurst = true
                    transaction = true
                }
                is GameEvent.SeasonalEventStarted -> {
                    sink.emitMessage("${e.name}!")
                    festivalBurst = true
                    transaction = true
                }
                is GameEvent.WeatherChanged -> sink.emitMessage("Weather: ${e.name}")
                is GameEvent.TideChanged -> sink.emitMessage("Tide: ${e.name}")
                is GameEvent.MasteryLevelUp -> {
                    val name = s.content.speciesById[e.speciesId]?.name ?: e.speciesId
                    sink.emitMessage("Mastery: $name Lv ${e.level}")
                }
                is GameEvent.WorkerBranchUnlocked -> {
                    val name = s.content.staffBranchesById[e.branchId]?.name ?: e.branchId
                    sink.emitMessage("Unlocked $name")
                }
                is GameEvent.WorkerBranchTrainRejected -> {
                    sink.emitMessage(e.reason)
                    transaction = true
                }
                is GameEvent.ContractAccepted -> if (!e.replayed) {
                    sink.emitMessage("Contract accepted")
                    contractAcceptBurst = true
                    transaction = true
                }
                is GameEvent.ContractCompleted -> {
                    sink.emitMessage("Contract complete +${e.payout}")
                    contractDoneBurst = true
                    transaction = true
                }
                is GameEvent.ContractFailed -> {
                    sink.emitMessage(
                        if (e.penaltyPaid > 0) "Contract failed −${e.penaltyPaid}" else "Contract failed",
                    )
                    transaction = true
                }
                is GameEvent.ContractRejected -> { sink.emitMessage(e.reason); transaction = true }
                is GameEvent.DailyGoalClaimed -> if (!e.replayed) {
                    val name = s.content.dailyObjectivesById[e.objectiveId]?.name ?: e.objectiveId
                    sink.emitMessage("Daily claimed: $name (+${e.payout})")
                    goalClaimBurst = true
                    transaction = true
                }
                is GameEvent.DailyGoalRejected -> { sink.emitMessage(e.reason); transaction = true }
                is GameEvent.HarborTraveled -> if (!e.replayed) {
                    val name = s.content.harborsById[e.toHarborId]?.name ?: e.toHarborId
                    sink.emitMessage("Traveled to $name")
                    sink.panels.close(ShellPanelId.MAP)
                    sink.flyingTransfers.clear()
                    sink.worldBursts.clear()
                    sink.pendingShakes.clear()
                    harborTravelBurst = true
                    transaction = true
                }
                is GameEvent.TravelRejected -> { sink.emitMessage(e.reason); transaction = true }
                is GameEvent.MaintenancePaid -> {
                    sink.emitMessage("Upkeep −${e.coins} coins")
                    transaction = true
                }
                is GameEvent.ItemsSpoiled -> {
                    val n = e.items.sumOf { it.quantity }
                    val where = if (e.location == "bag") "in bag" else "on counter"
                    sink.emitMessage("Spoiled $n $where")
                    spoilBurst = true
                    transaction = true
                }
                is GameEvent.CheckpointRequested -> sink.save()
                else -> Unit
            }
        }
        sink.latestView = s.view()
        sink.syncMusicBed()
        val view = sink.latestView
        if (view != null) {
            for (e in transferred) {
                resolveFlyingTransfer(view, e.from, e.to, e.itemId)?.let { sink.flyingTransfers.offer(it) }
            }
            repeat(catchCount) { sink.worldBursts.offer(resolveCatchBurst(view)) }
            for (customerId in payCustomers) sink.worldBursts.offer(resolvePayBurst(view, customerId))
            for (stationId in machineDone) {
                resolveMachineDoneBurst(view, stationId)?.let { sink.worldBursts.offer(it) }
            }
            if (celebrate) {
                sink.worldBursts.offer(resolveCelebrateBurst(view))
                sink.pendingShakes.offer(ShakeKind.CELEBRATE)
            }
            // Finish 2.0 Phase 22 + Finish 3.0 Phase 24 visual juice (shared burst pool).
            if (achievementBurst) {
                sink.worldBursts.offer(resolveAchievementBurst(view))
                sink.pendingShakes.offer(ShakeKind.ACHIEVEMENT)
            }
            if (festivalBurst) {
                sink.worldBursts.offer(resolveFestivalBurst(view))
                sink.pendingShakes.offer(ShakeKind.FESTIVAL)
            }
            if (contractDoneBurst) sink.worldBursts.offer(resolveContractDoneBurst(view))
            if (goalClaimBurst) sink.worldBursts.offer(resolveGoalClaimBurst(view))
            if (rivalBeatBurst) {
                sink.worldBursts.offer(resolveRivalBeatBurst(view))
                sink.pendingShakes.offer(ShakeKind.RIVAL_BEAT)
            }
            if (prestigeBurst) {
                sink.worldBursts.offer(resolvePrestigeBurst(view))
                sink.pendingShakes.offer(ShakeKind.PRESTIGE)
            }
            if (trophySetBurst) sink.worldBursts.offer(resolveTrophySetBurst(view))
            if (harborTravelBurst) sink.worldBursts.offer(resolveHarborTravelBurst(view))
            if (hireBurst) sink.worldBursts.offer(resolveHireBurst(view))
            if (loanBurst) sink.worldBursts.offer(resolveLoanBurst(view))
            // Finish 4.0 Phase 23 visual juice.
            if (decorBurst) sink.worldBursts.offer(resolveDecorBurst(view))
            if (cosmeticBurst) sink.worldBursts.offer(resolveCosmeticBurst(view))
            if (endgameTierBurst) {
                sink.worldBursts.offer(resolveEndgameTierBurst(view))
                sink.pendingShakes.offer(ShakeKind.ENDGAME_TIER)
            }
            if (endgameChallengeBurst) {
                sink.worldBursts.offer(resolveEndgameChallengeBurst(view))
                sink.pendingShakes.offer(ShakeKind.ENDGAME_CHALLENGE)
            }
            if (contractAcceptBurst) sink.worldBursts.offer(resolveContractAcceptBurst(view))
            if (baitBurst) sink.worldBursts.offer(resolveBaitBurst(view))
            if (fullUnlockBurst) sink.worldBursts.offer(resolveFullUnlockBurst(view))
            // Finish 5.0 Phase 12 visual juice.
            if (castStrikeBurst) {
                sink.worldBursts.offer(resolveCastStrikeBurst(view))
                sink.pendingShakes.offer(ShakeKind.CAST_STRIKE)
            }
            if (spoilBurst) sink.worldBursts.offer(resolveSpoilBurst(view))
            if (machineBreakBurst) sink.worldBursts.offer(resolveMachineBreakBurst(view, machineBreakStationId))
            val spoilWarn = view.bagSpoilPressurePermille > VfxJuice5.CRITICAL_PERMILLE
            val serviceQueue = view.serviceQueuePressurePermille >= VfxJuice5.RISING_PERMILLE
            val deadline =
                (view.ticksUntilNearestContractDeadline ?: Int.MAX_VALUE) <= VfxJuice5.CONTRACT_DEADLINE_WARN_TICKS
            val questNear =
                (view.nextQuestProgressPermille ?: 0) >= VfxJuice5.QUEST_NEAR_COMPLETE_PERMILLE
            if (spoilWarn && !prevSpoilWarn) sink.audio.play(SfxCue.SPOIL_WARN)
            if (serviceQueue && !prevServiceQueue) sink.audio.play(SfxCue.SERVICE_QUEUE)
            if (deadline && !prevDeadline) {
                sink.audio.play(SfxCue.CONTRACT_DEADLINE)
                sink.worldBursts.offer(resolveContractDeadlineBurst(view))
                sink.pendingShakes.offer(ShakeKind.CONTRACT_DEADLINE)
            }
            if (questNear && !prevQuestNear) {
                sink.audio.play(SfxCue.QUEST_NEAR)
                sink.worldBursts.offer(resolveQuestNearBurst(view))
            }
            // Finish 6.0 Phase 12 visual juice.
            if (roastReadyBurst) {
                sink.worldBursts.offer(resolveRoastReadyBurst(view, roastReadyStationId))
            }
            if (fermentReadyBurst) {
                sink.worldBursts.offer(resolveFermentReadyBurst(view, fermentReadyStationId))
            }
            if (schoolFlashBurst) sink.worldBursts.offer(resolveSchoolFlashBurst(view))
            val nestTide = view.tidePhaseId
            val nestNight = nestTide == "night" || nestTide == "dusk"
            val nestPlacements = view.decorPlacements.size
            val nestSettle = nestPlacements >= VfxJuice6.SETTLED_MIN_PLACEMENTS
            val auroraCrest = nestNight && nestPlacements >= VfxJuice6.ROOSTING_MIN_PLACEMENTS
            if (nestSettle && !prevNestSettle) {
                sink.audio.play(SfxCue.NEST_SETTLE)
                sink.worldBursts.offer(resolveNestSettleBurst(view))
                sink.pendingShakes.offer(ShakeKind.NEST_SETTLE)
            }
            if (auroraCrest && !prevAuroraCrest) {
                sink.audio.play(SfxCue.AURORA_CREST)
                sink.worldBursts.offer(resolveAuroraCrestBurst(view))
                sink.pendingShakes.offer(ShakeKind.AURORA_CREST)
            }
        }
        if (transaction) sink.publish(force = true)
    }
}
