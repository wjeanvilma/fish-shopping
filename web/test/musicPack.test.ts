import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  duckedMusicGain,
  focusMusicScale,
  musicBedForPanels,
  MUSIC_PACK_PHASE,
  MUSIC_PACK_SCHEMA,
  musicPack,
  musicPublicPath,
} from "../src/audio/musicBeds";

const root = resolve(__dirname, "../..");

describe("music beds (post-1.0 Phase 20)", () => {
  it("locks harbor/shop beds and ducking policy", () => {
    expect(MUSIC_PACK_PHASE).toBe(20);
    expect(MUSIC_PACK_SCHEMA).toBe("fish.audio.music_pack.v1");
    expect(musicPack.defaultBed).toBe("harbor");
    expect(musicPack.replacesProceduralAmbience).toBe(true);
    expect(musicPack.beds.map((b) => b.id)).toEqual(["harbor", "shop", "festival", "storm"]);
    expect(musicPack.ducking.sfxDuckFactor).toBeGreaterThan(0);
    expect(musicPack.ducking.sfxDuckFactor).toBeLessThan(1);
    expect(musicPack.ducking.focusLossSilence).toBe(true);
    expect(musicBedForPanels(false)).toBe("harbor");
    expect(musicBedForPanels(true)).toBe("shop");
    expect(musicBedForPanels(false, true)).toBe("festival");
    expect(musicBedForPanels(true, false, true)).toBe("storm");
    expect(duckedMusicGain(1, true, 0.35)).toBeCloseTo(0.35);
    expect(duckedMusicGain(1, false)).toBe(1);
    expect(focusMusicScale("gain")).toBe(1);
    expect(focusMusicScale("loss")).toBe(0);
    expect(focusMusicScale("duck")).toBe(musicPack.ducking.focusTransientCanDuckFactor);
  });

  it("mirrors WAV bytes across shared / web / android raw under size budget", () => {
    let total = 0;
    for (const bed of musicPack.beds) {
      const src = resolve(root, musicPack.sourceDir, bed.file);
      const web = resolve(root, musicPack.webPublicDir, bed.file);
      const raw = resolve(root, musicPack.androidRawDir, `${bed.androidRaw}.wav`);
      expect(existsSync(src)).toBe(true);
      expect(existsSync(web)).toBe(true);
      expect(existsSync(raw)).toBe(true);
      const a = createHash("sha256").update(readFileSync(src)).digest("hex");
      expect(a).toBe(createHash("sha256").update(readFileSync(web)).digest("hex"));
      expect(a).toBe(createHash("sha256").update(readFileSync(raw)).digest("hex"));
      total += statSync(src).size;
      expect(musicPublicPath(bed.id)).toBe(`/music/${bed.file}`);
    }
    expect(total).toBeLessThanOrEqual(musicPack.maxTotalBytes);
  });

  it("music:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-music-pack.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK music:validate");
  });
});
