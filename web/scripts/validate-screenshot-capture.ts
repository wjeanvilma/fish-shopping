/**
 * Phase 9 (post-1.0) — validate phone + tablet screenshot captures exist at catalog sizes.
 *
 * Usage:
 *   npm run screenshots:validate
 *   npx vite-node scripts/validate-screenshot-capture.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "../src/store/pngSize";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/store/screenshot-capture.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));

  if (catalog.phase !== 9) errors.push(`phase expected 9, got ${catalog.phase}`);
  if (catalog.schema !== "fish.store.screenshot_capture.v1") errors.push("bad schema");
  if (listing.screenshotCapturePhase !== 9) errors.push("listing.screenshotCapturePhase must be 9");
  if (listing.screenshotCaptureCatalog !== "shared/store/screenshot-capture.json") {
    errors.push("listing.screenshotCaptureCatalog mismatch");
  }

  const listingIds = (listing.screenshotShots as any[]).map((s) => s.id);
  const catalogIds = (catalog.shots as any[]).map((s: any) => s.id);
  if (JSON.stringify(listingIds) !== JSON.stringify(catalogIds)) {
    errors.push("catalog.shots ids must match listing.screenshotShots order");
  }
  if (listingIds.length < catalog.minShots) {
    errors.push(`need ≥${catalog.minShots} shots, got ${listingIds.length}`);
  }

  for (const shot of listing.screenshotShots as any[]) {
    const story = resolve(root, shot.storyboard);
    if (!existsSync(story)) errors.push(`missing storyboard ${shot.storyboard}`);
    const catShot = (catalog.shots as any[]).find((s: any) => s.id === shot.id);
    if (!catShot) {
      errors.push(`catalog missing shot ${shot.id}`);
      continue;
    }
    if (catShot.orientation !== shot.orientation) {
      errors.push(`orientation mismatch for ${shot.id}`);
    }

    for (const form of ["phone", "tablet"] as const) {
      const rel = `${catalog.outputDir}/${form}/${shot.id}.png`;
      const abs = resolve(root, rel);
      if (!existsSync(abs)) {
        errors.push(`missing capture ${rel}`);
        continue;
      }
      const expected = catalog.formats[form][shot.orientation];
      const size = PNG.size(abs);
      if (size.width !== expected.width || size.height !== expected.height) {
        errors.push(
          `${rel} size ${size.width}x${size.height} ≠ ${expected.width}x${expected.height}`,
        );
      }
      const min = Math.min(size.width, size.height);
      const max = Math.max(size.width, size.height);
      if (min < 320 || max > 3840) errors.push(`${rel} outside Play pixel bounds`);
    }
  }

  const manifestPath = resolve(root, catalog.outputDir, "manifest.json");
  if (!existsSync(manifestPath)) errors.push("missing captures/manifest.json");
  else {
    const manifest = readJson(manifestPath);
    if (manifest.count !== listingIds.length * 2) {
      errors.push(`manifest.count expected ${listingIds.length * 2}, got ${manifest.count}`);
    }
  }

  if (!existsSync(resolve(root, catalog.tool))) errors.push(`missing tool ${catalog.tool}`);
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("screenshots:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK screenshots:validate — phone + tablet captures match catalog sizes");
