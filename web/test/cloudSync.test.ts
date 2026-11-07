import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { chooseCloudSnapshot, cloudConflictOffer, peekSnapshot } from "../src/engine/cloudSync";
import { GameState, encodeSnapshot, loadContent } from "../src/engine";
import { MemoryCloudBackend } from "../src/cloud/cloudBackend";
import { CloudSyncCoordinator } from "../src/cloud/cloudSyncCoordinator";
import { cloudConflictView } from "../src/game/snapshotChoice";

const content = loadContent(JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")));

describe("chooseCloudSnapshot", () => {
  it("picks the newest checksum-valid envelope", () => {
    const older = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 1), 1_000);
    const newer = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 2), 2_000);
    const decision = chooseCloudSnapshot(older, newer);
    expect(decision.source).toBe("remote");
    expect(decision.text).toBe(newer);
    expect(chooseCloudSnapshot(newer, older).source).toBe("local");
  });

  it("ignores corrupt remote and keeps local", () => {
    const local = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 3), 5_000);
    const decision = chooseCloudSnapshot(local, '{"schemaVersion":12,"checksum":"deadbeef","state":{}}');
    expect(decision.source).toBe("local");
    expect(decision.text).toBe(local);
    expect(cloudConflictOffer(local, '{"schemaVersion":12,"checksum":"deadbeef","state":{}}')).toBeNull();
  });

  it("keeps local on equal age with different checksums", () => {
    const a = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 4), 9_000);
    const b = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 5), 9_000);
    expect(peekSnapshot(a)?.savedAtEpochMs).toBe(9_000);
    expect(chooseCloudSnapshot(a, b).source).toBe("local");
  });

  it("treats identical checksum as local no-op", () => {
    const snap = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 6), 3_000);
    const d = chooseCloudSnapshot(snap, snap);
    expect(d.source).toBe("local");
    expect(d.reason).toContain("identical");
  });

  it("peeks coins, harbor, and tick for conflict summaries", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 11);
    state.coins = 77;
    state.tick = 600;
    const snap = encodeSnapshot(content, state, 4_000);
    const peeked = peekSnapshot(snap)!;
    expect(peeked.harborId).toBe("harbor.sunrise_pier");
    expect(peeked.coins).toBe(77);
    expect(peeked.tick).toBe(600);
  });

  it("surfaces dual-snapshot conflict offer with recommended policy side", () => {
    const olderState = GameState.newGame(content, "harbor.sunrise_pier", 7);
    olderState.coins = 50;
    olderState.tick = 400;
    const newerState = GameState.newGame(content, "harbor.moon_cove", 8);
    newerState.coins = 200;
    newerState.tick = 2_000;
    const older = encodeSnapshot(content, olderState, 1_000);
    const newer = encodeSnapshot(content, newerState, 9_000);
    const offer = cloudConflictOffer(older, newer)!;
    expect(offer.recommended).toBe("remote");
    expect(offer.reason).toBe("remote newer");
    expect(offer.local.coins).toBe(50);
    expect(offer.remote.coins).toBe(200);
    expect(offer.local.harborId).toBe("harbor.sunrise_pier");
    expect(offer.remote.harborId).toBe("harbor.moon_cove");
    expect(offer.local.tick).toBe(400);
    expect(offer.remote.tick).toBe(2_000);
    expect(cloudConflictOffer(older, older)).toBeNull();

    const view = cloudConflictView(offer, content, 10_000);
    expect(view.local.sourceLabel).toBe("This device");
    expect(view.remote.sourceLabel).toBe("Cloud");
    expect(view.remote.recommended).toBe(true);
    expect(view.local.recommended).toBe(false);
    expect(view.local.playtimeLabel).toContain("s");
    expect(view.remote.harborName.length).toBeGreaterThan(0);
  });
});

describe("CloudSyncCoordinator + MemoryCloudBackend", () => {
  it("pulls a newer remote over local when sync is enabled and parks conflict", async () => {
    const backend = new MemoryCloudBackend();
    const coord = new CloudSyncCoordinator(backend);
    const older = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 7), 1_000);
    const newer = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 8), 9_000);
    const settings = {
      muted: false, musicVolume: 0.7 as const, sfxVolume: 1 as const, hapticsEnabled: true,
      quality: "medium" as const, joystickSide: "left" as const, joystickScale: 1 as const,
      tapToMove: false, cloudSyncEnabled: true, showBalanceStrip: false,
      reducedMotion: false, captionsEnabled: true,
      hudTextScale: 1 as const, shapeCues: false, timingAssist: false,
      analyticsConsent: false, analyticsConsentDecided: false,
      cloudAccountId: "user-test", cloudRefreshToken: null,
    };
    await backend.put("user-test", newer);
    const pull = await coord.pullMerge(settings, older);
    expect(pull.decision.source).toBe("remote");
    expect(pull.decision.text).toBe(newer);
    expect(pull.conflict).not.toBeNull();
    expect(pull.conflict?.recommended).toBe("remote");
  });

  it("does nothing when sync is off", async () => {
    const backend = new MemoryCloudBackend();
    const coord = new CloudSyncCoordinator(backend);
    const local = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 9), 1_000);
    await backend.put("user-test", encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 10), 9_000));
    const pull = await coord.pullMerge({
      muted: false, musicVolume: 0.7, sfxVolume: 1, hapticsEnabled: true,
      quality: "medium", joystickSide: "left", joystickScale: 1,
      tapToMove: false, cloudSyncEnabled: false, showBalanceStrip: false,
      reducedMotion: false, captionsEnabled: true,
      hudTextScale: 1, shapeCues: false, timingAssist: false,
      analyticsConsent: false, analyticsConsentDecided: false,
      cloudAccountId: "user-test", cloudRefreshToken: null,
    }, local);
    expect(pull.decision.source).toBe("local");
    expect(pull.decision.reason).toContain("off");
    expect(pull.conflict).toBeNull();
  });
});
