/**
 * Phase 29 — store listing, legal URLs, screenshot storyboards, asset licenses.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LANDING_PAGE_PATH,
  LANDING_URL,
  LEGAL_PAGES_PHASE,
  PRIVACY_PAGE_PATH,
  PRIVACY_POLICY_URL,
  STORE_APP_NAME,
  STORE_SHORT_DESCRIPTION,
  SUPPORT_PAGE_PATH,
  SUPPORT_URL,
  WEB_LANDING,
  isHttpsAbsoluteUrl,
  storeListing,
} from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("store listing & legal (Phase 29)", () => {
  it("fills HTTPS support + privacy URLs and Play / web landing copy", () => {
    expect(storeListing.phase).toBe(29);
    expect(storeListing.schema).toBe("fish.store.listing.v1");
    expect(STORE_APP_NAME).toBe("Fish Shopping");
    expect(STORE_SHORT_DESCRIPTION.length).toBeGreaterThan(20);
    expect(isHttpsAbsoluteUrl(SUPPORT_URL)).toBe(true);
    expect(isHttpsAbsoluteUrl(PRIVACY_POLICY_URL)).toBe(true);
    expect(isHttpsAbsoluteUrl(LANDING_URL)).toBe(true);
    expect(SUPPORT_URL).toContain("support.html");
    expect(PRIVACY_POLICY_URL).toContain("privacy.html");
    expect(LANDING_URL).toContain("wjeanvilma.github.io/fish-shopping");
    expect(LEGAL_PAGES_PHASE).toBe(7);
    expect(storeListing.playListing.title).toBe("Fish Shopping");
    expect(storeListing.playListing.fullDescription.length).toBeGreaterThan(storeListing.shortDescription.length);
    expect(storeListing.playListing.featureGraphic).toBe("shared/store/feature-graphic.png");
    expect(WEB_LANDING.tagline).toContain("harbor");
    expect(WEB_LANDING.ctaPlay).toBe("Play in browser");
  });

  it("ships privacy, support, landing pages and feature graphic", () => {
    for (const rel of [
      "web/public/privacy.html",
      "web/public/support.html",
      "web/public/landing.html",
      "shared/store/feature-graphic.png",
      "shared/store/feature-graphic.svg",
      "shared/store/licenses.json",
      "shared/store/legal-pages.json",
    ]) {
      expect(existsSync(resolve(root, rel)), rel).toBe(true);
    }
    const privacy = readFileSync(resolve(root, "web/public/privacy.html"), "utf8");
    expect(privacy.toLowerCase()).toContain("privacy");
    expect(privacy).toContain("analytics");
    expect(privacy).not.toContain('href="/');
    const support = readFileSync(resolve(root, "web/public/support.html"), "utf8");
    expect(support.toLowerCase()).toContain("support");
    expect(support).toContain("Restore purchases");
    expect(support).not.toContain('href="/');
    const landing = readFileSync(resolve(root, "web/public/landing.html"), "utf8");
    expect(landing).toContain(WEB_LANDING.tagline);
    expect(landing).toContain("privacy.html");
    expect(landing).not.toContain('href="/');
    expect(PRIVACY_PAGE_PATH).toBe("privacy.html");
    expect(SUPPORT_PAGE_PATH).toBe("support.html");
    expect(LANDING_PAGE_PATH).toBe("landing.html");
  });

  it("keeps screenshot storyboards for every listing shot", () => {
    expect(storeListing.screenshotShots.length).toBeGreaterThanOrEqual(7);
    for (const shot of storeListing.screenshotShots) {
      expect(shot.storyboard).toBeTruthy();
      expect(existsSync(resolve(root, shot.storyboard!)), shot.storyboard).toBe(true);
      expect(shot.capture.length).toBeGreaterThan(20);
    }
  });

  it("records first-party asset licenses for ship", () => {
    const licenses = JSON.parse(
      readFileSync(resolve(root, "shared/store/licenses.json"), "utf8"),
    ) as {
      phase: number;
      schema: string;
      records: { id: string; rights: string }[];
    };
    expect(licenses.phase).toBe(29);
    expect(licenses.schema).toBe("fish.store.asset_licenses.v1");
    const ids = licenses.records.map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "harbor-blockouts",
        "store-chrome",
        "screenshot-storyboards",
        "authored-sfx",
        "authored-music",
        "third-party-runtime",
      ]),
    );
    expect(licenses.records.every((r) => r.rights.length > 0)).toBe(true);
  });
});
