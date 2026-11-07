import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PAGES_LEGAL_LIVE,
  PAGES_LEGAL_LIVE_PHASE,
  PAGES_LEGAL_LIVE_SCHEMA,
  pagesLegalLiveUrls,
} from "../src/store/pagesLegalLive";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Pages legal live (Finish 2.0 Phase 1)", () => {
  it("locks canonicalHost URLs and Pages workflow contracts", () => {
    expect(PAGES_LEGAL_LIVE_PHASE).toBe(1);
    expect(PAGES_LEGAL_LIVE_SCHEMA).toBe("fish.ship.pages_legal_live.v1");
    expect(PAGES_LEGAL_LIVE.plan).toBe("30_finish_2.0");
    expect(PAGES_LEGAL_LIVE.schemaVersion).toBe(21);
    expect(PAGES_LEGAL_LIVE.pages.buildType).toBe("workflow");
    expect(PAGES_LEGAL_LIVE.pages.requirePublicRepo).toBe(true);
    expect(pagesLegalLiveUrls()).toHaveLength(3);
    expect((storeListing as { pagesLegalLivePhase?: number }).pagesLegalLivePhase).toBe(1);
    expect(existsSync(resolve(root, PAGES_LEGAL_LIVE.pages.workflow))).toBe(true);
  });

  it("pages:live exits 0 (live HTTP 200)", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-pages-legal-live.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK pages:live");
  }, 60_000);
});
