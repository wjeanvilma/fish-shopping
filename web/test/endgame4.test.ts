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
  ENDGAME_4_MARKER,
  ENDGAME_4_PHASE,
  ENDGAME_4_VERSION,
  measureEndgame4,
} from "../src/ship/endgame4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const PARITY_ENDGAME_4 = "shared/fixtures/parity-endgame-4.json";
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Endgame deepen + schema 27 (Finish 6.0 Phase 14)", () => {
  it("locks phase 14 catalog floors", () => {
    expect(PARITY_ENDGAME_4).toContain("parity-endgame-4.json");
    expect(ENDGAME_4_PHASE).toBe(14);
    expect(ENDGAME_4_VERSION).toBe(27);
    expect(SCHEMA_VERSION).toBe(27);
    expect(ENDGAME_4_MARKER).toBe("authored-finish-6.0-phase-14");
    expect((storeListing as { endgame4Phase?: number }).endgame4Phase).toBe(14);
  });

  it("measures deepen + schema 27 wiring", () => {
    const m = measureEndgame4(root);
    expect(m.schemaVersion).toBe(27);
    expect(m.tierCount).toBeGreaterThanOrEqual(10);
    expect(m.challengeCount).toBeGreaterThanOrEqual(16);
    expect(m.sigilDefs).toBeGreaterThanOrEqual(3);
    expect(m.newTiersPresent).toBe(true);
    expect(m.newChallengesPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.schemaPrepApplied).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("migrates v26 saves and persists endgameSigils", () => {
    const legacy = readFileSync(
      resolve(root, "shared/fixtures/legacy/snapshot-v26-starter-line-t2500.json"),
      "utf8",
    );
    const s = decodeSnapshot(content, legacy);
    expect(s.endgameSigils.size).toBe(0);
    const encoded = encodeSnapshot(content, s);
    expect(encoded.startsWith('{"schemaVersion":27,')).toBe(true);
    expect(encoded).toContain('"endgameSigils":[]');
  });

  it("grants sigils and unlocks Saffron Nest path", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 1717));
    for (const m of content.prestige.milestones.slice(0, 26)) {
      sim.state.completedPrestige.add(m.id);
    }
    for (const rival of content.rivalMarkets.rivals.slice(0, 12)) {
      sim.state.beatenRivalIds.add(rival.id);
    }
    for (const ch of content.endgame.challenges.slice(0, 14)) {
      sim.state.completedEndgameChallenges.add(ch.id);
      if (ch.grantsMark) sim.state.endgameMarks.add(ch.grantsMark);
      if (ch.grantsCrest) sim.state.endgameCrests.add(ch.grantsCrest);
      if (ch.grantsSigil) sim.state.endgameSigils.add(ch.grantsSigil);
    }
    expect(EndgameSystem.tierRequirementsMet(
      sim.state,
      content.endgameTiersById.get("endgame.tier.saffron_nest")!,
    )).toBe(true);
  });

  it("wires RELEASE_PIN + endgame4:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { endgame4?: string; fixtures?: string[] };
    expect(pin.endgame4).toBe("shared/ship/endgame-4.json");
    expect(pin.fixtures).toContain("parity-endgame-4.json");
    const out = execFileSync("npm", ["run", "endgame4:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK endgame4:validate");
  });
});
