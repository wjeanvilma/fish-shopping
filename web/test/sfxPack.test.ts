import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SFX_CUES, sfxFromEvent, sfxPublicPath } from "../src/audio/sfxCues";
import { SFX_PACK_PHASE, SFX_PACK_SCHEMA, sfxPack } from "../src/audio/sfxPack";
import { canSpawnVoices, MAX_SFX_VOICES, voicesForCue } from "../src/audio/audioBus";

const root = resolve(__dirname, "../..");

describe("authored SFX pack (post-1.0 Phase 19)", () => {
  it("locks catch/cut/sell/ui roles and bus policy", () => {
    expect(SFX_PACK_PHASE).toBe(19);
    expect(SFX_PACK_SCHEMA).toBe("fish.audio.sfx_pack.v1");
    expect(sfxPack.sampleRate).toBe(22050);
    expect(sfxPack.voiceCostPerClip).toBe(1);
    expect(sfxPack.busPolicy.proceduralFallback).toBe(false);
    expect(sfxPack.busPolicy.ambienceRemainsProceduralUntilPhase).toBe(20);
    const roles = new Set(sfxPack.cues.map((c) => c.role));
    for (const role of ["catch", "cut", "sell", "ui"]) {
      expect(roles.has(role)).toBe(true);
    }
    expect(SFX_CUES).toEqual(sfxPack.cues.map((c) => c.id));
  });

  it("mirrors WAV bytes across shared / web / android raw", () => {
    let total = 0;
    for (const cue of sfxPack.cues) {
      const src = resolve(root, sfxPack.sourceDir, cue.file);
      const web = resolve(root, sfxPack.webPublicDir, cue.file);
      const raw = resolve(root, sfxPack.androidRawDir, `${cue.androidRaw}.wav`);
      expect(existsSync(src), src).toBe(true);
      expect(existsSync(web), web).toBe(true);
      expect(existsSync(raw), raw).toBe(true);
      const a = createHash("sha256").update(readFileSync(src)).digest("hex");
      const b = createHash("sha256").update(readFileSync(web)).digest("hex");
      const c = createHash("sha256").update(readFileSync(raw)).digest("hex");
      expect(a).toBe(b);
      expect(a).toBe(c);
      total += statSync(src).size;
      expect(sfxPublicPath(cue.id as "catch")).toBe(`/sfx/${cue.file}`);
    }
    expect(total).toBeLessThanOrEqual(sfxPack.maxTotalBytes);
  });

  it("maps events including panel_opened → ui; clips cost 1 voice", () => {
    expect(sfxFromEvent({ type: "panel_opened" })).toBe("ui");
    expect(sfxFromEvent({ type: "fish_caught" })).toBe("catch");
    expect(voicesForCue("upgrade")).toBe(1);
    expect(voicesForCue("rush")).toBe(1);
    expect(canSpawnVoices(MAX_SFX_VOICES - 1, 1)).toBe(true);
    expect(canSpawnVoices(MAX_SFX_VOICES, 1)).toBe(false);
  });

  it("sfx:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-sfx-pack.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK sfx:validate");
  });
});
