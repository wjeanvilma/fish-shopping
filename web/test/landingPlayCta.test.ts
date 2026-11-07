import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LANDING_PLAY_CTA,
  LANDING_PLAY_CTA_PHASE,
  LANDING_PLAY_CTA_SCHEMA,
  PLAY_IN_BROWSER_LABEL,
  PLAY_URL,
} from "../src/store/landingPlayCta";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Landing Play CTA (Finish 2.0 Phase 2)", () => {
  it("locks Play in browser CTA and play URL contracts", () => {
    expect(LANDING_PLAY_CTA_PHASE).toBe(2);
    expect(LANDING_PLAY_CTA_SCHEMA).toBe("fish.ship.landing_play_cta.v1");
    expect(PLAY_IN_BROWSER_LABEL).toBe("Play in browser");
    expect(PLAY_URL).toBe("https://wjeanvilma.github.io/fish-shopping/play/");
    expect(LANDING_PLAY_CTA.viteBase).toBe("/fish-shopping/play/");
    expect((storeListing as { landingPlayCtaPhase?: number }).landingPlayCtaPhase).toBe(2);
    expect((storeListing as { playUrl?: string }).playUrl).toBe(PLAY_URL);

    const landing = readFileSync(resolve(root, "web/public/landing.html"), "utf8");
    expect(landing).toContain("Play in browser");
    expect(landing).toContain('href="play/"');
    expect(landing).not.toContain("View project");
  });

  it("landing:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-landing-play-cta.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK landing:validate");
  }, 120_000);
});
