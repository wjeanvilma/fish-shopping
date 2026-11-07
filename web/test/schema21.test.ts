import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot, loadContent } from "../src/engine";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  SCHEMA_21,
  SCHEMA_21_PHASE,
  SCHEMA_21_SCHEMA,
  SCHEMA_21_VERSION,
} from "../src/ship/schema21";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Schema 21 (Finish 2.0 Phase 7)", () => {
  it("locks schema 21 contracts and migrates legacy v20", () => {
    expect(SCHEMA_21_PHASE).toBe(7);
    expect(SCHEMA_21_SCHEMA).toBe("fish.ship.schema_21.v1");
    expect(SCHEMA_21_VERSION).toBe(21);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(21);
    expect(SCHEMA_21.migration.field).toBe("unlockedAchievements");
    expect((storeListing as { schema21Phase?: number }).schema21Phase).toBe(7);

    const content = loadContent(JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")));
    const legacy = readFileSync(
      resolve(root, "shared/fixtures/legacy/snapshot-v20-starter-line-t2500.json"),
      "utf8",
    );
    expect(legacy.startsWith('{"schemaVersion":20,')).toBe(true);
    expect(legacy.includes('"unlockedAchievements"')).toBe(false);

    const state = decodeSnapshot(content, legacy);
    expect(state.unlockedAchievements.size).toBe(0);
    const encoded = encodeSnapshot(content, state);
    expect(encoded.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
    expect(encoded).toContain('"unlockedAchievements":[]');
  });

  it("schema21:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-schema-21.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK schema21:validate");
  }, 60_000);
});
