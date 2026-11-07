import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLOUD_PRODUCTION_PATH,
  CLOUD_PRODUCTION_PHASE,
  cloudDocumentPathFor,
  cloudProductionReadiness,
  readWebFirebaseEnv,
  WEB_FIREBASE_ENV_KEYS,
} from "../src/cloud/cloudProductionPath";
import { FirestoreRestBackend, MemoryCloudBackend, type CloudBackend } from "../src/cloud/cloudBackend";
import { CloudSyncCoordinator } from "../src/cloud/cloudSyncCoordinator";
import {
  clearCloudOfflineQueue,
  cloudOfflineQueuePending,
  enqueueCloudOfflineSnapshot,
  loadCloudOfflineQueue,
} from "../src/cloud/cloudOfflineQueue";

const root = resolve(__dirname, "../..");

function baseSettings(over: Record<string, unknown> = {}) {
  return {
    muted: false, musicVolume: 0.7 as const, sfxVolume: 1 as const, hapticsEnabled: true,
    quality: "medium" as const, joystickSide: "left" as const, joystickScale: 1 as const,
    tapToMove: false, cloudSyncEnabled: true, showBalanceStrip: false,
    reducedMotion: false, captionsEnabled: true,
    hudTextScale: 1 as const, shapeCues: false, timingAssist: false,
    analyticsConsent: false, analyticsConsentDecided: false,
    cloudAccountId: "user-stable", cloudRefreshToken: null as string | null,
    equippedCosmeticId: null as string | null,
    ...over,
  };
}

class FailingPutBackend implements CloudBackend {
  readonly kind = "failing-put";
  readonly available = true;
  constructor(private readonly inner: MemoryCloudBackend = new MemoryCloudBackend()) {}
  ensureAccount(existingUid: string | null, refreshToken: string | null) {
    return this.inner.ensureAccount(existingUid, refreshToken);
  }
  get(uid: string) { return this.inner.get(uid); }
  async put(): Promise<void> { throw new Error("network down"); }
  clear(uid: string) { return this.inner.clear(uid); }
}

const memory = new Map<string, string>();

