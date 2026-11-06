/**
 * Offline catch-up. Mirrors game-core sim/OfflineEarnings.kt.
 * Manual actions never happen while absent — player zone is cleared for the run.
 */
import { OfflinePolicy, type OfflineReport } from "./foundations";
import type { Simulation } from "./simulation";
import { Stats } from "./state";
import { MS_PER_TICK } from "./foundations";

export function applyOffline(sim: Simulation, elapsedMillis: number): OfflineReport {
  const cap = OfflinePolicy.capTicks(sim.content);
  const ticks = OfflinePolicy.creditedTicks(elapsedMillis, cap);
  const uncapped = elapsedMillis <= 0 ? 0 : Math.floor(elapsedMillis / MS_PER_TICK);
  const beforeCoins = sim.state.coins;
  const beforeFish = sim.state.stat(Stats.FISH_CAUGHT);
  const beforeSales = sim.state.stat(Stats.SALES);
  const beforeItems = sim.state.stat(Stats.ITEMS_SOLD);
  const beforeWorkerFish = sim.state.stat(Stats.WORKER_FISH_CAUGHT);
  const beforeWorkerMoved = sim.state.stat(Stats.WORKER_ITEMS_MOVED);

  if (ticks > 0) {
    const player = sim.state.player;
    const savedZone = player.zoneId;
    const savedSpecies = player.fishingSpecies;
    const savedProgress = player.fishingProgress;
    const savedCatchTicks = player.fishingCatchTicks;
    const savedReel = player.reelAttemptedThisCast;
    player.zoneId = null;
    player.fishingSpecies = null;
    player.fishingProgress = 0;
    player.fishingCatchTicks = 0;
    player.reelAttemptedThisCast = false;
    player.reelRequested = false;
    for (let i = 0; i < ticks; i++) sim.step([]);
    player.zoneId = savedZone;
    player.fishingSpecies = savedSpecies;
    player.fishingProgress = savedProgress;
    player.fishingCatchTicks = savedCatchTicks;
    player.reelAttemptedThisCast = savedReel;
  }

  const coinsDelta = sim.state.coins - beforeCoins;
  const fishCaught = sim.state.stat(Stats.FISH_CAUGHT) - beforeFish;
  const sales = sim.state.stat(Stats.SALES) - beforeSales;
  const itemsSold = sim.state.stat(Stats.ITEMS_SOLD) - beforeItems;
  const workerFishCaught = sim.state.stat(Stats.WORKER_FISH_CAUGHT) - beforeWorkerFish;
  const workerItemsMoved = sim.state.stat(Stats.WORKER_ITEMS_MOVED) - beforeWorkerMoved;

  return {
    elapsedMillis: Math.max(0, elapsedMillis),
    ticksCredited: ticks,
    capped: uncapped > cap,
    coinsDelta,
    fishCaught,
    sales,
    itemsSold,
    workerFishCaught,
    workerItemsMoved,
    hadActivity: coinsDelta !== 0 || fishCaught > 0 || sales > 0 || workerFishCaught > 0 || workerItemsMoved > 0,
  };
}
