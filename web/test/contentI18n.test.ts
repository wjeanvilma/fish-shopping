import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTENT_I18N,
  CONTENT_I18N_MARKER,
  CONTENT_I18N_PHASE,
  measureContentI18n,
} from "../src/ship/contentI18n";
import { contentName, CONTENT_STRING_KEYS } from "../src/i18n/contentStrings";
import { setLocale, t } from "../src/i18n/strings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Content i18n (Finish 3.0 Phase 6)", () => {
  it("locks phase 6 catalog floors", () => {
    expect(CONTENT_I18N_PHASE).toBe(6);
    expect(CONTENT_I18N.contentStringKeyMin).toBe(250);
    expect(CONTENT_I18N.localeCountMin).toBe(3);
    expect(CONTENT_I18N.thirdLocale).toBe("pt");
    expect(CONTENT_I18N_MARKER).toBe("authored-finish-3.0-phase-6");
  });

  it("measures ≥250 content keys and closed gaps", () => {
    const m = measureContentI18n(root);
    expect(m.keysEnough).toBe(true);
    expect(m.keyParity).toBe(true);
    expect(m.gapsClosed).toBe(true);
    expect(m.localesEnough).toBe(true);
    expect(m.itemNameWired).toBe(true);
    expect(CONTENT_STRING_KEYS.length).toBeGreaterThanOrEqual(250);
  });

  it("resolves content + UI in pt", () => {
    setLocale("pt");
    expect(t("nav.pause")).not.toBe("Pause");
    expect(t("settings.languagePt")).toBe("Português");
    expect(contentName("species.silver_sprat")).toBeTruthy();
    setLocale("en");
    expect(contentName("species.silver_sprat")).toBe("Silver sprat");
  });
});
