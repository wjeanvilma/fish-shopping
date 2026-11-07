import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cappedShakeAmplitudeM,
  MAX_SHAKE_AMPLITUDE_M,
  ScreenShake,
  SHAKE_SCALE_BY_QUALITY,
  VFX_BURST_POOL_BY_QUALITY,
  resolveCatchBurst,
} from "../src/render/presenters";
import { VFX_JUICE_PHASE, VFX_JUICE_SCHEMA, vfxJuice } from "../src/render/vfxJuice";
import { perfBudgetGate } from "../src/render/perfBudgetGate";

const root = resolve(__dirname, "../..");

describe("VFX juice (post-1.0 Phase 21)", () => {
  it("locks catch/cut/sale feedback and shake caps under the perf gate", () => {
    expect(VFX_JUICE_PHASE).toBe(21);
    expect(VFX_JUICE_SCHEMA).toBe("fish.perf.vfx_juice.v1");
    expect(vfxJuice.bursts.kinds).toEqual(["catch", "pay", "celebrate", "machine_done"]);
    expect(vfxJuice.feedback.catchBurstOnEveryCatch).toBe(true);
    expect(vfxJuice.shake.maxAmplitudeM).toBe(MAX_SHAKE_AMPLITUDE_M);
    expect(vfxJuice.bursts.poolByQuality).toEqual(VFX_BURST_POOL_BY_QUALITY);
    expect(vfxJuice.bursts.poolByQuality).toEqual(perfBudgetGate.presenterCaps.burst);
    expect(vfxJuice.shake.scaleByQuality).toEqual(SHAKE_SCALE_BY_QUALITY);
    expect((perfBudgetGate as { vfxJuicePhase?: number }).vfxJuicePhase).toBe(21);
  });

  it("caps shake by quality and decays via ScreenShake", () => {
    expect(cappedShakeAmplitudeM("catch", "high")).toBeCloseTo(0.04);
    expect(cappedShakeAmplitudeM("catch", "low")).toBeCloseTo(0.02);
    expect(cappedShakeAmplitudeM("celebrate", "high")).toBeLessThanOrEqual(MAX_SHAKE_AMPLITUDE_M);

    const shake = new ScreenShake();
    shake.setQuality("high");
    shake.trigger("sale");
    const mid = shake.update(0.05);
    expect(Math.hypot(mid.x, mid.y)).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) shake.update(0.05);
    expect(shake.update(0.05)).toEqual({ x: 0, y: 0 });
  });

  it("resolveCatchBurst anchors at the player", () => {
    const cue = resolveCatchBurst({
      player: { xMm: 1200, zMm: 3400 },
    } as any);
    expect(cue).toEqual({ xMm: 1200, zMm: 3400, kind: "catch" });
  });

  it("vfx:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-vfx-juice.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK vfx:validate");
  });
});
