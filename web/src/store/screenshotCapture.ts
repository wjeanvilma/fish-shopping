/**
 * Phase 9 (post-1.0) — screenshot capture catalog from `shared/store/screenshot-capture.json`.
 */
import captureJson from "../../../shared/store/screenshot-capture.json";

export interface CaptureSize {
  width: number;
  height: number;
  aspect: string;
}

export interface ScreenshotCaptureCatalog {
  phase: number;
  schema: string;
  outputDir: string;
  tool: string;
  minShots: number;
  formats: {
    phone: { portrait: CaptureSize; landscape: CaptureSize };
    tablet: { portrait: CaptureSize; landscape: CaptureSize };
  };
  shots: { id: string; orientation: "portrait" | "landscape" | string; storyboard: string }[];
}

export const screenshotCapture = captureJson as unknown as ScreenshotCaptureCatalog;

export const SCREENSHOT_CAPTURE_PHASE = screenshotCapture.phase;
export const SCREENSHOT_CAPTURE_SCHEMA = screenshotCapture.schema;

export function capturePath(formFactor: "phone" | "tablet", shotId: string): string {
  return `${screenshotCapture.outputDir}/${formFactor}/${shotId}.png`;
}

export function sizeFor(
  formFactor: "phone" | "tablet",
  orientation: "portrait" | "landscape" | string,
): CaptureSize {
  const fmt = screenshotCapture.formats[formFactor];
  if (orientation === "portrait") return fmt.portrait;
  if (orientation === "landscape") return fmt.landscape;
  throw new Error(`unknown orientation ${orientation}`);
}

export function expectedCaptureCount(): number {
  return screenshotCapture.shots.length * 2;
}

export function isPlayPixelBounds(width: number, height: number): boolean {
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  return min >= 320 && max <= 3840;
}
