import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_SHIP_PHASE,
  PUBLIC_SHIP_RELEASE_TAG,
  PUBLIC_SHIP_SCHEMA,
  publicShip,
} from "../src/store/publicShip";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("public ship (post-1.0 Phase 18)", () => {
  it("locks production track, web release, and v1.0.0-store tag", () => {
    expect(PUBLIC_SHIP_PHASE).toBe(18);
    expect(PUBLIC_SHIP_SCHEMA).toBe("fish.ship.public_ship.v1");
    expect(PUBLIC_SHIP_RELEASE_TAG).toBe("v1.0.0-store");
    expect(publicShip.android.track).toBe("production");
    expect(publicShip.android.promoteFrom).toBe("closed");
    expect(publicShip.web.ciJob).toBe("web-release");
    expect(publicShip.web.ciArtifactName).toBe("web-release-dist");
    expect(publicShip.storeBuildHashes.algorithm).toBe("sha256");
    expect(publicShip.signoff.status).toBe("ready_for_production");
    expect(publicShip.prerequisite.closedTestingPhase).toBe(17);
    expect((storeListing as { publicShipPhase?: number }).publicShipPhase).toBe(18);
  });

  it("preflight gates and hash inputs exist", () => {
    for (const gate of publicShip.preflightGates) {
      expect(existsSync(resolve(root, gate)), gate).toBe(true);
    }
    for (const input of publicShip.storeBuildHashes.inputFiles) {
      expect(existsSync(resolve(root, input)), input).toBe(true);
    }
    expect(publicShip.signoff.checklist.length).toBeGreaterThanOrEqual(6);
  });

  it("public-ship:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-public-ship.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK public-ship:validate");
  });
});
