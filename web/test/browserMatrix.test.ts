import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BROWSER_MATRIX_PHASE,
  BROWSER_MATRIX_SCHEMA,
  audioUnlockMatchesPolicy,
  browserIds,
  browserMatrix,
  scenarioIds,
} from "../src/game/browserMatrix";
import { audioUnlockEvents } from "../src/game/lifecyclePolicy";
import {
  isQuotaExceededError,
  openMemorySaveStore,
  withQuotaFallback,
} from "../src/game/saveStore";

const root = resolve(__dirname, "../..");

describe("browser matrix (post-1.0 Phase 14)", () => {
  it("covers Chrome / Safari / Firefox for WebGL2, context loss, quota, audio", () => {
    expect(BROWSER_MATRIX_PHASE).toBe(14);
    expect(BROWSER_MATRIX_SCHEMA).toBe("fish.lifecycle.browser_matrix.v1");
    expect(browserIds()).toEqual(["chrome", "firefox", "safari"]);
    expect(scenarioIds()).toEqual([
      "webgl2_gate",
      "context_loss",
      "storage_quota",
      "audio_unlock",
    ]);
    expect(browserMatrix.audioUnlockEvents).toEqual(["pointerdown", "keydown", "touchstart"]);
    expect(audioUnlockEvents()).toEqual(browserMatrix.audioUnlockEvents);
    expect(audioUnlockMatchesPolicy()).toBe(true);
    expect(browserMatrix.webgl2Required).toBe(true);
    expect(browserMatrix.storageQuota.fallback).toBe("memory");
  });

  it("degrades to memory on QuotaExceededError", async () => {
    expect(isQuotaExceededError({ name: "QuotaExceededError" })).toBe(true);
    expect(isQuotaExceededError({ name: "NS_ERROR_DOM_QUOTA_REACHED" })).toBe(true);
    expect(isQuotaExceededError({ name: "TypeError" })).toBe(false);

    const boom: {
      persistent: boolean;
      readCandidates: () => Promise<["latest" | "previous", string][]>;
      write: (s: string, r: boolean) => Promise<void>;
      clear: () => Promise<void>;
    } = {
      persistent: true,
      readCandidates: async () => [],
      write: async () => {
        throw { name: "QuotaExceededError" };
      },
      clear: async () => {},
    };
    const store = withQuotaFallback(boom);
    expect(store.persistent).toBe(true);
    await store.write("after-quota", true);
    expect(store.persistent).toBe(false);
    expect(await store.readCandidates()).toEqual([["latest", "after-quota"]]);

    const mem = openMemorySaveStore();
    expect(mem.persistent).toBe(false);
  });

  it("aligns Phase 28 unlock events and host source", () => {
    const phase28 = JSON.parse(
      readFileSync(resolve(root, "shared/lifecycle/browser-lifecycle.json"), "utf8"),
    );
    expect(phase28.web.browserMatrixPhase).toBe(14);
    expect(phase28.web.audioGesture.unlockEvents).toEqual(browserMatrix.audioUnlockEvents);
    const harbor = readFileSync(resolve(root, "web/src/render/HarborScene.ts"), "utf8");
    expect(harbor).toContain("webglcontextlost");
    expect(harbor).toContain("preventDefault");
  });

  it("lifecycle:browser:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-browser-matrix.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK lifecycle:browser:validate");
  });
});
