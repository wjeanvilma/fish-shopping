/**
 * Finish 4.0 Phase 6 — GameHost sim-step event bus (SFX + VFX cue enqueue).
 */
import type { Command, Simulation } from "../../engine";
import { buildView } from "../../engine";
import type { AudioBus } from "../../audio/audioBus";
import { sfxFromEvent } from "../../audio/sfxCues";
import { sharedAnalyticsBus } from "../../analytics/analyticsBus";
import type { ShellPanelController } from "../../shell/shellPanels";
import {
  resolveAchievementBurst,
  resolveBaitBurst,
  resolveCastStrikeBurst,
  resolveCatchBurst,
  resolveCelebrateBurst,
  resolveContractAcceptBurst,
  resolveContractDoneBurst,
  resolveCosmeticBurst,
  resolveDecorBurst,
  resolveEndgameChallengeBurst,
  resolveEndgameTierBurst,
  resolveFestivalBurst,
  resolveFlyingTransfer,
  resolveFullUnlockBurst,
  resolveGoalClaimBurst,
  resolveHarborTravelBurst,
  resolveHireBurst,
  resolveLoanBurst,
  resolveMachineBreakBurst,
  resolveMachineDoneBurst,
  resolvePayBurst,
  resolvePrestigeBurst,
  resolveRivalBeatBurst,
  resolveSpoilBurst,
  resolveTrophySetBurst,
  type FlyingTransferCue,
  type ShakeKind,
  type WorldBurstCue,
} from "../../render/presenters";
import type { SimView } from "../../engine";

export type HostStepSink = {
  say: (msg: string) => void;
  save: () => void;
  publish: (force: boolean) => void;
  syncMusicBed: () => void;
  audio: AudioBus;
  panels: ShellPanelController;
  pendingFlying: FlyingTransferCue[];
  pendingBursts: WorldBurstCue[];
  pendingShakes: ShakeKind[];
  setLatestView: (v: SimView) => void;
};

