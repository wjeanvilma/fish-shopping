import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { chooseCloudSnapshot, peekSnapshot } from "../src/engine/cloudSync";
import { GameState, encodeSnapshot, loadContent } from "../src/engine";
import { MemoryCloudBackend } from "../src/cloud/cloudBackend";
import { CloudSyncCoordinator } from "../src/cloud/cloudSyncCoordinator";

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
    const decision = chooseCloudSnapshot(local, '{"schemaVersion":10,"checksum":"deadbeef","state":{}}');
    expect(decision.source).toBe("local");
    expect(decision.text).toBe(local);
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
});

describe("CloudSyncCoordinator + MemoryCloudBackend", () => {
  it("pulls a newer remote over local when sync is enabled", async () => {
    const backend = new MemoryCloudBackend();
    const coord = new CloudSyncCoordinator(backend);
    const older = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 7), 1_000);
    const newer = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 8), 9_000);
    const settings = {
      muted: false, quality: "medium" as const, joystickSide: "left" as const, joystickScale: 1 as const,
      tapToMove: false, cloudSyncEnabled: true, cloudAccountId: "user-test",
    };
    await backend.put("user-test", newer);
    const pull = await coord.pullMerge(settings, older);
    expect(pull.decision.source).toBe("remote");
    expect(pull.decision.text).toBe(newer);
  });

  it("does nothing when sync is off", async () => {
    const backend = new MemoryCloudBackend();
    const coord = new CloudSyncCoordinator(backend);
    const local = encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 9), 1_000);
    await backend.put("user-test", encodeSnapshot(content, GameState.newGame(content, "harbor.sunrise_pier", 10), 9_000));
    const pull = await coord.pullMerge({
      muted: false, quality: "medium", joystickSide: "left", joystickScale: 1,
      tapToMove: false, cloudSyncEnabled: false, cloudAccountId: "user-test",
    }, local);
    expect(pull.decision.source).toBe("local");
    expect(pull.decision.reason).toContain("off");
  });
});
