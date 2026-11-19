import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LOADTEST_BANKS_SCHEMA,
  LOADTEST_SAVE_BANK,
  LOADTEST_TELEMETRY_BANK,
  measureLoadtestBanks,
} from "../src/ship/loadtestBanks";

const root = resolve(__dirname, "../..");

describe("loadtest banks (~90MB realistic JSON)", () => {
  it("tracks both banks on disk above the size floor", () => {
    for (const ref of [LOADTEST_SAVE_BANK, LOADTEST_TELEMETRY_BANK]) {
      const path = resolve(root, ref.fixture);
      expect(existsSync(path), path).toBe(true);
      expect(statSync(path).size).toBeGreaterThanOrEqual(ref.minBytes);
    }
  });

  it("probes production-shaped headers without full parse", () => {
    const m = measureLoadtestBanks(root);
    expect(LOADTEST_BANKS_SCHEMA).toBe("fish.ship.loadtest_banks.v1");
    expect(m.save.schema).toBe(LOADTEST_SAVE_BANK.schema);
    expect(m.telemetry.schema).toBe(LOADTEST_TELEMETRY_BANK.schema);
    expect(m.save.sampleKey).toBe("records");
    expect(m.telemetry.sampleKey).toBe("events");
    expect(m.save.contentVersion).toBe("5.0.0");
    expect(m.telemetry.schemaVersion).toBeGreaterThanOrEqual(26);
    expect(m.floorsMet).toBe(true);
  });

  it("is pinned and parity-wired for both apps", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { fixtures?: string[]; loadtestBanks?: string };
    expect(pin.fixtures).toContain("loadtest-save-bank.json");
    expect(pin.fixtures).toContain("loadtest-telemetry-bank.json");
    expect(pin.fixtures).toContain("parity-loadtest-banks.json");
    expect(pin.loadtestBanks).toBe("shared/ship/loadtest-banks.json");
    expect(existsSync(resolve(root, "web/src/game/GameHost.ts"))).toBe(true);
    expect(
      existsSync(
        resolve(
          root,
          "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt",
        ),
      ),
    ).toBe(true);
  });
});
