import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FREEZE_50,
  FREEZE_50_CONTENT_FLOORS,
  FREEZE_50_CONTENT_VERSION,
  FREEZE_50_MARKER,
  FREEZE_50_PHASE,
  FREEZE_50_RELEASE_TAG,
  FREEZE_50_VERSION_CODE,
} from "../src/ship/freeze50";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 5.0 Phase 30 freeze", () => {
  it("locks 5.0.0 pin floors and prior freeze archive", () => {
    expect(FREEZE_50_PHASE).toBe(30);
    expect(FREEZE_50.plan).toBe("30_finish_5.0");
    expect(FREEZE_50_CONTENT_VERSION).toBe("5.0.0");
    expect(FREEZE_50_RELEASE_TAG).toBe("v5.0.0");
    expect(FREEZE_50_VERSION_CODE).toBe(6);
    expect(FREEZE_50_MARKER).toBe("authored-finish-5.0-phase-30");
    expect(FREEZE_50.priorFreeze).toBe("shared/ship/freeze-4.0.0.json");
    expect(FREEZE_50_CONTENT_FLOORS.species).toBe(125);
    expect(FREEZE_50_CONTENT_FLOORS.quests).toBe(75);
    expect(FREEZE_50_CONTENT_FLOORS.machines).toBe(14);
    expect(FREEZE_50_CONTENT_FLOORS.paritySuites).toBe(20);
    expect(existsSync(resolve(root, FREEZE_50.parityFixture))).toBe(true);
    expect(FINISH5_OPEN_GAP_FLAGS.length).toBe(0);

    const pin = JSON.parse(readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"));
    expect(pin.contentVersion).toBe("5.0.0");
    expect(pin.versionCode).toBe(6);
    expect(pin.releaseTag).toBe("v5.0.0");
    expect(pin.freeze50).toBe("shared/ship/freeze-5.0.0.json");
    expect(pin.freeze40).toBe("shared/ship/freeze-4.0.0.json");
    expect(pin.freeze30).toBe("shared/ship/freeze-3.0.0.json");
    expect(pin.freeze20).toBe("shared/ship/freeze-2.0.0.json");

    expect((storeListing as { freeze50Phase?: number }).freeze50Phase).toBe(30);
    expect((storeListing as { whatsNewVersion?: string }).whatsNewVersion).toBe("5.0.0");
  });

  it("freeze5:validate and prior freeze gates pass", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-freeze-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK freeze5:validate");

    const freeze4 = execFileSync("npx", ["vite-node", "scripts/validate-freeze-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(freeze4).toContain("OK freeze4:validate");
  }, 120_000);
});
