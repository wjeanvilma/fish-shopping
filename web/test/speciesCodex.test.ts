import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GameState,
  Simulation,
  buildView,
  loadContent,
} from "../src/engine";
import {
  CODEX_ENTRY_FLOOR,
  SPECIES_CODEX,
  SPECIES_CODEX_PHASE,
  SPECIES_CODEX_SCHEMA,
} from "../src/ship/speciesCodex";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Species codex / journal (Finish 2.0 Phase 12)", () => {
  it("locks catalog and fifty codex entries", () => {
    expect(SPECIES_CODEX_PHASE).toBe(12);
    expect(SPECIES_CODEX_SCHEMA).toBe("fish.ship.species_codex.v1");
    expect(CODEX_ENTRY_FLOOR).toBe(50);
    expect(content.species).toHaveLength(50);
    expect(content.codex.entries).toHaveLength(50);
    expect(content.codex.families).toHaveLength(9);
    expect((storeListing as { speciesCodexPhase?: number }).speciesCodexPhase).toBe(12);
    for (const fam of SPECIES_CODEX.families) {
      expect(content.codex.families).toContain(fam);
    }
  });

  it("exposes lore, hints, rarity, and catch value after discovery", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-species-codex.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    for (const [id, qty] of Object.entries(fx.setup.speciesCatches as Record<string, number>)) {
      sim.state.recordSpeciesCatch(id, qty);
    }
    const book = buildView(sim).speciesBook;
    expect(book.discovered).toBe(fx.expect.discovered);
    expect(book.total).toBe(fx.expect.total);
    expect(book.families).toHaveLength(fx.expect.familyCount);

    const sprat = book.entries.find((e) => e.speciesId === fx.expect.sprat.speciesId)!;
    expect(sprat.discovered).toBe(true);
    expect(sprat.family).toBe(fx.expect.sprat.family);
    expect(sprat.rarityBand).toBe(fx.expect.sprat.rarityBand);
    expect(sprat.catches).toBe(fx.expect.sprat.catches);
    expect(sprat.catchValueEstimate).toBe(fx.expect.sprat.catchValueEstimate);
    expect(!!sprat.lore).toBe(fx.expect.sprat.hasLore);
    expect(!!sprat.journalTip).toBe(fx.expect.sprat.hasJournalTip);

    const hidden = book.entries.find((e) => e.speciesId === fx.expect.hiddenSample.speciesId)!;
    expect(hidden.discovered).toBe(false);
    expect(hidden.name).toBe(fx.expect.hiddenSample.name);
    expect(!!hidden.habitatHint).toBe(fx.expect.hiddenSample.hasHabitatHint);
    expect(hidden.lore).toBeNull();
  });

  it("codex:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-species-codex.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK codex:validate");
  }, 60_000);
});
