import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SPA_HOST, SPA_HOST_PHASE, SPA_HOST_SCHEMA, SPA_PLAY_URL } from "../src/store/spaHost";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("SPA host (Finish 2.0 Phase 3)", () => {
  it("locks play URL host contract and legal path stability", () => {
    expect(SPA_HOST_PHASE).toBe(3);
    expect(SPA_HOST_SCHEMA).toBe("fish.ship.spa_host.v1");
    expect(SPA_PLAY_URL).toBe("https://wjeanvilma.github.io/fish-shopping/play/");
    expect(SPA_HOST.build.fallback404).toBe(true);
    expect(SPA_HOST.build.stripLegalHtmlFromPlay).toBe(true);
    expect(SPA_HOST.legalPathsStable.map((p) => p.path)).toEqual([
      "/",
      "/privacy.html",
      "/support.html",
    ]);
    expect((storeListing as { spaHostPhase?: number }).spaHostPhase).toBe(3);
    expect(existsSync(resolve(root, SPA_HOST.build.workflow))).toBe(true);
  });

  it("spa:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-spa-host.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK spa:validate");
  }, 120_000);
});
