import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("release hardening (Phase 27)", () => {
  it("documents R8, backup excludes, and CI bundleRelease", () => {
    const catalog = JSON.parse(
      readFileSync(resolve(root, "shared/android/release-hardening.json"), "utf8"),
    );
    expect(catalog.phase).toBe(27);
    expect(catalog.schema).toBe("fish.android.release_hardening.v1");
    expect(catalog.compileSdk).toBe(37);
    expect(catalog.kotlin).toBe("2.4.0");
    expect(catalog.filament).toBe("1.77.3");
    expect(catalog.minify.enabled).toBe(true);
    expect(catalog.ci.task).toBe(":app:bundleRelease");
    expect(catalog.ci.assembleTask).toBe(":app:assembleRelease");
    expect(catalog.backupExcludes.files).toEqual(
      expect.arrayContaining([
        "harbor_save_latest.json",
        "harbor_save_previous.json",
        "harbor_save_latest.json.new",
        "harbor_save_previous.json.new",
      ]),
    );
    expect(catalog.backupExcludes.sharedPreferences).toContain("fish_shopping_entitlements.xml");
  });

  it("ships matching backup XML and proguard keep rules", () => {
    const extraction = readFileSync(resolve(root, "app/src/main/res/xml/data_extraction_rules.xml"), "utf8");
    const backup = readFileSync(resolve(root, "app/src/main/res/xml/backup_rules.xml"), "utf8");
    const proguard = readFileSync(resolve(root, "app/proguard-rules.pro"), "utf8");
    for (const path of [
      "harbor_save_latest.json",
      "harbor_save_previous.json",
      "fish_shopping_entitlements.xml",
    ]) {
      expect(extraction).toContain(path);
      expect(backup).toContain(path);
    }
    expect(extraction).toContain("<device-transfer>");
    expect(proguard.toLowerCase()).toContain("filament");
    expect(existsSync(resolve(root, "app/proguard-rules.pro"))).toBe(true);

    const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain(":app:bundleRelease");
  });
});
