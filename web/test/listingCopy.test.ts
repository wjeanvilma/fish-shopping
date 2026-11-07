import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LISTING_COPY_PHASE,
  LISTING_COPY_SCHEMA,
  listingCopy,
  withinPlayLimits,
} from "../src/store/listingCopy";
import { WEB_LANDING, storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("listing copy freeze (post-1.0 Phase 11)", () => {
  it("freezes en copy within Play character limits", () => {
    expect(LISTING_COPY_PHASE).toBe(11);
    expect(LISTING_COPY_SCHEMA).toBe("fish.store.listing_copy.v1");
    expect(listingCopy.frozen).toBe(true);
    expect(listingCopy.locales).toEqual(["en"]);
    expect(withinPlayLimits()).toBe(true);
    expect(listingCopy.copy.title.length).toBeLessThanOrEqual(listingCopy.playLimits.titleMax);
    expect(listingCopy.copy.shortDescription.length).toBeLessThanOrEqual(
      listingCopy.playLimits.shortDescriptionMax,
    );
    expect(listingCopy.copy.fullDescription.length).toBeLessThanOrEqual(
      listingCopy.playLimits.fullDescriptionMax,
    );
    expect(listingCopy.copy.whatsNew.length).toBeLessThanOrEqual(listingCopy.playLimits.whatsNewMax);
    expect((storeListing as { listingCopyPhase?: number }).listingCopyPhase).toBe(11);
    expect((storeListing as { listingCopyFrozen?: boolean }).listingCopyFrozen).toBe(true);
    expect((storeListing as { whatsNew?: string }).whatsNew).toBe(listingCopy.copy.whatsNew);
    expect(storeListing.shortDescription).toBe(listingCopy.copy.shortDescription);
    expect(WEB_LANDING.tagline).toBe(listingCopy.webLanding.tagline);
  });

  it("keeps en locale + Android strings in sync", () => {
    const en = JSON.parse(readFileSync(resolve(root, "shared/store/locales/en.json"), "utf8"));
    expect(en.locale).toBe("en");
    expect(en.frozen).toBe(true);
    expect(en.whatsNew).toBe(listingCopy.copy.whatsNew);
    expect(en.fullDescription).toBe(listingCopy.copy.fullDescription);
    expect(existsSync(resolve(root, listingCopy.androidStrings))).toBe(true);
    const strings = readFileSync(resolve(root, listingCopy.androidStrings), "utf8");
    expect(strings).toContain(listingCopy.copy.shortDescription);
    expect(strings).toContain(listingCopy.copy.whatsNew);
    const pin = JSON.parse(readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"));
    expect(listingCopy.copy.whatsNewVersion).toBe(pin.versionName);
  });

  it("listing-copy:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-listing-copy.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK listing-copy:validate");
  });
});
