import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CLOUD_PRODUCTION_PATH,
  cloudDocumentPathFor,
  cloudProductionReadiness,
  readWebFirebaseEnv,
  WEB_FIREBASE_ENV_KEYS,
} from "../src/cloud/cloudProductionPath";
import { FirestoreRestBackend } from "../src/cloud/cloudBackend";
import { CloudSyncCoordinator } from "../src/cloud/cloudSyncCoordinator";
import { MemoryCloudBackend } from "../src/cloud/cloudBackend";

describe("cloudProductionPath (Phase 22)", () => {
  it("documents web + android env keys and keeps rules out of repo", () => {
    const catalog = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/cloud/production-path.json"), "utf8"),
    );
    expect(CLOUD_PRODUCTION_PATH.phase).toBe(22);
    expect(CLOUD_PRODUCTION_PATH).toEqual(catalog);
    expect(WEB_FIREBASE_ENV_KEYS).toEqual(["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID"]);
    expect(CLOUD_PRODUCTION_PATH.envKeys.android.map((k) => k.name)).toEqual([
      "fish.firebase.apiKey",
      "fish.firebase.projectId",
    ]);
    expect(CLOUD_PRODUCTION_PATH.firestoreRules).toBe("not_shipped_ask_for_snippet");
    expect(CLOUD_PRODUCTION_PATH.guestRecovery.persisted).toContain("cloudRefreshToken");
    expect(cloudDocumentPathFor("abc")).toBe("users/abc/saves/harbor");

    const envExample = readFileSync(resolve(__dirname, "../.env.example"), "utf8");
    expect(envExample).toContain("VITE_FIREBASE_API_KEY=");
    expect(envExample).toContain("VITE_FIREBASE_PROJECT_ID=");
    const androidExample = readFileSync(resolve(__dirname, "../../local.properties.example"), "utf8");
    expect(androidExample).toContain("fish.firebase.apiKey=");
    expect(androidExample).toContain("fish.firebase.projectId=");
  });

  it("reports readiness without keys and with keys", () => {
    const missing = cloudProductionReadiness({});
    expect(missing.keysConfigured).toBe(false);
    expect(missing.missingKeys).toEqual(WEB_FIREBASE_ENV_KEYS);
    expect(missing.conflictUiShipped).toBe(true);
    expect(missing.firestoreRulesInRepo).toBe(false);

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

    vi.unstubAllGlobals();
  });

  it("coordinator persists refresh token from ensureAccount", async () => {
    const backend = new MemoryCloudBackend();
    const coord = new CloudSyncCoordinator(backend);
    const { settings, uid } = await coord.ensureAccount({
      muted: false, musicVolume: 0.7, sfxVolume: 1, hapticsEnabled: true,
      quality: "medium", joystickSide: "left", joystickScale: 1,
      tapToMove: false, cloudSyncEnabled: true, showBalanceStrip: false,
      reducedMotion: false, captionsEnabled: true,
      hudTextScale: 1, shapeCues: false, timingAssist: false,
      analyticsConsent: false, analyticsConsentDecided: false,
      cloudAccountId: "user-stable", cloudRefreshToken: null,
    });
    expect(uid).toBe("user-stable");
    expect(settings.cloudAccountId).toBe("user-stable");
    // Memory backend has no refresh token — field stays null.
    expect(settings.cloudRefreshToken).toBeNull();
  });
});