describe("cloudProductionPath (Phase 25)", () => {
  beforeEach(() => {
    memory.clear();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => { memory.set(k, v); },
      removeItem: (k) => { memory.delete(k); },
      clear: () => memory.clear(),
      key: () => null,
      get length() { return memory.size; },
    };
  });

  afterEach(() => {
    clearCloudOfflineQueue();
    vi.unstubAllGlobals();
  });

  it("documents web + android env keys, offline queue, and snippet-only rules", () => {
    const catalog = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/cloud/production-path.json"), "utf8"),
    );
    expect(CLOUD_PRODUCTION_PHASE).toBe(25);
    expect(CLOUD_PRODUCTION_PATH.phase).toBe(25);
    expect(CLOUD_PRODUCTION_PATH).toEqual(catalog);
    expect(WEB_FIREBASE_ENV_KEYS).toEqual(["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID"]);
    expect(CLOUD_PRODUCTION_PATH.envKeys.android.map((k) => k.name)).toEqual([
      "fish.firebase.apiKey",
      "fish.firebase.projectId",
    ]);
    expect(CLOUD_PRODUCTION_PATH.firestoreRules).toBe(
      "shared/cloud/snippets/firestore-harbor-save.rules",
    );
    expect(CLOUD_PRODUCTION_PATH.firestoreRulesMode).toBe("snippet_only_not_deployed");
    expect(CLOUD_PRODUCTION_PATH.finish2FirestoreSnippetPhase).toBe(26);
    expect(CLOUD_PRODUCTION_PATH.guestRecovery.persisted).toContain("cloudRefreshToken");
    expect(CLOUD_PRODUCTION_PATH.offlineQueue.enabled).toBe(true);
    expect(CLOUD_PRODUCTION_PATH.offlineQueue.policy).toBe("latest_snapshot_wins");
    expect(CLOUD_PRODUCTION_PATH.offlineQueue.flushOn).toEqual([
      "save_retry",
      "app_resume",
      "online_event",
      "settings_enable",
    ]);
    expect(CLOUD_PRODUCTION_PATH.cutoverChecklist.length).toBeGreaterThanOrEqual(4);
    expect(cloudDocumentPathFor("abc")).toBe("users/abc/saves/harbor");

    const envExample = readFileSync(resolve(__dirname, "../.env.example"), "utf8");
    expect(envExample).toContain("VITE_FIREBASE_API_KEY=");
    expect(envExample).toContain("VITE_FIREBASE_PROJECT_ID=");
    const androidExample = readFileSync(resolve(__dirname, "../../local.properties.example"), "utf8");
    expect(androidExample).toContain("fish.firebase.apiKey=");
    expect(androidExample).toContain("fish.firebase.projectId=");
  });

  it("reports readiness without keys and with keys + offline queue", () => {
    const missing = cloudProductionReadiness({});
    expect(missing.keysConfigured).toBe(false);
    expect(missing.missingKeys).toEqual(WEB_FIREBASE_ENV_KEYS);
    expect(missing.conflictUiShipped).toBe(true);
    expect(missing.firestoreRulesInRepo).toBe(false);
    expect(missing.firestoreRulesSnippetShipped).toBe(true);
    expect(missing.offlineQueueEnabled).toBe(true);

    const ready = cloudProductionReadiness({
      VITE_FIREBASE_API_KEY: "k",
      VITE_FIREBASE_PROJECT_ID: "p",
    });
    expect(ready.keysConfigured).toBe(true);
    expect(readWebFirebaseEnv({
      VITE_FIREBASE_API_KEY: "k",
      VITE_FIREBASE_PROJECT_ID: "p",
    }).missing).toEqual([]);
  });

  it("ships Phase 11 conflict UI wiring in App", () => {
    const app = readFileSync(resolve(__dirname, "../src/ui/App.tsx"), "utf8");
    expect(app).toContain("CloudConflictPanel");
    expect(app).toContain("cloudConflict");
    expect(app).toContain("Use cloud");
    expect(app).toContain("pending upload");
    expect(app).toContain('addEventListener("online"');
  });

  it("offline queue keeps latest snapshot only", () => {
    enqueueCloudOfflineSnapshot("snap-a", "uid-1", 1000);
    enqueueCloudOfflineSnapshot("snap-b", "uid-1", 2000);
    const pending = loadCloudOfflineQueue();
    expect(pending?.snapshot).toBe("snap-b");
    expect(pending?.queuedAtEpochMs).toBe(2000);
    expect(cloudOfflineQueuePending()).toBe(true);
    clearCloudOfflineQueue();
    expect(cloudOfflineQueuePending()).toBe(false);
  });

  it("coordinator enqueues on push failure and flushes later", async () => {
    const failing = new FailingPutBackend();
    const coord = new CloudSyncCoordinator(failing);
    const settings = baseSettings();
    const push = await coord.push(settings, "snap-queued");
    expect(push.uploaded).toBe(false);
    expect(push.queued).toBe(true);
    expect(coord.hasPendingOfflinePush()).toBe(true);

    const memory = new MemoryCloudBackend();
    const recovery = new CloudSyncCoordinator(memory);
    enqueueCloudOfflineSnapshot("snap-queued", "user-stable", 3000);
    const flushed = await recovery.flushOfflineQueue(settings);
    expect(flushed.uploaded).toBe(true);
    expect(flushed.queued).toBe(false);
    expect(await memory.get("user-stable")).toBe("snap-queued");
    expect(cloudOfflineQueuePending()).toBe(false);
  });

  it("restores anonymous uid via refresh token before minting a new one", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("securetoken.googleapis.com")) {
        expect(String(init?.body)).toContain("grant_type=refresh_token");
        expect(String(init?.body)).toContain("refresh-abc");
        return new Response(JSON.stringify({
          user_id: "uid-restored",
          id_token: "id-1",
          refresh_token: "refresh-abc",
        }), { status: 200 });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const backend = new FirestoreRestBackend({ apiKey: "test-key", projectId: "test-proj" });
    const session = await backend.ensureAccount("uid-old", "refresh-abc");
    expect(session.uid).toBe("uid-restored");
    expect(session.refreshToken).toBe("refresh-abc");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("coordinator persists refresh token from ensureAccount", async () => {
    const backend = new MemoryCloudBackend();
    const coord = new CloudSyncCoordinator(backend);
    const { settings, uid } = await coord.ensureAccount(baseSettings({ cloudAccountId: "user-stable" }));
    expect(uid).toBe("user-stable");
    expect(settings.cloudAccountId).toBe("user-stable");
    expect(settings.cloudRefreshToken).toBeNull();
  });

  it("cloud:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-cloud-cutover.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK cloud:validate");
  });
});
