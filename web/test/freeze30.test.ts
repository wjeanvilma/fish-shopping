import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FREEZE_30,
  FREEZE_30_CONTENT_FLOORS,
  FREEZE_30_CONTENT_VERSION,
  FREEZE_30_MARKER,
  FREEZE_30_PHASE,
  FREEZE_30_RELEASE_TAG,
  FREEZE_30_VERSION_CODE,
} from "../src/ship/freeze30";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 3.0 Phase 30 freeze", () => {
  it("locks 3.0.0 pin floors and prior freeze archive", () => {
    expect(FREEZE_30_PHASE).toBe(30);
    expect(FREEZE_30.plan).toBe("30_finish_3.0");
    expect(FREEZE_30_CONTENT_VERSION).toBe("3.0.0");
    expect(FREEZE_30_RELEASE_TAG).toBe("v3.0.0");
    expect(FREEZE_30_VERSION_CODE).toBe(4);
    expect(FREEZE_30_MARKER).toBe("authored-finish-3.0-phase-30");
    expect(FREEZE_30.priorFreeze).toBe("shared/ship/freeze-2.0.0.json");
    expect(FREEZE_30_CONTENT_FLOORS.species).toBe(75);
    expect(FREEZE_30_CONTENT_FLOORS.quests).toBe(30);
    expect(FREEZE_30_CONTENT_FLOORS.machines).toBe(10);
    expect(existsSync(resolve(root, FREEZE_30.parityFixture))).toBe(true);

    const pin = JSON.parse(readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"));
    expect(["3.0.0", "4.0.0"]).toContain(pin.contentVersion);
    expect(pin.versionCode).toBeGreaterThanOrEqual(4);
    expect(["v3.0.0", "v4.0.0"]).toContain(pin.releaseTag);
    expect(pin.freeze30).toBe("shared/ship/freeze-3.0.0.json");
    expect(pin.freeze20).toBe("shared/ship/freeze-2.0.0.json");

    expect((storeListing as { freeze30Phase?: number }).freeze30Phase).toBe(30);
    expect(["3.0.0", "4.0.0"]).toContain(
      (storeListing as { whatsNewVersion?: string }).whatsNewVersion,
    );
  });

  it("freeze3:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-freeze-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK freeze3:validate");
  }, 60_000);
});
