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
    expect(emptyStateTip(content, state)).toBeNull();
  });

  it("warns about fragile counter spoil pressure", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    state.tutorialIndex = content.tutorial.length;
    for (const q of content.quests) state.completedQuests.add(q.id);
    state.bumpStat(Stats.FISH_CAUGHT, 5);
    state.bumpStat(Stats.MACHINE_INPUTS, 2);
    state.counters[0]!.stock.add("product.basic_portion", 2);
    expect(emptyStateTip(content, state)).toMatch(/display case ice/i);
  });
});