/** Drain commands through the sim and enqueue audio/VFX cues. */
export function processHostStep(
  sim: Simulation,
  commands: Command[],
  sink: HostStepSink,
): void {
    const batch = commands.splice(0);
    let transaction = false;
    const transferred: { from: string; to: string; itemId: string }[] = [];
    const payCustomers: string[] = [];
    const machineDone: string[] = [];
    let celebrate = false;
    let catchCount = 0;
    let achievementBurst = false;
    let festivalBurst = false;
    let contractDoneBurst = false;
    let goalClaimBurst = false;
    let rivalBeatBurst = false;
    let prestigeBurst = false;
    let trophySetBurst = false;
    let harborTravelBurst = false;
    let hireBurst = false;
    let loanBurst = false;
    let decorBurst = false;
    let cosmeticBurst = false;
    let endgameTierBurst = false;
    let endgameChallengeBurst = false;
    let contractAcceptBurst = false;
    let baitBurst = false;
    let fullUnlockBurst = false;
    let castStrikeBurst = false;
    let spoilBurst = false;
    let machineBreakBurst = false;
    let machineBreakStationId: string | undefined;
    const events = sim.step(batch);
    sharedAnalyticsBus.onGameEvents(events, sim.state);
    for (const e of events) {
      const cue = sfxFromEvent(e);
      if (cue) sink.audio.play(cue);
      switch (e.type) {
        case "items_transferred":
          transferred.push({ from: e.from, to: e.to, itemId: e.itemId });
          break;
        case "batch_completed":
          machineDone.push(e.stationId);
          sink.pendingShakes.push("cut");
          break;
        case "sale_committed": {
          const tip = e.preferenceMet === false ? " (substituted)"
            : (e.priceMultPermille ?? 1000) > 1000 ? " Premium tip!" : "";
          sink.say(`+${e.coins} coins${tip}`);
          payCustomers.push(e.customerId);
          sink.pendingShakes.push("sale");
          transaction = true;
          break;
        }
        case "fish_caught":
          catchCount += 1;
          sink.pendingShakes.push("catch");
          if (e.personalBest) {
            const name = sim.content.itemName(e.speciesId);
            sink.say(`New trophy: ${name} · ${e.sizePermille}%`);
            celebrate = true;
            transaction = true;
          } else if (e.timingBonus) {
            const tip = sim.content.speciesById.get(e.speciesId)?.baseValue ?? 0;
            sink.say(`Perfect reel! +${tip}`);
            celebrate = true;
            transaction = true;
          }
          if (e.rareUpgrade) {
            sink.say(`Rare catch: ${sim.content.speciesById.get(e.speciesId)?.name ?? e.speciesId}`);
            celebrate = true;
            transaction = true;
          }
          break;
        case "trophy_set_completed": {
          const setName = sim.content.trophySetsById.get(e.setId)?.name ?? e.setId;
          sink.say(`Gallery complete: ${setName}`);
          trophySetBurst = true;
          transaction = true;
          break;
        }
        case "coin_goal_reached":
          sink.say(`Coin goal reached!`);
          celebrate = true;
          transaction = true;
          break;
        case "fishing_spot_depleted":
          sink.say("Pier empty — fish are returning");
          transaction = true;
          break;
        case "rush_started":
          sink.say(`${e.name}!`);
          celebrate = true;
          transaction = true;
          break;
        case "machine_idle_alert": {
          const name = sim.content.machinesById.get(e.machineId)?.name ?? e.stationId;
          sink.say(`${name}: ${e.reason}`);
          transaction = true;
          break;
        }
        case "upgrade_purchased":
          if (!e.replayed) { sink.say(`Bought ${sim.content.upgradesById.get(e.upgradeId)?.name ?? e.upgradeId}`); transaction = true; }
          break;
        case "full_harbor_unlock_granted":
          if (!e.replayed) {
            sink.say("All harbors unlocked");
            fullUnlockBurst = true;
            transaction = true;
          }
          break;
        case "iap_cosmetic_granted":
          if (!e.replayed) {
            sink.say(`Unlocked ${e.cosmeticId}`);
            cosmeticBurst = true;
            transaction = true;
          }
          break;
        case "decor_purchased":
          if (!e.replayed) {
            sink.say(`Decor: ${sim.content.decorById.get(e.decorId)?.name ?? e.decorId}`);
            decorBurst = true;
            transaction = true;
          }
          break;
        case "decor_placed":
          sink.say(`${e.moved ? "Moved" : "Placed"} ${sim.content.decorById.get(e.decorId)?.name ?? e.decorId}`);
          decorBurst = true;
          transaction = true;
          break;
        case "decor_stored":
          sink.say(`Stored ${sim.content.decorById.get(e.decorId)?.name ?? e.decorId}`);
          transaction = true;
          break;
        case "decor_place_rejected":
          sink.say(e.reason);
          transaction = true;
          break;
        case "endgame_tier_unlocked":
          sink.say(`Endgame tier unlocked (+${e.coinsRewarded})`);
          endgameTierBurst = true;
          transaction = true;
          break;
        case "endgame_challenge_completed":
          sink.say(`Endgame challenge cleared (+${e.coinsRewarded})`);
          endgameChallengeBurst = true;
          transaction = true;
          break;
        case "bait_purchased":
          if (!e.replayed) {
            sink.say("Bait purchased");
            baitBurst = true;
            transaction = true;
          }
          break;
        case "machine_broke":
          sink.say(`Machine broke: ${sim.content.machinesById.get(e.machineId)?.name ?? e.stationId}`);
          machineBreakBurst = true;
          machineBreakStationId = e.stationId;
          transaction = true;
          break;
        case "cast_strike_reel":
          castStrikeBurst = true;
          break;
        case "iap_cosmetic_rejected":
          sink.say(e.reason);
          transaction = true;
          break;
        case "purchase_rejected": sink.say(e.reason); transaction = true; break;
        case "worker_hired":
          if (!e.replayed) {
            sink.say(`Hired ${sim.content.workersById.get(e.roleId)?.name ?? e.roleId}`);
            hireBurst = true;
            transaction = true;
          }
          break;
        case "worker_leveled_up": {
          const name = sim.content.workersById.get(e.roleId)?.name ?? e.roleId;
          sink.say(`${name} reached level ${e.level}`);
          break;
        }
        case "worker_shift_changed": {
          const name = sim.content.workersById.get(e.roleId)?.name ?? e.roleId;
          sink.say(e.onShift ? `${name} on shift` : `${name} off shift`);
          break;
        }
        case "hire_rejected": sink.say(e.reason); transaction = true; break;
        case "worker_branch_unlocked": {
          const name = sim.content.staffBranchesById.get(e.branchId)?.name ?? e.branchId;
          sink.say(`Unlocked ${name}`);
          transaction = true;
          break;
        }
        case "worker_branch_train_rejected":
          sink.say(e.reason);
          transaction = true;
          break;
        case "wages_paid":
          sink.say(`Paid ${e.coins} coins in wages`);
          transaction = true;
          break;
        case "quest_completed": {
          const name = sim.content.questsById.get(e.questId)?.name ?? e.questId;
          const tip = e.coinsRewarded && e.coinsRewarded > 0
            ? `Goal complete: ${name} (+${e.coinsRewarded})`
            : `Goal complete: ${name}`;
          sink.say(tip);
          transaction = true;
          break;
        }
        case "prestige_unlocked": {
          const name = sim.content.prestigeMilestonesById.get(e.prestigeId)?.name ?? e.prestigeId;
          const tip = e.coinsRewarded > 0
            ? `Prestige: ${name} (+${e.coinsRewarded})`
            : `Prestige: ${name}`;
          sink.say(tip);
          prestigeBurst = true;
          transaction = true;
          break;
        }
        case "rival_market_opened":
          sink.say(`Rival open: ${e.name}`);
          transaction = true;
          break;
        case "rival_sale_stolen":
          sink.say("Rival stole a sale");
          transaction = true;
          break;
        case "rival_beaten":
          sink.say("Rival beaten!");
          rivalBeatBurst = true;
          transaction = true;
          break;
        case "loan_taken":
          if (!e.replayed) {
            sink.say(`Loan +${e.principal}`);
            loanBurst = true;
            transaction = true;
          }
          break;
        case "achievement_unlocked": {
          const name = sim.content.achievementsById.get(e.achievementId)?.name ?? e.achievementId;
          const tip = e.coinsRewarded > 0
            ? `Achievement: ${name} (+${e.coinsRewarded})`
            : `Achievement: ${name}`;
          sink.say(tip);
          achievementBurst = true;
          transaction = true;
          break;
        }
        case "seasonal_event_started":
          sink.say(`${e.name}!`);
          festivalBurst = true;
          transaction = true;
          break;
        case "weather_changed":
          sink.say(`Weather: ${e.name}`);
          break;
        case "tide_changed":
          sink.say(`Tide: ${e.name}`);
          break;
        case "mastery_level_up": {
          const name = sim.content.speciesById.get(e.speciesId)?.name ?? e.speciesId;
          sink.say(`Mastery: ${name} Lv ${e.level}`);
          break;
        }
        case "contract_accepted":
          if (!e.replayed) {
            sink.say("Contract accepted");
            contractAcceptBurst = true;
            transaction = true;
          }
          break;
        case "contract_completed":
          sink.say(`Contract complete +${e.payout}`);
          contractDoneBurst = true;
          transaction = true;
          break;
        case "contract_failed":
          sink.say(e.penaltyPaid > 0 ? `Contract failed −${e.penaltyPaid}` : "Contract failed");
          transaction = true;
          break;
        case "contract_rejected": sink.say(e.reason); transaction = true; break;
        case "daily_goal_claimed":
          if (!e.replayed) {
            const name = sim.content.dailyObjectivesById.get(e.objectiveId)?.name ?? e.objectiveId;
            sink.say(`Daily claimed: ${name} (+${e.payout})`);
            goalClaimBurst = true;
            transaction = true;
          }
          break;
        case "daily_goal_rejected": sink.say(e.reason); transaction = true; break;
        case "harbor_traveled":
          if (!e.replayed) {
            const name = sim.content.harborsById.get(e.toHarborId)?.name ?? e.toHarborId;
            sink.say(`Traveled to ${name}`);
            sink.panels.close("map");
            sink.pendingFlying.length = 0;
            sink.pendingBursts.length = 0;
            sink.pendingShakes.length = 0;
            harborTravelBurst = true;
            transaction = true;
          }
          break;
        case "travel_rejected": sink.say(e.reason); transaction = true; break;
        case "maintenance_paid":
          sink.say(`Upkeep −${e.coins} coins`);
          transaction = true;
          break;
        case "items_spoiled": {
          const n = e.items.reduce((sum, it) => sum + it.quantity, 0);
          sink.say(`Spoiled ${n} ${e.location === "bag" ? "in bag" : "on counter"}`);
          spoilBurst = true;
          transaction = true;
          break;
        }
        case "checkpoint_requested": sink.save(); break;
        default: break;
      }
    }
    const latestView = buildView(sim);
    sink.setLatestView(latestView);
    sink.syncMusicBed();
    const view = latestView;
    if (view) {
      for (const t of transferred) {
        const cue = resolveFlyingTransfer(view, t.from, t.to, t.itemId);
        if (cue) sink.pendingFlying.push(cue);
      }
      for (let i = 0; i < catchCount; i++) sink.pendingBursts.push(resolveCatchBurst(view));
      for (const customerId of payCustomers) sink.pendingBursts.push(resolvePayBurst(view, customerId));
      for (const stationId of machineDone) {
        const cue = resolveMachineDoneBurst(view, stationId);
        if (cue) sink.pendingBursts.push(cue);
      }
      if (celebrate) {
        sink.pendingBursts.push(resolveCelebrateBurst(view));
        sink.pendingShakes.push("celebrate");
      }
      // Finish 2.0 Phase 22 + Finish 3.0 Phase 24 visual juice (shared burst pool).
      if (achievementBurst) {
        sink.pendingBursts.push(resolveAchievementBurst(view));
        sink.pendingShakes.push("achievement");
      }
      if (festivalBurst) {
        sink.pendingBursts.push(resolveFestivalBurst(view));
        sink.pendingShakes.push("festival");
      }
      if (contractDoneBurst) sink.pendingBursts.push(resolveContractDoneBurst(view));
      if (goalClaimBurst) sink.pendingBursts.push(resolveGoalClaimBurst(view));
      if (rivalBeatBurst) {
        sink.pendingBursts.push(resolveRivalBeatBurst(view));
        sink.pendingShakes.push("rival_beat");
      }
      if (prestigeBurst) {
        sink.pendingBursts.push(resolvePrestigeBurst(view));
        sink.pendingShakes.push("prestige");
      }
      if (trophySetBurst) sink.pendingBursts.push(resolveTrophySetBurst(view));
      if (harborTravelBurst) sink.pendingBursts.push(resolveHarborTravelBurst(view));
      if (hireBurst) sink.pendingBursts.push(resolveHireBurst(view));
      if (loanBurst) sink.pendingBursts.push(resolveLoanBurst(view));
      // Finish 4.0 Phase 23 visual juice.
      if (decorBurst) sink.pendingBursts.push(resolveDecorBurst(view));
      if (cosmeticBurst) sink.pendingBursts.push(resolveCosmeticBurst(view));
      if (endgameTierBurst) {
        sink.pendingBursts.push(resolveEndgameTierBurst(view));
        sink.pendingShakes.push("endgame_tier");
      }
      if (endgameChallengeBurst) {
        sink.pendingBursts.push(resolveEndgameChallengeBurst(view));
        sink.pendingShakes.push("endgame_challenge");
      }
      if (contractAcceptBurst) sink.pendingBursts.push(resolveContractAcceptBurst(view));
      if (baitBurst) sink.pendingBursts.push(resolveBaitBurst(view));
      if (fullUnlockBurst) sink.pendingBursts.push(resolveFullUnlockBurst(view));
      // Finish 5.0 Phase 12 visual juice.
      if (castStrikeBurst) {
        sink.pendingBursts.push(resolveCastStrikeBurst(view));
        sink.pendingShakes.push("cast_strike");
      }
      if (spoilBurst) sink.pendingBursts.push(resolveSpoilBurst(view));
      if (machineBreakBurst) {
        sink.pendingBursts.push(resolveMachineBreakBurst(view, machineBreakStationId));
      }
    }
    if (transaction) sink.publish(true);
}
