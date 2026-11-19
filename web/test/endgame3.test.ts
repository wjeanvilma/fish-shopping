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
} from "../src/engine";
import {
  ENDGAME_3_MARKER,
  ENDGAME_3_PHASE,
  ENDGAME_3_VERSION,
  measureEndgame3,
} from "../src/ship/endgame3";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const PARITY_ENDGAME_3 = "shared/fixtures/parity-endgame-3.json";
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Endgame deepen + schema 26 (Finish 5.0 Phase 17)", () => {
  it("locks phase 17 catalog floors", () => {
    expect(PARITY_ENDGAME_3).toContain("parity-endgame-3.json");
    expect(ENDGAME_3_PHASE).toBe(17);
    expect(ENDGAME_3_VERSION).toBe(26);
    // Soft-floor: Finish 6.0 Phase 14 bumps live schema to 27.
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(ENDGAME_3_MARKER).toBe("authored-finish-5.0-phase-17");
    expect((storeListing as { endgame3Phase?: number }).endgame3Phase).toBe(17);
  });

  it("measures deepen + schema 26 wiring", () => {
    const m = measureEndgame3(root);
    expect(m.schemaVersion).toBeGreaterThanOrEqual(26);
    expect(m.tierCount).toBeGreaterThanOrEqual(8);
    expect(m.challengeCount).toBeGreaterThanOrEqual(12);
    expect(m.crestDefs).toBeGreaterThanOrEqual(3);
    expect(m.newTiersPresent).toBe(true);
    expect(m.newChallengesPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.schemaPrepApplied).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("migrates v25 saves and persists endgameCrests", () => {
    const legacy = readFileSync(
      resolve(root, "shared/fixtures/legacy/snapshot-v25-starter-line-t2500.json"),
      "utf8",
    );
    const s = decodeSnapshot(content, legacy);
    expect(s.endgameCrests.size).toBe(0);
    const encoded = encodeSnapshot(content, s);
    expect(encoded.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
    expect(encoded).toContain('"endgameCrests":[]');
  });

  it("grants crests and unlocks Aurora Throne path", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 1717));
    for (const m of content.prestige.milestones.slice(0, 22)) {
      sim.state.completedPrestige.add(m.id);
    }
    for (const rival of content.rivalMarkets.rivals.slice(0, 12)) {
      sim.state.beatenRivalIds.add(rival.id);
    }
    for (const ch of content.endgame.challenges.slice(0, 10)) {
      sim.state.completedEndgameChallenges.add(ch.id);
      if (ch.grantsMark) sim.state.endgameMarks.add(ch.grantsMark);
      if (ch.grantsCrest) sim.state.endgameCrests.add(ch.grantsCrest);
    }
    expect(EndgameSystem.tierRequirementsMet(
      sim.state,
      content.endgameTiersById.get("endgame.tier.aurora_throne")!,
    )).toBe(true);
  });

  it("wires RELEASE_PIN + endgame3:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { endgame3?: string; fixtures?: string[] };
    expect(pin.endgame3).toBe("shared/ship/endgame-3.json");
    expect(pin.fixtures).toContain("parity-endgame-3.json");
    const out = execFileSync("npm", ["run", "endgame3:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK endgame3:validate");
  });
});
