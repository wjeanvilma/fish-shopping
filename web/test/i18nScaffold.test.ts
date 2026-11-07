import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  I18N_SCAFFOLD_PHASE,
  SECOND_LOCALE,
  UI_STRING_KEY_FLOOR,
} from "../src/ship/i18nScaffold";
import { resolveLocale, setLocale, t, uiStringKeyCount } from "../src/i18n/strings";

const root = resolve(__dirname, "../..");

describe("i18n scaffold (Finish 2.0 Phase 23)", () => {
  it("locks catalog floors and locales", () => {
    expect(I18N_SCAFFOLD_PHASE).toBe(23);
    expect(DEFAULT_LOCALE).toBe("en");
    expect(SECOND_LOCALE).toBe("es");
    expect(UI_STRING_KEY_FLOOR).toBe(48);
    expect(uiStringKeyCount("en")).toBeGreaterThanOrEqual(48);
    expect(uiStringKeyCount("es")).toBe(uiStringKeyCount("en"));
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        i18nScaffoldPhase?: number;
        locales?: string[];
      }).i18nScaffoldPhase,
    ).toBe(23);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing-copy.json"), "utf8")) as {
        locales?: string[];
      }).locales,
    ).toEqual(["en", "es"]);
  });

  it("resolves t() with en fallback and es override", () => {
    expect(resolveLocale("es")).toBe("es");
    expect(resolveLocale("fr")).toBe("en");
    setLocale("en");
    expect(t("nav.pause")).toBe("Pause");
    setLocale("es");
    expect(t("nav.pause")).toBe("Pausa");
    expect(t("achievements.count", { unlocked: 2, total: 14 })).toBe("2/14");
    setLocale("en");
  });

  it("i18n:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-i18n-scaffold.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK i18n:validate");
  });
});
