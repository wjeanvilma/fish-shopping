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
  const beforeContracts = sim.state.stat(Stats.CONTRACTS_COMPLETED);
  const beforeMaintenance = sim.state.stat(Stats.MAINTENANCE_PAID);
  const beforeSpoiled = sim.state.stat(Stats.ITEMS_SPOILED);
  const beforeRivalBeats = sim.state.stat(Stats.RIVAL_BEATS);
  const beforeWages = sim.state.stat(Stats.WAGES_PAID);
  const beforeRepairs = sim.state.stat(Stats.REPAIR_SPENT);
  const beforeLoanInterest = sim.state.stat(Stats.LOAN_INTEREST_ACCRUED);
  const beforeRevenue = sim.state.stat(Stats.REVENUE);
  const beforeLoanRepaid = sim.state.stat(Stats.LOAN_REPAID);
  const beforeContractRevenue = sim.state.stat(Stats.CONTRACT_REVENUE);
  const beforeRivalStolen = sim.state.stat(Stats.RIVAL_SALES_STOLEN);
  const beforeSigils = sim.state.stat(Stats.ENDGAME_SIGILS_EARNED);

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
  const contractsCompleted = sim.state.stat(Stats.CONTRACTS_COMPLETED) - beforeContracts;
  const maintenancePaid = sim.state.stat(Stats.MAINTENANCE_PAID) - beforeMaintenance;
  const itemsSpoiled = sim.state.stat(Stats.ITEMS_SPOILED) - beforeSpoiled;
  const rivalBeats = sim.state.stat(Stats.RIVAL_BEATS) - beforeRivalBeats;
  const wagesPaid = sim.state.stat(Stats.WAGES_PAID) - beforeWages;
  const repairSpent = sim.state.stat(Stats.REPAIR_SPENT) - beforeRepairs;
  const loanInterestAccrued = sim.state.stat(Stats.LOAN_INTEREST_ACCRUED) - beforeLoanInterest;
  const revenueDelta = sim.state.stat(Stats.REVENUE) - beforeRevenue;
  const loanRepaid = sim.state.stat(Stats.LOAN_REPAID) - beforeLoanRepaid;
  const contractRevenue = sim.state.stat(Stats.CONTRACT_REVENUE) - beforeContractRevenue;
  const rivalSalesStolen = sim.state.stat(Stats.RIVAL_SALES_STOLEN) - beforeRivalStolen;
  const endgameSigilsEarned = sim.state.stat(Stats.ENDGAME_SIGILS_EARNED) - beforeSigils;

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
    contractsCompleted,
    maintenancePaid,
    itemsSpoiled,
    rivalBeats,
    wagesPaid,
    repairSpent,
    loanInterestAccrued,
    revenueDelta,
    loanRepaid,
    contractRevenue,
    rivalSalesStolen,
    endgameSigilsEarned,
    hadActivity:
      coinsDelta !== 0 || fishCaught > 0 || sales > 0 || workerFishCaught > 0 ||
      workerItemsMoved > 0 || contractsCompleted > 0 || maintenancePaid > 0 ||
      itemsSpoiled > 0 || rivalBeats > 0 || wagesPaid > 0 || repairSpent > 0 ||
      loanInterestAccrued > 0 || revenueDelta > 0 || loanRepaid > 0 ||
      contractRevenue > 0 || rivalSalesStolen > 0 || endgameSigilsEarned > 0,
  };
}
