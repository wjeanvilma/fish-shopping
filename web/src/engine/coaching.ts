/**
 * First-session / empty-state coaching for the HUD (Phase 30 / Phase 6 Act II tips).
 * Presentation-only: never mutates state. Mirrors game-core Coaching.kt.
 */
import type { ContentPack } from "./content";
import { Stats, type GameState } from "./state";
import { EconomySystem, ProgressionSystem, ReputationSystem } from "./systems";

export interface ObjectiveView {
  /** Short label: NEXT / GOAL / TIP */
  eyebrow: string;
  text: string;
  /** Optional progress like "2/7" for tutorial steps. */
  detail?: string | null;
}

export function coachingObjective(content: ContentPack, state: GameState): ObjectiveView | null {
  const tutorial = content.tutorial;
  if (state.tutorialIndex < tutorial.length) {
    const step = tutorial[state.tutorialIndex]!;
    return {
      eyebrow: "NEXT",
      text: step.text,
      detail: `${state.tutorialIndex + 1}/${tutorial.length}`,
    };
  }

  const activeQuest = content.quests.find(
    (q) => !state.completedQuests.has(q.id) && ProgressionSystem.requirementsMet(state, q),
  );
  if (activeQuest) {
    const progress = Math.min(state.stat(activeQuest.goal.stat), activeQuest.goal.atLeast);
    return {
      eyebrow: "GOAL",
      text: activeQuest.description,
      detail: `${progress}/${activeQuest.goal.atLeast}`,
    };
  }

  const tip = emptyStateTip(content, state);
  if (!tip) return null;
  return { eyebrow: "TIP", text: tip };
}

/** Situational empty-state hints after the scripted tutorial. */
export function emptyStateTip(content: ContentPack, state: GameState): string | null {
  const bag = state.player.bag;
  if (bag.usedUnits() >= bag.capacityUnits && bag.usedUnits() > 0) {
    return "Bag full — deliver fish to a station pad";
  }
  const waiting = state.customers.filter((c) => c.arrived).length;
  const stocked = state.counters.reduce((n, c) => n + c.stock.usedUnits(), 0);
  if (waiting > 0 && stocked === 0) {
    return "Customers are waiting — stock the counter with portions";
  }
  const hasOutput = state.machines.some((m) => m.output.usedUnits() > 0);
  if (hasOutput && bag.usedUnits() === 0) {
    return "Collect finished portions from a station output pad";
  }
  if (bag.usedUnits() === 0 && state.stat(Stats.FISH_CAUGHT) === 0) {
    return "Walk to the pier end and cast to catch fish";
  }
  if (
    bag.contents().some(([id]) => id.startsWith("species.")) &&
    state.stat(Stats.MACHINE_INPUTS) === 0
  ) {
    return "Drop raw fish on a teal input pad to start cutting";
  }

  const bagHasProducts = bag.contents().some(([id, qty]) => qty > 0 && content.productsById.has(id));
  if (stocked === 0 && (bagHasProducts || hasOutput) && state.stat(Stats.FISH_CAUGHT) > 0) {
    return "Counter is empty — stock portions before the next customer";
  }

  const rep = content.reputation;
  const encounters = ReputationSystem.encounters(state);
  if (encounters >= rep.minSample) {
    const lostRatio = Math.trunc((ReputationSystem.abandoned(state) * 1000) / encounters);
    if (lostRatio >= rep.coachingLostRatioPermille) {
      return "Customers are walking out — keep the counter stocked and staffed";
    }
    const sales = ReputationSystem.served(state);
    if (sales > 0) {
      const unmetRatio = Math.trunc((state.stat(Stats.UNMET_PREFERENCE_SALES) * 1000) / sales);
      if (unmetRatio >= 300) {
        return "Guests notice missing favorites — stock preferred products";
      }
    }
  }

  if (
    state.completedQuests.has("quest.first_ten_sales") &&
    !state.completedQuests.has("quest.first_hire") &&
    state.workers.length === 0
  ) {
    return "No staff yet — hire a fisher or porter from the Staff panel";
  }

  const contractsUnlocked = content.contracts.requires.every(
    (id) => state.ownedUpgrades.has(id) || state.completedQuests.has(id),
  );
  if (
    contractsUnlocked &&
    state.activeContracts.length === 0 &&
    state.contractOffers.length > 0 &&
    state.stat(Stats.CONTRACTS_COMPLETED) === 0
  ) {
    return "No active jobs — take a harbor contract from the Jobs board";
  }

  if (EconomySystem.unlocked(content, state)) {
    const fragileOnCounter = state.counters.some((counter) =>
      counter.stock.contents().some(([id, qty]) => qty > 0 && EconomySystem.spoilTier(content, id) >= 3),
    );
    if (fragileOnCounter && !state.ownedUpgrades.has("upgrade.display_case_ice")) {
      return "Fragile counter stock spoils first — buy display case ice";
    }
    const fishInBag = bag.contents().some(([id, qty]) => qty > 0 && content.speciesById.has(id));
    if (fishInBag && !state.ownedUpgrades.has("upgrade.ice_box")) {
      return "Raw fish in your bag will spoil — buy an ice box";
    }
    if (stocked >= 8 && waiting === 0) {
      return "Counter stock is aging — sell before the next spoil cycle";
    }
  }

  if (
    encounters >= rep.minSample &&
    ReputationSystem.scorePermille(content, state) >= rep.coachingPraiseScorePermille
  ) {
    return "Harbor reviews are glowing — keep preferred stock filled";
  }
  return null;
}
