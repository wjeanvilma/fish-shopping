import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canRegisterServiceWorker,
  PWA_SW_SCRIPT,
  registerServiceWorker,
} from "../src/pwa/registerServiceWorker";
import {
  measurePwaShell,
  PWA_SHELL_MARKER,
  PWA_SHELL_PHASE,
} from "../src/ship/pwaShell";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("PWA shell (Finish 3.0 Phase 19)", () => {
  it("locks phase 19 catalog floors", () => {
    expect(PWA_SHELL_PHASE).toBe(19);
    expect(PWA_SHELL_MARKER).toBe("authored-finish-3.0-phase-19");
    expect(PWA_SW_SCRIPT).toBe("./sw.js");
    expect((storeListing as { pwaShellPhase?: number }).pwaShellPhase).toBe(19);
    expect(existsSync(resolve(root, "web/public/sw.js"))).toBe(true);
    expect(existsSync(resolve(root, "web/public/offline.html"))).toBe(true);
  });

  it("measures wiring + closed gap", () => {
    const m = measurePwaShell(root);
    expect(m.schemaVersion).toBeGreaterThanOrEqual(24);
    expect(m.swPresent).toBe(true);
    expect(m.offlinePresent).toBe(true);
    expect(m.manifestStandalone).toBe(true);
    expect(m.registerWired).toBe(true);
    expect(m.mainRegisters).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("register helpers work with mocks", async () => {
    expect(canRegisterServiceWorker({
      serviceWorker: {},
      isSecureContext: false,
      hostname: "localhost",
    })).toBe(true);
    expect(canRegisterServiceWorker({
      serviceWorker: {},
      isSecureContext: false,
      hostname: "evil.example",
    })).toBe(false);

    const fakeReg = {
      scope: "http://localhost/play/",
      active: { scriptURL: "http://localhost/play/sw.js" },
      installing: null,
      waiting: null,
      addEventListener() {},
    };
    const result = await registerServiceWorker({
      register: async () => fakeReg,
    } as unknown as ServiceWorkerContainer);
    expect(result.registered).toBe(true);
    expect(result.scope).toContain("localhost");
  });

  it("sw.js and offline.html ship required copy", () => {
    const sw = readFileSync(resolve(root, "web/public/sw.js"), "utf8");
    expect(sw).toContain("fish-shopping-pwa-v1");
    expect(sw).toContain("notificationclick");
    const offline = readFileSync(resolve(root, "web/public/offline.html"), "utf8");
    expect(offline).toContain("You are offline");
  });

  it("pwa:validate exits 0", () => {
    const out = execFileSync("npm", ["run", "pwa:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK pwa:validate");
  });
});
