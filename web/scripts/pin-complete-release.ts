/**
 * Finish 2.0 Phase 4 — pin built artifact hashes into RELEASE_PIN.completeRelease
 * and archive DoD closeout for the v1.0-complete cut.
 *
 * Usage:
 *   npm run complete:pin
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function main(): number {
  const catalog = JSON.parse(readFileSync(resolve(root, "shared/ship/complete-tag.json"), "utf8"));
  const pinPath = resolve(root, "shared/fixtures/RELEASE_PIN.json");
  const dodPath = resolve(root, "shared/ship/definition-of-done.json");
  const pin = JSON.parse(readFileSync(pinPath, "utf8"));
  const dod = JSON.parse(readFileSync(dodPath, "utf8"));

  if (catalog.phase !== 4) {
    console.error(`Expected complete-tag phase 4, got ${catalog.phase}`);
    return 1;
  }

  const artifacts: Record<string, string> = {};
  for (const [slot, rel] of Object.entries(catalog.artifactSlots as Record<string, string>)) {
    const abs = resolve(root, rel);
    if (!existsSync(abs)) {
      console.error(`missing artifact for pin: ${rel}`);
      return 1;
    }
    artifacts[slot] = sha256File(abs);
  }

  let gitHead = "";
  try {
    gitHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    gitHead = "unknown";
  }

  const pinnedAt = new Date().toISOString().slice(0, 10);
  pin.completeTag = catalog.completeTag;
  pin.completeRelease = {
    phase: 4,
    plan: "30_finish_2.0",
    releaseTag: catalog.completeTag,
    contentVersion: catalog.contentVersion,
    schemaVersion: catalog.schemaVersion,
    versionName: pin.versionName,
    versionCode: pin.versionCode,
    gitHeadAtPin: gitHead,
    catalog: "shared/ship/complete-tag.json",
    hashes: {
      algorithm: catalog.hashAlgorithm,
      artifacts,
      pinnedAt,
      policy: "pinned_at_complete_tag",
    },
  };
  writeFileSync(pinPath, `${JSON.stringify(pin, null, 2)}\n`);

  dod.closeout.status = catalog.closeoutStatusAfter;
  dod.closeout.completeTagCut = {
    tag: catalog.completeTag,
    status: "archived",
    pinnedAt,
    gitHeadAtPin: gitHead,
    finish2Phase: 4,
    catalog: "shared/ship/complete-tag.json",
  };
  // Keep checklist item updated
  dod.closeout.checklist = (dod.closeout.checklist as string[]).map((line: string) =>
    line.includes("cut annotated git tag v1.0-complete")
      ? "Annotated git tag v1.0-complete cut — Finish 2.0 Phase 4 archived"
      : line,
  );
  writeFileSync(dodPath, `${JSON.stringify(dod, null, 2)}\n`);

  console.log(`OK complete:pin — ${Object.keys(artifacts).length} artifacts → RELEASE_PIN.completeRelease`);
  for (const [slot, hash] of Object.entries(artifacts)) {
    console.log(`  ${slot}: ${hash}`);
  }
  console.log(`DoD closeout.status → ${dod.closeout.status}`);
  return 0;
}

process.exit(main());
