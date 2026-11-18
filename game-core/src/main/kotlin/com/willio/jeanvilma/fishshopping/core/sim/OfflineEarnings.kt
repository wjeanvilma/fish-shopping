package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Summary of a catch-up run after the player was away (Phase 14).
 * Deltas are measured against stats/coins at the start of [applyOffline].
 */
data class OfflineReport(
    val elapsedMillis: Long,
    val ticksCredited: Long,
    val capped: Boolean,
    val coinsDelta: Long,
    val fishCaught: Long,
    val sales: Long,
    val itemsSold: Long,
    val workerFishCaught: Long,
    val workerItemsMoved: Long,
    /** Finish 4.0 Phase 21 — deeper away deltas for journal lines. */
    val contractsCompleted: Long = 0,
    val maintenancePaid: Long = 0,
    val itemsSpoiled: Long = 0,
    val rivalBeats: Long = 0,
    /** Finish 2.0 Phase 18 — narrative lines for the away summary / dashboard. */
    val journalLines: List<String> = emptyList(),
) {
    val hadActivity: Boolean
        get() = coinsDelta != 0L || fishCaught > 0L || sales > 0L ||
            workerFishCaught > 0L || workerItemsMoved > 0L ||
            contractsCompleted > 0L || maintenancePaid > 0L || itemsSpoiled > 0L ||
            rivalBeats > 0L || journalLines.isNotEmpty()
}

/**
 * Simulate [elapsedMillis] of absence with empty command batches (no player input).
 * The player's zone is cleared for the run so standing on a pier/counter does not
 * count as manual AFK labour — only hired workers / machines / customers advance.
 */
fun applyOffline(sim: Simulation, elapsedMillis: Long): OfflineReport {
    val cap = OfflinePolicy.capTicks(sim.content)
    val ticks = OfflinePolicy.creditedTicks(elapsedMillis, cap)
    val uncapped = if (elapsedMillis <= 0) 0L
    else elapsedMillis / (1000L / SimConstants.TICKS_PER_SECOND)
    val beforeCoins = sim.state.coins
    val beforeFish = sim.state.stat(Stats.FISH_CAUGHT)
    val beforeSales = sim.state.stat(Stats.SALES)
    val beforeItems = sim.state.stat(Stats.ITEMS_SOLD)
    val beforeWorkerFish = sim.state.stat(Stats.WORKER_FISH_CAUGHT)
    val beforeWorkerMoved = sim.state.stat(Stats.WORKER_ITEMS_MOVED)
    val beforeContracts = sim.state.stat(Stats.CONTRACTS_COMPLETED)
    val beforeMaintenance = sim.state.stat(Stats.MAINTENANCE_PAID)
    val beforeSpoiled = sim.state.stat(Stats.ITEMS_SPOILED)
    val beforeRivalBeats = sim.state.stat(Stats.RIVAL_BEATS)

    if (ticks > 0L) {
        val player = sim.state.player
        val savedZone = player.zoneId
        val savedSpecies = player.fishingSpecies
        val savedProgress = player.fishingProgress
        val savedCatchTicks = player.fishingCatchTicks
        val savedReel = player.reelAttemptedThisCast
        player.zoneId = null
        player.fishingSpecies = null
        player.fishingProgress = 0
        player.fishingCatchTicks = 0
        player.reelAttemptedThisCast = false
        player.reelRequested = false
        // Cap is at most a few hours of ticks; Int is fine under OFFLINE_CAP_TICKS.
        repeat(ticks.toInt()) { sim.step(emptyList()) }
        player.zoneId = savedZone
        player.fishingSpecies = savedSpecies
        player.fishingProgress = savedProgress
        player.fishingCatchTicks = savedCatchTicks
        player.reelAttemptedThisCast = savedReel
    }

    return OfflineReport(
        elapsedMillis = elapsedMillis.coerceAtLeast(0L),
        ticksCredited = ticks,
        capped = uncapped > cap,
        coinsDelta = sim.state.coins - beforeCoins,
        fishCaught = sim.state.stat(Stats.FISH_CAUGHT) - beforeFish,
        sales = sim.state.stat(Stats.SALES) - beforeSales,
        itemsSold = sim.state.stat(Stats.ITEMS_SOLD) - beforeItems,
        workerFishCaught = sim.state.stat(Stats.WORKER_FISH_CAUGHT) - beforeWorkerFish,
        workerItemsMoved = sim.state.stat(Stats.WORKER_ITEMS_MOVED) - beforeWorkerMoved,
        contractsCompleted = sim.state.stat(Stats.CONTRACTS_COMPLETED) - beforeContracts,
        maintenancePaid = sim.state.stat(Stats.MAINTENANCE_PAID) - beforeMaintenance,
        itemsSpoiled = sim.state.stat(Stats.ITEMS_SPOILED) - beforeSpoiled,
        rivalBeats = sim.state.stat(Stats.RIVAL_BEATS) - beforeRivalBeats,
    )
}
