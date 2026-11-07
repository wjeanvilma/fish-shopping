import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFINITION_OF_DONE,
  DOD_CLOSEOUT_STATUS,
  DOD_COMPLETE_TAG,
  DOD_PHASE,
  DOD_SCHEMA,
  dodPhaseGateCatalogs,
  dodRequiredChecks,
  isCloseoutReady,
} from "../src/engine/definitionOfDone";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("DoD closeout (post-1.0 Phase 30)", () => {
  it("locks v1.0-complete tag and 29 phase gates", () => {
    expect(DOD_PHASE).toBe(30);
    expect(DOD_SCHEMA).toBe("fish.ship.definition_of_done.v1");
    expect(DOD_COMPLETE_TAG).toBe("v1.0-complete");
    expect(DOD_CLOSEOUT_STATUS).toBe("archived");
    expect(isCloseoutReady()).toBe(true);
    expect(DEFINITION_OF_DONE.schemaVersion).toBe(23);
    expect(DEFINITION_OF_DONE.closeout.phaseGates).toHaveLength(29);
    expect(dodPhaseGateCatalogs()).toContain("shared/ship/hotfix-lane.json");
    expect(dodRequiredChecks()).toContain("legal_urls_pages_ready");
    expect(DEFINITION_OF_DONE.closeout.operatorGates?.some((g) => g.id === "legal_urls_http_200")).toBe(true);
    expect((storeListing as { dodCloseoutPhase?: number }).dodCloseoutPhase).toBe(30);
    expect((storeListing as { completeTag?: string }).completeTag).toBe("v1.0-complete");
  });

  it("phase gate catalogs and evidence exist", () => {
    for (const catalog of dodPhaseGateCatalogs()) {
      expect(existsSync(resolve(root, catalog)), catalog).toBe(true);
    }
    for (const rel of Object.values(DEFINITION_OF_DONE.closeout.evidence)) {
      expect(existsSync(resolve(root, rel)), rel).toBe(true);
    }
    expect(DEFINITION_OF_DONE.closeout.checklist.length).toBeGreaterThanOrEqual(8);
  });

  it("dod:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-dod-closeout.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK dod:validate");
  }, 60_000);
});
