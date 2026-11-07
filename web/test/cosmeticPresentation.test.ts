import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COSMETIC_PRESENTATION_PHASE,
  COSMETIC_PRESENTATION_SCHEMA,
  cosmeticPresentation,
  cosmeticTitle,
  iapCatalogMatchesPresentation,
  resolveVisibleCosmetic,
  sanitizeEquippedCosmetic,
} from "../src/engine/cosmeticPresentation";
import { CosmeticsIapSystem } from "../src/engine";

const root = resolve(__dirname, "../..");

describe("Cosmetic presentation (post-1.0 Phase 24)", () => {
  it("locks equip/preview contracts as power-neutral presentation", () => {
    expect(COSMETIC_PRESENTATION_PHASE).toBe(24);
    expect(COSMETIC_PRESENTATION_SCHEMA).toBe("fish.content.cosmetic_presentation.v1");
    expect(cosmeticPresentation.schemaVersion).toBe(20);
    expect(cosmeticPresentation.constraints.powerNeutral).toBe(true);
    expect(cosmeticPresentation.constraints.equipInSettingsNotSave).toBe(true);
    expect(cosmeticPresentation.slot.maxEquipped).toBe(1);
    expect(iapCatalogMatchesPresentation()).toBe(true);
    expect(CosmeticsIapSystem.CATALOG).toHaveLength(cosmeticPresentation.items.length);
  });

  it("sanitizes equipped ids and allows unowned IAP preview", () => {
    const unlocked = new Set(["banner.iap_sunset_bunting"]);
    expect(sanitizeEquippedCosmetic("banner.iap_pearl_string", unlocked)).toBeNull();
    expect(sanitizeEquippedCosmetic("banner.iap_sunset_bunting", unlocked)).toBe(
      "banner.iap_sunset_bunting",
    );
    expect(
      resolveVisibleCosmetic(null, "banner.iap_captain_crest", unlocked),
    ).toBe("banner.iap_captain_crest");
    expect(cosmeticTitle("banner.iap_sunset_bunting")).toBe("Sunset bunting");
  });

  it("cosmetics:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-cosmetic-presentation.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK cosmetics:validate");
  });
});
