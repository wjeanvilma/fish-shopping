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
  SCHEMA_24_CHALLENGE_COUNT,
  SCHEMA_24_ENDGAME_MARKER,
  SCHEMA_24_ENDGAME_PHASE,
  SCHEMA_24_TIER_COUNT,
  SCHEMA_24_VERSION,
  measureSchema24Endgame,
} from "../src/ship/schema24Endgame";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Schema 24 + endgame (Finish 3.0 Phase 15)", () => {
  it("locks phase 15 catalog floors", () => {
    expect(SCHEMA_24_ENDGAME_PHASE).toBe(15);
    expect(SCHEMA_24_VERSION).toBe(24);
    expect(SCHEMA_VERSION).toBe(24);
    expect(SCHEMA_24_TIER_COUNT).toBe(4);
    expect(SCHEMA_24_CHALLENGE_COUNT).toBe(4);
    expect(SCHEMA_24_ENDGAME_MARKER).toBe("authored-finish-3.0-phase-15");
    expect((storeListing as { schema24EndgamePhase?: number }).schema24EndgamePhase).toBe(15);
    expect(
      readFileSync(resolve(root, "shared/fixtures/parity-schema-24-endgame.json"), "utf8"),
    ).toContain("schema24EndgameMarker");
  });

  it("measures endgame wiring", () => {
    const m = measureSchema24Endgame(root);
    expect(m.schemaVersion).toBe(24);
    expect(m.tierCount).toBe(4);
    expect(m.challengeCount).toBe(4);
    expect(m.tiersPresent).toBe(true);
    expect(m.challengesPresent).toBe(true);
    expect(m.statsWiredTs).toBe(true);
    expect(m.statsWiredKt).toBe(true);
    expect(m.systemMarkersTs).toBe(true);
    expect(m.systemMarkersKt).toBe(true);
    expect(m.codecMarkersTs).toBe(true);
    expect(m.codecMarkersKt).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("migrates v23 saves and persists endgame sets", () => {
    const legacy = readFileSync(
      resolve(root, "shared/fixtures/legacy/snapshot-v23-starter-line-t2500.json"),
      "utf8",
    );
    const s = decodeSnapshot(content, legacy);
    expect(s.beatenRivalIds.size).toBe(0);
    expect(s.unlockedEndgameTiers.size).toBe(0);
    expect(s.completedEndgameChallenges.size).toBe(0);
    const encoded = encodeSnapshot(content, s);
    expect(encoded.startsWith('{"schemaVersion":24,')).toBe(true);
    expect(encoded).toContain('"beatenRivalIds":[]');
    expect(encoded).toContain('"unlockedEndgameTiers":[]');
  });

  it("unlocks Deep Harbor after prestige floor + view fields", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 1515));
    for (const m of content.prestige.milestones.slice(0, 8)) {
      sim.state.completedPrestige.add(m.id);
    }
    expect(EndgameSystem.boardUnlocked(content, sim.state)).toBe(true);
    sim.step();
    expect(sim.state.unlockedEndgameTiers.has("endgame.tier.deep_harbor")).toBe(true);
    expect(sim.state.endgameCatchSpeedPermille).toBeGreaterThanOrEqual(1025);
    const view = buildView(sim);
    expect(view.endgameUnlocked).toBe(true);
    expect(view.endgameTiers.some((t) => t.id === "endgame.tier.deep_harbor" && t.status === "unlocked")).toBe(true);
  });

  it("schema24:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-schema-24-endgame.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK schema24:validate");
  });
});
