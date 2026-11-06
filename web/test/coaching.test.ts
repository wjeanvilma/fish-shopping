import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { coachingObjective, emptyStateTip, GameState, loadContent, Stats } from "../src/engine";

const content = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

describe("coaching", () => {
  it("shows tutorial NEXT with step detail", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    const obj = coachingObjective(content, state);
    expect(obj?.eyebrow).toBe("NEXT");
    expect(obj?.detail).toMatch(/^1\//);
    expect(obj?.text.toLowerCase()).toContain("pier");
  });

  it("tips when the bag is full after the tutorial", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    for (const q of content.quests) state.completedQuests.add(q.id);
    const bag = state.player.bag;
    while (bag.usedUnits() < bag.capacityUnits) bag.add("species.silver_sprat", 1);
    expect(emptyStateTip(content, state)).toMatch(/Bag full/i);
  });

  it("stays quiet when the loop is healthy", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    for (const q of content.quests) state.completedQuests.add(q.id);
    state.bumpStat(Stats.FISH_CAUGHT, 5);
    state.bumpStat(Stats.MACHINE_INPUTS, 2);
    state.bumpStat(Stats.CONTRACTS_COMPLETED, 1);
    state.ownedUpgrades.add("upgrade.display_case_ice");
    state.counters[0]!.stock.add("product.smoked_fillet", 1);
    expect(emptyStateTip(content, state)).toBeNull();
  });

  it("warns about fragile counter spoil pressure", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    for (const q of content.quests) state.completedQuests.add(q.id);
    state.bumpStat(Stats.FISH_CAUGHT, 5);
    state.bumpStat(Stats.MACHINE_INPUTS, 2);
    state.bumpStat(Stats.CONTRACTS_COMPLETED, 1);
    state.counters[0]!.stock.add("product.basic_portion", 2);
    expect(emptyStateTip(content, state)).toMatch(/display case ice/i);
  });

  it("tips when the counter is empty with portions ready", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    for (const q of content.quests) state.completedQuests.add(q.id);
    state.bumpStat(Stats.FISH_CAUGHT, 5);
    state.bumpStat(Stats.CONTRACTS_COMPLETED, 1);
    state.player.bag.add("product.basic_portion", 2);
    expect(emptyStateTip(content, state)).toMatch(/Counter is empty/i);
  });

  it("tips when staff is unlocked but none hired", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    state.completedQuests.add("quest.first_ten_sales");
    state.bumpStat(Stats.FISH_CAUGHT, 5);
    state.bumpStat(Stats.MACHINE_INPUTS, 2);
    state.counters[0]!.stock.add("product.basic_portion", 1);
    expect(emptyStateTip(content, state)).toMatch(/No staff yet/i);
  });

  it("tips when jobs board has offers but none active", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    state.completedQuests.add("quest.first_ten_sales");
    state.completedQuests.add("quest.first_hire");
    state.bumpStat(Stats.FISH_CAUGHT, 5);
    state.bumpStat(Stats.MACHINE_INPUTS, 2);
    state.counters[0]!.stock.add("product.basic_portion", 1);
    state.contractOffers.push({
      id: "offer.test",
      templateId: "contract.portion_order",
      itemId: "product.basic_portion",
      quantity: 4,
      durationTicks: 2000,
      payout: 55,
      penalty: 15,
    });
    expect(emptyStateTip(content, state)).toMatch(/No active jobs/i);
  });

  it("tips when walkouts hurt reputation", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    for (const q of content.quests) state.completedQuests.add(q.id);
    state.bumpStat(Stats.FISH_CAUGHT, 5);
    state.bumpStat(Stats.MACHINE_INPUTS, 2);
    state.bumpStat(Stats.CONTRACTS_COMPLETED, 1);
    state.ownedUpgrades.add("upgrade.display_case_ice");
    state.counters[0]!.stock.add("product.smoked_fillet", 1);
    state.bumpStat(Stats.SALES, 4);
    state.bumpStat(Stats.LOST_CUSTOMERS, 6);
    expect(emptyStateTip(content, state)).toMatch(/walking out/i);
  });
});
