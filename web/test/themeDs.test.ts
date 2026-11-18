import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { measureThemeDs, THEME_DS, THEME_DS_MARKER, THEME_DS_PHASE } from "../src/ship/themeDs";
import { resolveThemeMode } from "../src/game/settingsStore";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Theme DS (Finish 3.0 Phase 7)", () => {
  it("locks phase 7 catalog floors", () => {
    expect(THEME_DS_PHASE).toBe(7);
    expect(THEME_DS.defaultThemePreference).toBe("system");
    expect(THEME_DS.themePreferences).toEqual(["system", "light", "dark"]);
    expect(THEME_DS_MARKER).toBe("authored-finish-3.0-phase-7");
  });

  it("measures dark tokens, settings, and DS primitives", () => {
    const m = measureThemeDs(root);
    expect(m.darkKeysPresent).toBe(true);
    expect(m.themePrefsOk).toBe(true);
    expect(m.androidThemeWired).toBe(true);
    expect(m.androidDsWired).toBe(true);
    expect(m.webDarkCss).toBe(true);
    expect(m.webDsWired).toBe(true);
    expect(m.settingsAndroid).toBe(true);
    expect(m.settingsWeb).toBe(true);
    expect(m.gapClosed).toBe(true);
  });

  it("resolves theme preference modes", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });
});
