import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPLETE_TAG,
  COMPLETE_TAG_PHASE,
  COMPLETE_TAG_SCHEMA,
  V1_0_COMPLETE_TAG,
} from "../src/ship/completeTag";
import { storeListing } from "../src/store/listing";
import { DEFINITION_OF_DONE } from "../src/engine/definitionOfDone";

const root = resolve(__dirname, "../..");

describe("Complete tag (Finish 2.0 Phase 4)", () => {
  it("locks v1.0-complete contracts and archived DoD closeout", () => {
    expect(COMPLETE_TAG_PHASE).toBe(4);
    expect(COMPLETE_TAG_SCHEMA).toBe("fish.ship.complete_tag.v1");
    expect(V1_0_COMPLETE_TAG).toBe("v1.0-complete");
    expect(COMPLETE_TAG.closeoutStatusAfter).toBe("archived");
    expect(Object.keys(COMPLETE_TAG.artifactSlots)).toContain("androidAab");
    expect((storeListing as { completeTagPhase?: number }).completeTagPhase).toBe(4);
    expect(DEFINITION_OF_DONE.closeout.status).toBe("archived");
    expect(DEFINITION_OF_DONE.completeTag).toBe("v1.0-complete");
  });

  it("complete:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-complete-tag.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK complete:validate");
  }, 60_000);
});
