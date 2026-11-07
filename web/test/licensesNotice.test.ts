import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LICENSES_SCREEN_TITLE,
  LICENSES_UI_PHASE,
  licensesCatalog,
  licensesDisplayLines,
  ossHeadline,
} from "../src/store/licenses";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("licenses & OSS notice (post-1.0 Phase 12)", () => {
  it("ships Filament + Three + React notices for the in-app screen", () => {
    expect(LICENSES_UI_PHASE).toBe(12);
    expect(LICENSES_SCREEN_TITLE).toContain("Licenses");
    expect((storeListing as { licensesUiPhase?: number }).licensesUiPhase).toBe(12);
    const ids = licensesCatalog.ossNotices.map((n) => n.id);
    for (const need of licensesCatalog.requiredOssIds) {
      expect(ids).toContain(need);
    }
    const filament = licensesCatalog.ossNotices.find((n) => n.id === "filament")!;
    expect(filament.spdx).toBe("Apache-2.0");
    expect(ossHeadline(filament)).toContain("Filament");
    const three = licensesCatalog.ossNotices.find((n) => n.id === "three")!;
    expect(three.spdx).toBe("MIT");
    const lines = licensesDisplayLines();
    expect(lines.join("\n")).toContain("Filament");
    expect(lines.join("\n")).toContain("three.js");
  });

  it("pins match package.json / libs.versions.toml", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "web/package.json"), "utf8"));
    const toml = readFileSync(resolve(root, "gradle/libs.versions.toml"), "utf8");
    const three = licensesCatalog.ossNotices.find((n) => n.id === "three")!;
    const react = licensesCatalog.ossNotices.find((n) => n.id === "react")!;
    const filament = licensesCatalog.ossNotices.find((n) => n.id === "filament")!;
    const kotlin = licensesCatalog.ossNotices.find((n) => n.id === "kotlin")!;
    expect(pkg.dependencies.three).toBe(three.version);
    expect(pkg.dependencies.react).toBe(react.version);
    expect(toml).toContain(`filament = "${filament.version}"`);
    expect(toml).toContain(`kotlin = "${kotlin.version}"`);
  });

  it("licenses:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-licenses.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK licenses:validate");
  });
});
