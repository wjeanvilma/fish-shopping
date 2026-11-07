import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PNG } from "../src/store/pngSize";
import {
  SCREENSHOT_CAPTURE_PHASE,
  SCREENSHOT_CAPTURE_SCHEMA,
  capturePath,
  expectedCaptureCount,
  isPlayPixelBounds,
  screenshotCapture,
  sizeFor,
} from "../src/store/screenshotCapture";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("screenshot capture (post-1.0 Phase 9)", () => {
  it("catalog matches listing shots and Play size table", () => {
    expect(SCREENSHOT_CAPTURE_PHASE).toBe(9);
    expect(SCREENSHOT_CAPTURE_SCHEMA).toBe("fish.store.screenshot_capture.v1");
    expect(screenshotCapture.minShots).toBe(7);
    expect(screenshotCapture.shots.map((s) => s.id)).toEqual(
      storeListing.screenshotShots.map((s) => s.id),
    );
    expect(sizeFor("phone", "portrait")).toEqual({ width: 1080, height: 1920, aspect: "9:16" });
    expect(sizeFor("phone", "landscape")).toEqual({ width: 1920, height: 1080, aspect: "16:9" });
    expect(sizeFor("tablet", "portrait")).toEqual({ width: 1200, height: 1920, aspect: "5:8" });
    expect(sizeFor("tablet", "landscape")).toEqual({ width: 1920, height: 1200, aspect: "16:10" });
    expect((storeListing as { screenshotCapturePhase?: number }).screenshotCapturePhase).toBe(9);
    expect(existsSync(resolve(root, screenshotCapture.tool))).toBe(true);
  });

  it("ships phone + tablet PNGs at catalog sizes", () => {
    let count = 0;
    for (const shot of screenshotCapture.shots) {
      expect(existsSync(resolve(root, shot.storyboard))).toBe(true);
      for (const form of ["phone", "tablet"] as const) {
        const rel = capturePath(form, shot.id);
        const abs = resolve(root, rel);
        expect(existsSync(abs), rel).toBe(true);
        const { width, height } = PNG.size(abs);
        const expected = sizeFor(form, shot.orientation);
        expect(width).toBe(expected.width);
        expect(height).toBe(expected.height);
        expect(isPlayPixelBounds(width, height)).toBe(true);
        count++;
      }
    }
    expect(count).toBe(expectedCaptureCount());
    const manifest = JSON.parse(
      readFileSync(resolve(root, screenshotCapture.outputDir, "manifest.json"), "utf8"),
    );
    expect(manifest.count).toBe(expectedCaptureCount());
  });

  it("screenshots:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-screenshot-capture.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK screenshots:validate");
  });
});
