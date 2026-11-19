import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FREEZE_40,
  FREEZE_40_CONTENT_FLOORS,
  FREEZE_40_CONTENT_VERSION,
  FREEZE_40_MARKER,
  FREEZE_40_PHASE,
  FREEZE_40_RELEASE_TAG,
  FREEZE_40_VERSION_CODE,
} from "../src/ship/freeze40";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 4.0 Phase 30 freeze", () => {
  it("locks 4.0.0 pin floors and prior freeze archive", () => {
    expect(FREEZE_40_PHASE).toBe(30);
    expect(FREEZE_40.plan).toBe("30_finish_4.0");
    expect(FREEZE_40_CONTENT_VERSION).toBe("4.0.0");
    expect(FREEZE_40_RELEASE_TAG).toBe("v4.0.0");
    expect(FREEZE_40_VERSION_CODE).toBe(5);
    expect(FREEZE_40_MARKER).toBe("authored-finish-4.0-phase-30");
    expect(FREEZE_40.priorFreeze).toBe("shared/ship/freeze-3.0.0.json");
    expect(FREEZE_40_CONTENT_FLOORS.species).toBe(100);
    expect(FREEZE_40_CONTENT_FLOORS.quests).toBe(50);
    expect(FREEZE_40_CONTENT_FLOORS.machines).toBe(12);
    expect(FREEZE_40_CONTENT_FLOORS.paritySuites).toBe(16);
    expect(existsSync(resolve(root, FREEZE_40.parityFixture))).toBe(true);

    const pin = JSON.parse(readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"));
    // Soft-floor: Finish 5.0 Phase 30 may advance live pin to 5.0.0.
    expect(["4.0.0", "5.0.0"]).toContain(pin.contentVersion);
    expect(pin.versionCode).toBeGreaterThanOrEqual(5);
    expect(["v4.0.0", "v5.0.0"]).toContain(pin.releaseTag);
    expect(pin.freeze40).toBe("shared/ship/freeze-4.0.0.json");
    expect(pin.freeze30).toBe("shared/ship/freeze-3.0.0.json");
    expect(pin.freeze20).toBe("shared/ship/freeze-2.0.0.json");

    expect((storeListing as { freeze40Phase?: number }).freeze40Phase).toBe(30);
    expect(["4.0.0", "5.0.0"]).toContain(
      (storeListing as { whatsNewVersion?: string }).whatsNewVersion,
    );
  });

  it("freeze4:validate and prior freeze gates pass", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-freeze-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK freeze4:validate");

    const freeze3 = execFileSync("npx", ["vite-node", "scripts/validate-freeze-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(freeze3).toContain("OK freeze3:validate");
  }, 90_000);
});
