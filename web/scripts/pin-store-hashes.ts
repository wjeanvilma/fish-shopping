/**
 * Phase 18 (post-1.0) — pin store build input hashes into RELEASE_PIN.
 *
 * Hashes catalog inputFiles (sha256) into storeRelease.hashes.inputs.
 * Artifact slots stay null until the AAB / web dist exist on disk.
 *
 * Usage:
 *   npm run public-ship:hash
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function main(): number {
  const catalogPath = resolve(root, "shared/ship/public-ship.json");
  const pinPath = resolve(root, "shared/fixtures/RELEASE_PIN.json");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const pin = JSON.parse(readFileSync(pinPath, "utf8"));

  if (catalog.phase !== 18) {
    console.error(`Expected public-ship phase 18, got ${catalog.phase}`);
    return 1;
  }

  const inputs: Record<string, string> = {};
  for (const rel of catalog.storeBuildHashes.inputFiles as string[]) {
    const abs = resolve(root, rel);
    if (!existsSync(abs)) {
      console.error(`missing hash input ${rel}`);
      return 1;
    }
    const key = rel.replace(/^shared\//, "").replace(/\//g, "__").replace(/\.json$/, "");
    inputs[key] = sha256File(abs);
  }

  // Default: keep artifact slots null in the committed pin (null_until_built).
  // Pass --artifacts to lock sha256 of AAB / mapping / web dist when cutting v1.0.0-store.
  const lockArtifacts = process.argv.includes("--artifacts");
  const slots = catalog.storeBuildHashes.artifactSlots as Record<string, string>;
  const artifacts: Record<string, string | null> = {};
  for (const [slot, rel] of Object.entries(slots)) {
    const abs = resolve(root, rel);
    if (lockArtifacts && existsSync(abs)) {
      artifacts[slot] = sha256File(abs);
    } else {
      artifacts[slot] = null;
    }
  }

  // storeRelease is the historical Phase 18 v1.0.0-store cut. Later balance
  // patches (e.g. 1.0.1) advance top-level pin fields only.
  pin.storeRelease = {
    phase: 18,
    releaseTag: catalog.releaseTag,
    catalog: "shared/ship/public-ship.json",
    androidTrack: catalog.android.track,
    contentVersion: catalog.contentVersion,
    schemaVersion: catalog.schemaVersion,
    versionName: catalog.versionName ?? catalog.contentVersion,
    versionCode: catalog.versionCode ?? 1,
    hashes: {
      algorithm: catalog.storeBuildHashes.algorithm,
      inputs,
      artifacts,
      artifactHashPolicy: catalog.storeBuildHashes.artifactHashPolicy,
      pinnedAt: "public-ship:hash",
    },
  };

  writeFileSync(pinPath, `${JSON.stringify(pin, null, 2)}\n`);
  console.log(`OK public-ship:hash — pinned ${Object.keys(inputs).length} inputs → ${pinPath}`);
  for (const [slot, hash] of Object.entries(artifacts)) {
    console.log(`  artifact ${slot}: ${hash ?? "(null until built)"}`);
  }
  return 0;
}

process.exit(main());
