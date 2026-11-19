import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FREEZE_60,
  FREEZE_60_CONTENT_FLOORS,
  FREEZE_60_CONTENT_VERSION,
  FREEZE_60_MARKER,
  FREEZE_60_PHASE,
  FREEZE_60_RELEASE_TAG,
  FREEZE_60_VERSION_CODE,
} from "../src/ship/freeze60";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Finish 6.0 Phase 30 freeze", () => {
  it("locks 6.0.0 pin floors and prior freeze archive", () => {
    expect(FREEZE_60_PHASE).toBe(30);
    expect(FREEZE_60.plan).toBe("30_finish_6.0");
    expect(FREEZE_60_CONTENT_VERSION).toBe("6.0.0");
    expect(FREEZE_60_RELEASE_TAG).toBe("v6.0.0");
    expect(FREEZE_60_VERSION_CODE).toBe(7);
    expect(FREEZE_60_MARKER).toBe("authored-finish-6.0-phase-30");
    expect(FREEZE_60.priorFreeze).toBe("shared/ship/freeze-5.0.0.json");
    expect(FREEZE_60_CONTENT_FLOORS.species).toBe(150);
    expect(FREEZE_60_CONTENT_FLOORS.quests).toBe(100);
    expect(FREEZE_60_CONTENT_FLOORS.machines).toBe(16);
    expect(FREEZE_60_CONTENT_FLOORS.paritySuites).toBe(24);
    expect(existsSync(resolve(root, FREEZE_60.parityFixture))).toBe(true);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBe(0);

    const pin = JSON.parse(readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"));
    expect(pin.contentVersion).toBe("6.0.0");
    expect(pin.versionCode).toBe(7);
    expect(pin.releaseTag).toBe("v6.0.0");
    expect(pin.freeze60).toBe("shared/ship/freeze-6.0.0.json");
    expect(pin.freeze50).toBe("shared/ship/freeze-5.0.0.json");
    expect(pin.freeze40).toBe("shared/ship/freeze-4.0.0.json");
    expect(pin.freeze30).toBe("shared/ship/freeze-3.0.0.json");
    expect(pin.freeze20).toBe("shared/ship/freeze-2.0.0.json");

    expect((storeListing as { freeze60Phase?: number }).freeze60Phase).toBe(30);
    expect((storeListing as { whatsNewVersion?: string }).whatsNewVersion).toBe("6.0.0");
  });

  it("freeze6:validate and prior freeze gates pass", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-freeze-6.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK freeze6:validate");

    const freeze5 = execFileSync("npx", ["vite-node", "scripts/validate-freeze-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(freeze5).toContain("OK freeze5:validate");
  }, 120_000);
});
