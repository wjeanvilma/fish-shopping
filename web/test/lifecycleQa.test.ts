import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AudioBus } from "../src/audio/audioBus";
import {
  CONTEXT_LOSS_BANNER,
  LIFECYCLE_CURRENT_SCHEMA,
  LIFECYCLE_LEGACY_VERSIONS,
  LIFECYCLE_MIGRATE_THROUGH_SCHEMA,
  LIFECYCLE_PHASE,
  LIFECYCLE_SCHEMA,
  STORAGE_UNAVAILABLE_SETTINGS,
  STORAGE_UNAVAILABLE_TOAST,
  WEBGL2_GATE_COPY,
  androidConfigChanges,
  audioUnlockEvents,
  shouldCheckpointOnPageHide,
  shouldPauseForVisibility,
  shouldSuspendAudioWhenHidden,
} from "../src/game/lifecyclePolicy";
import { openSaveStore } from "../src/game/saveStore";
import { decodeSnapshot, encodeSnapshot, loadContent } from "../src/engine";
import contentJson from "../../shared/content/content-pack.json";

const root = resolve(__dirname, "../..");
const content = loadContent(contentJson);

describe("lifecycle QA (Phase 28)", () => {
  const catalog = JSON.parse(
    readFileSync(resolve(root, "shared/lifecycle/browser-lifecycle.json"), "utf8"),
  );

  it("documents web + Android lifecycle gates", () => {
    expect(catalog.phase).toBe(LIFECYCLE_PHASE);
    expect(catalog.schema).toBe(LIFECYCLE_SCHEMA);
    expect(catalog.web.webgl2Required).toBe(true);
    expect(catalog.web.webgl2GateCopy).toBe(WEBGL2_GATE_COPY);
    expect(catalog.web.contextLoss.reloadHarborOnRestore).toBe(true);
    expect(catalog.web.contextLoss.bannerCopy).toBe(CONTEXT_LOSS_BANNER);
    expect(catalog.web.storageUnavailable.fallback).toBe("memory");
    expect(catalog.web.storageUnavailable.titleToast).toBe(STORAGE_UNAVAILABLE_TOAST);
    expect(catalog.web.storageUnavailable.settingsLabel).toBe(STORAGE_UNAVAILABLE_SETTINGS);
    expect(catalog.web.audioGesture.unlockEvents).toEqual([...audioUnlockEvents()]);
    expect(catalog.web.tabLifecycle.pauseOnVisibilityHidden).toBe(true);
    expect(catalog.web.tabLifecycle.checkpointOnPageHide).toBe(true);
    expect(catalog.web.tabLifecycle.suspendAudioWhenHidden).toBe(true);
    expect(catalog.android.pauseSimOnStop).toBe(true);
    expect(catalog.android.checkpointOnStop).toBe(true);
    expect(catalog.android.screenOrientation).toBe("fullSensor");
    expect(catalog.android.configChangesHandled).toEqual([...androidConfigChanges()]);
    expect(catalog.android.audioFocus.usage).toBe("USAGE_GAME");
    expect(catalog.android.audioFocus.silenceOnLoss).toBe(true);
    expect(catalog.fixtures.migrateThroughSchema).toBe(LIFECYCLE_MIGRATE_THROUGH_SCHEMA);
    expect(catalog.fixtures.currentSchema).toBe(LIFECYCLE_CURRENT_SCHEMA);
    expect(catalog.fixtures.requiredLegacyVersions).toEqual([...LIFECYCLE_LEGACY_VERSIONS]);
  });

  it("wires visibility / pagehide / audio gesture policy helpers", () => {
    expect(shouldPauseForVisibility(true)).toBe(true);
    expect(shouldPauseForVisibility(false)).toBe(false);
    expect(shouldCheckpointOnPageHide()).toBe(true);
    expect(shouldSuspendAudioWhenHidden(true)).toBe(true);
    expect(shouldSuspendAudioWhenHidden(false)).toBe(false);
    expect(audioUnlockEvents()).toEqual(["pointerdown", "keydown", "touchstart"]);
  });

  it("falls back to memory save store when IndexedDB is unavailable", async () => {
    const store = await openSaveStore();
    expect(store.persistent).toBe(false);
    await store.write("lifecycle-a", true);
    expect(await store.readCandidates()).toEqual([["latest", "lifecycle-a"]]);
  });

  it("tracks audio unlock and lifecycle suspend without clearing unlock", () => {
    const bus = new AudioBus();
    expect(bus.isUnlocked).toBe(false);
    bus.unlock();
    expect(bus.isUnlocked).toBe(true);
    bus.suspendForLifecycle();
    expect(bus.isUnlocked).toBe(true);
    bus.resumeForLifecycle();
    expect(bus.isUnlocked).toBe(true);
  });

  it("ships Android manifest rotation + backup wiring for process death", () => {
    const manifest = readFileSync(resolve(root, "app/src/main/AndroidManifest.xml"), "utf8");
    expect(manifest).toContain('android:screenOrientation="fullSensor"');
    expect(manifest).toContain("orientation|screenSize|screenLayout|smallestScreenSize|keyboardHidden");
    for (const change of androidConfigChanges()) {
      expect(manifest).toContain(change);
    }
    expect(manifest).toContain("@xml/data_extraction_rules");
    expect(manifest).toContain("@xml/backup_rules");
  });

  it("migrates every required legacy fixture through schema 19+ to current", () => {
    const legacyDir = resolve(root, "shared/fixtures/legacy");
    const files = readdirSync(legacyDir).filter((f) => f.endsWith(".json"));
    for (const version of LIFECYCLE_LEGACY_VERSIONS) {
      const name = `snapshot-v${version}-starter-line-t2500.json`;
      expect(existsSync(resolve(legacyDir, name)), `missing ${name}`).toBe(true);
      const raw = readFileSync(resolve(legacyDir, name), "utf8").trimEnd();
      const envelope = JSON.parse(raw);
      expect(envelope.schemaVersion).toBe(version);
      expect(version).toBeLessThanOrEqual(LIFECYCLE_MIGRATE_THROUGH_SCHEMA);
      const state = decodeSnapshot(content, raw);
      expect(state.tick).toBe(2500);
      const encoded = encodeSnapshot(content, state);
      expect(encoded.startsWith(`{"schemaVersion":${LIFECYCLE_CURRENT_SCHEMA},`)).toBe(true);
      expect(typeof state.fullHarborUnlock).toBe("boolean");
    }
    expect(files.length).toBeGreaterThanOrEqual(LIFECYCLE_LEGACY_VERSIONS.length);
  });
});
