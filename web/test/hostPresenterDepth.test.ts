import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  HOST_PRESENTER_DEPTH_MARKER,
  HOST_PRESENTER_DEPTH_PHASE,
  measureHostPresenterDepth,
} from "../src/ship/hostPresenterDepth";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Host presenter depth (Finish 5.0 Phase 5)", () => {
  it("locks phase 5 catalog floors", () => {
    expect(HOST_PRESENTER_DEPTH_PHASE).toBe(5);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(HOST_PRESENTER_DEPTH_MARKER).toBe("authored-finish-5.0-phase-5");
    expect((storeListing as { hostPresenterDepthPhase?: number }).hostPresenterDepthPhase).toBe(5);
  });

  it("measures host fishing intents + HUD bindings", () => {
    const m = measureHostPresenterDepth(root);
    expect(m.viewFieldCount).toBeGreaterThanOrEqual(10);
    expect(m.requiredFilesPresent).toBe(true);
    expect(m.symbolsPresent).toBe(true);
    expect(m.hudBindingsPresent).toBe(true);
    expect(m.loopSnapshotCoversFields).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("hostpresenterdepth:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-host-presenter-depth.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK hostpresenterdepth:validate");
  });
});
