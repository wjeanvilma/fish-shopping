/**
 * Phase 18 — store listing + brand chrome contract.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

type Shot = {
  id: string;
  title: string;
  orientation: string;
  aspect: string;
  capture: string;
};

describe("Phase 18 store chrome", () => {
  it("ships listing.json with filled screenshot shot list and asset paths", () => {
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as {
      appName: string;
      shortDescription: string;
      supportUrl: string;
      privacyPolicyUrl: string;
      screenshotShots: Shot[];
      assets: Record<string, string>;
    };
    expect(listing.appName).toBe("Fish Shopping");
    expect(listing.shortDescription.length).toBeGreaterThan(20);
    expect(listing.supportUrl.startsWith("https://")).toBe(true);
    expect(listing.privacyPolicyUrl.startsWith("https://")).toBe(true);
    expect(listing.screenshotShots.length).toBeGreaterThanOrEqual(5);
    for (const shot of listing.screenshotShots) {
      expect(shot.id).toBeTruthy();
      expect(shot.title).toBeTruthy();
      expect(shot.capture.length).toBeGreaterThan(20);
      expect(["portrait", "landscape"]).toContain(shot.orientation);
    }
    expect(listing.assets.brandMark).toBe("shared/store/brand-mark.svg");
    expect(listing.assets.webFavicon).toBe("web/public/favicon.svg");
  });

  it("keeps brand mark, favicon, feature graphic, and touch icons on disk", () => {
    const paths = [
      "shared/store/brand-mark.svg",
      "shared/store/feature-graphic.svg",
      "shared/store/feature-graphic.png",
      "shared/store/listing.json",
      "web/public/favicon.svg",
      "web/public/apple-touch-icon.png",
      "web/public/icon-192.png",
      "web/public/icon-512.png",
      "web/public/icon-512-maskable.png",
      "shared/store/play-icon-512.png",
      "web/public/manifest.webmanifest",
      "app/src/main/res/drawable/ic_brand_mark.xml",
      "app/src/main/res/drawable/ic_launcher_foreground.xml",
      "app/src/main/res/drawable/ic_launcher_background.xml",
      "app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
      "app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png",
    ];
    for (const rel of paths) {
      expect(existsSync(resolve(root, rel)), rel).toBe(true);
    }
  });

  it("aligns favicon with brand ink / sky / reward colors", () => {
    const favicon = readFileSync(resolve(root, "web/public/favicon.svg"), "utf8");
    expect(favicon).toContain("#153449");
    expect(favicon.toLowerCase()).toContain("#9fd3ea");
    expect(favicon.toLowerCase()).toContain("#e8af4a");
    const brand = readFileSync(resolve(root, "shared/store/brand-mark.svg"), "utf8");
    expect(brand).toContain("#153449");
    expect(brand).toContain("Fish Shopping");
  });
});
