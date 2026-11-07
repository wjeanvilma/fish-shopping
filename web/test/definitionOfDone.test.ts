/**
 * Phase 30 — blueprint Definition of Done audit for the 1.0.0 freeze.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  Simulation,
  GameState,
  buildView,
  decodeSnapshot,
  encodeSnapshot,
  loadContent,
  FullUnlockSystem,
} from "../src/engine";
import { PRIVACY_POLICY_URL, SUPPORT_URL, isHttpsAbsoluteUrl } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("definition of done (Phase 30)", () => {
  const dod = JSON.parse(
    readFileSync(resolve(root, "shared/ship/definition-of-done.json"), "utf8"),
  ) as {
    phase: number;
    schema: string;
    releaseTag: string;
    contentVersion: string;
    schemaVersion: number;
    quotas: { harbors: number; speciesMin: number; machineClasses: number };
    checks: string[];
    screensPresent: string[];
  };
  const pin = JSON.parse(
    readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
  ) as {
    contentVersion: string;
    schemaVersion: number;
    releaseTag: string;
    definitionOfDone: string;
    fixtures: string[];
  };

  it("pins 2.0.0 content + schema 23 against quotas", () => {
    expect(dod.phase).toBe(30);
    expect(dod.schema).toBe("fish.ship.definition_of_done.v1");
    expect(dod.contentVersion).toBe("2.0.0");
    expect(dod.releaseTag).toBe("v2.0.0");
    expect(content.contentVersion).toBe("2.0.0");
    expect(SCHEMA_VERSION).toBe(23);
    expect(content.harbors.length).toBe(dod.quotas.harbors);
    expect(content.harbors.length).toBe(8);
    expect(content.raw.species.length).toBeGreaterThanOrEqual(dod.quotas.speciesMin);
    expect(content.raw.machines.length).toBe(dod.quotas.machineClasses);
    expect(content.raw.quests.length).toBeGreaterThanOrEqual(20);
    expect(pin.contentVersion).toBe("2.0.0");
    expect(pin.schemaVersion).toBe(SCHEMA_VERSION);
    expect(pin.releaseTag).toBe("v2.0.0");
    expect(pin.definitionOfDone).toBe("shared/ship/definition-of-done.json");
    for (const name of pin.fixtures) {
      expect(existsSync(resolve(root, "shared/fixtures", name)), name).toBe(true);
    }
  });

  it("keeps tutorial objectives and warehouse reconcile green", () => {
    expect(content.tutorial.length).toBeGreaterThan(0);
    for (const step of content.tutorial) {
      expect(step.id).toBeTruthy();
    }
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 7));
    expect(buildView(sim).warehouse.reconcileOk).toBe(true);
    sim.state.player.bag.add("species.silver_sprat", 2);
    sim.state.machines.find((m) => m.stationId === "station.cutter_1")!.input.add("species.silver_sprat", 1);
    sim.state.counters[0]!.stock.add("product.basic_portion", 3);
    const wh = buildView(sim).warehouse;
    expect(wh.reconcileOk).toBe(true);
    expect(wh.quantity).toBe(6);
  });

  it("keeps purchase rewards idempotent and restores latest + previous snapshots", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 11));
    sim.state.coins = 100;
    const first = sim.step([{ type: "purchase_upgrade", upgradeId: "upgrade.bag_capacity_2", requestId: "dod-web" }]);
    const bought = first.filter((e) => e.type === "upgrade_purchased");
    expect(bought).toHaveLength(1);
    expect((bought[0] as { replayed: boolean }).replayed).toBe(false);
    const coinsAfter = sim.state.coins;
    const retry = sim.step([{ type: "purchase_upgrade", upgradeId: "upgrade.bag_capacity_2", requestId: "dod-web" }]);
    const replayed = retry.filter((e) => e.type === "upgrade_purchased");
    expect(replayed).toHaveLength(1);
    expect((replayed[0] as { replayed: boolean }).replayed).toBe(true);
    expect(sim.state.coins).toBe(coinsAfter);

    const latest = encodeSnapshot(content, sim.state, 1000);
    sim.state.coins += 7;
    const previous = encodeSnapshot(content, sim.state, 2000);
    expect(decodeSnapshot(content, latest).coins).toBe(coinsAfter);
    expect(decodeSnapshot(content, previous).coins).toBe(coinsAfter + 7);
    expect(FullUnlockSystem.FREE_HARBOR_ID).toBe("harbor.sunrise_pier");
  });

  it("keeps store URLs, legal pages, and screen inventory filled", () => {
    expect(isHttpsAbsoluteUrl(SUPPORT_URL)).toBe(true);
    expect(isHttpsAbsoluteUrl(PRIVACY_POLICY_URL)).toBe(true);
    for (const rel of [
      "web/public/privacy.html",
      "web/public/support.html",
      "web/public/landing.html",
      "shared/store/licenses.json",
      "shared/store/feature-graphic.png",
    ]) {
      expect(existsSync(resolve(root, rel)), rel).toBe(true);
    }
    expect(dod.screensPresent).toEqual(
      expect.arrayContaining([
        "title",
        "warehouse",
        "species_book",
        "dashboard",
        "settings",
        "cloud_conflict",
        "local_recovery",
      ]),
    );
    expect(dod.checks).toEqual(
      expect.arrayContaining([
        "blueprint_quotas",
        "objectives_reachable",
        "inventories_reconcile",
        "rewards_idempotent",
        "latest_and_previous_restore",
        "store_urls_filled",
        "release_pin_matches",
      ]),
    );
  });
});
