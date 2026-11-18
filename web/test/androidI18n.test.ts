import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANDROID_I18N,
  ANDROID_I18N_MARKER,
  ANDROID_I18N_PHASE,
  measureAndroidI18n,
} from "../src/ship/androidI18n";
import { UI_STRING_KEYS, t, setLocale } from "../src/i18n/strings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Android i18n (Finish 3.0 Phase 5)", () => {
  it("locks phase 5 catalog floors", () => {
    expect(ANDROID_I18N_PHASE).toBe(5);
    expect(ANDROID_I18N.uiStringKeyMin).toBe(120);
    expect(ANDROID_I18N.androidTextLiteralsMax).toBe(0);
    expect(ANDROID_I18N_MARKER).toBe("authored-finish-3.0-phase-5");
  });

  it("measures ≥120 keys and zero HUD Text(\" literals", () => {
    const m = measureAndroidI18n(root);
    expect(m.keysEnough).toBe(true);
    expect(m.keyParity).toBe(true);
    expect(m.textLiterals).toBe(0);
    expect(m.gapClosed).toBe(true);
    expect(m.enKeys).toBeGreaterThanOrEqual(120);
    expect(m.uiStringsCalls).toBeGreaterThanOrEqual(100);
  });

  it("resolves new Phase 5 keys in en + es", () => {
    expect(UI_STRING_KEYS.length).toBeGreaterThanOrEqual(120);
    setLocale("en");
    expect(t("offline.title")).toBe("While you were away");
    setLocale("es");
    expect(t("offline.title")).toBe("Mientras no estabas");
    setLocale("en");
  });
});
