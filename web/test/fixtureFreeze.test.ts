import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, TICKS_PER_SECOND, loadContent } from "../src/engine";

const shared = (...parts: string[]) => resolve(__dirname, "../../shared", ...parts);

describe("fixture freeze", () => {
  it("RELEASE_PIN matches content pack and fixture files", () => {
    const pin = JSON.parse(readFileSync(shared("fixtures/RELEASE_PIN.json"), "utf8")) as {
      contentVersion: string;
      schemaVersion: number;
      ticksPerSecond: number;
      fixtures: string[];
    };
    const content = loadContent(
      JSON.parse(readFileSync(shared("content/content-pack.json"), "utf8")),
    );
    expect(content.contentVersion).toBe(pin.contentVersion);
    expect(SCHEMA_VERSION).toBe(pin.schemaVersion);
    expect(TICKS_PER_SECOND).toBe(pin.ticksPerSecond);
    for (const name of pin.fixtures) {
      expect(existsSync(shared("fixtures", name))).toBe(true);
    }
  });
});
