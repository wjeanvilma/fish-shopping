import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EndgameSystem,
  GameState,
  SCHEMA_VERSION,
  Simulation,
  decodeSnapshot,
  encodeSnapshot,
  loadContent,
  buildView,
} from "../src/engine";
import {
  ENDGAME_2_MARKER,
  ENDGAME_2_PHASE,
  ENDGAME_2_VERSION,
  measureEndgame2,
} from "../src/ship/endgame2";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
/** Finish 4.0 Phase 29 parity-lock suite fixture. */
const PARITY_ENDGAME_2 = "shared/fixtures/parity-endgame-2.json";
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Endgame deepen + schema 25 (Finish 4.0 Phase 17)", () => {
  it("locks phase 17 catalog floors", () => {
    expect(PARITY_ENDGAME_2).toContain("parity-endgame-2.json");
    expect(ENDGAME_2_PHASE).toBe(17);
    expect(ENDGAME_2_VERSION).toBe(25);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(ENDGAME_2_MARKER).toBe("authored-finish-4.0-phase-17");
    expect((storeListing as { endgame2Phase?: number }).endgame2Phase).toBe(17);
  });

  it("measures deepen + schema 25 wiring", () => {
    const m = measureEndgame2(root);
    expect(m.schemaVersion).toBeGreaterThanOrEqual(25);
    expect(m.tierCount).toBeGreaterThanOrEqual(6);
    expect(m.challengeCount).toBeGreaterThanOrEqual(8);
    expect(m.markDefs).toBeGreaterThanOrEqual(3);
    expect(m.newTiersPresent).toBe(true);
    expect(m.newChallengesPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.schemaPrepApplied).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("migrates v24 saves and persists endgameMarks", () => {
    const legacy = readFileSync(
      resolve(root, "shared/fixtures/legacy/snapshot-v24-starter-line-t2500.json"),
      "utf8",
    );
    const s = decodeSnapshot(content, legacy);
    expect(s.endgameMarks.size).toBe(0);
    const encoded = encodeSnapshot(content, s);
    expect(encoded).toMatch(/^\{"schemaVersion":(2[5-9]|[3-9]\d),/);
    expect(encoded).toContain('"endgameMarks":[]');
  });

  it("grants legend marks and unlocks Mist Sovereign path", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 1717));
    for (const m of content.prestige.milestones.slice(0, 18)) {
      sim.state.completedPrestige.add(m.id);
    }
    for (const rival of content.rivalMarkets.rivals.slice(0, 10)) {
      sim.state.beatenRivalIds.add(rival.id);
    }
    for (const ch of content.endgame.challenges.slice(0, 5)) {
      sim.state.completedEndgameChallenges.add(ch.id);
      if (ch.grantsMark) sim.state.endgameMarks.add(ch.grantsMark);
    }
    expect(EndgameSystem.tierRequirementsMet(
      sim.state,
      content.endgameTiersById.get("endgame.tier.mist_sovereign")!,
    )).toBe(true);
    sim.step();
    expect(sim.state.unlockedEndgameTiers.has("endgame.tier.mist_sovereign")).toBe(true);
    const view = buildView(sim);
    expect(view.endgameMarkCount).toBeGreaterThanOrEqual(1);
    expect(view.endgameTiers.some((t) => t.id === "endgame.tier.mist_sovereign" && t.status === "unlocked")).toBe(true);
  });

  it("endgame2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-endgame-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK endgame2:validate");
  });
});
