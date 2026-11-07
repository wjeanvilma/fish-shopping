/**
 * Finish 2.0 Phase 4 — v1.0-complete cut readiness.
 *
 * Usage:
 *   npm run complete:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  COMPLETE_TAG,
  COMPLETE_TAG_PHASE,
  COMPLETE_TAG_SCHEMA,
  V1_0_COMPLETE_TAG,
} from "../src/ship/completeTag";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/complete-tag.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/CompleteTag.kt"),
    "utf8",
  );

  if (catalog.phase !== 4) errors.push(`phase expected 4, got ${catalog.phase}`);
  if (catalog.schema !== COMPLETE_TAG_SCHEMA) errors.push("bad schema");
  if (catalog.completeTag !== "v1.0-complete") errors.push("completeTag must be v1.0-complete");
  if (COMPLETE_TAG_PHASE !== 4) errors.push("phase mirror mismatch");
  if (V1_0_COMPLETE_TAG !== "v1.0-complete") errors.push("V1_0_COMPLETE_TAG mismatch");
  if (catalog.schemaVersion !== 20) errors.push("schemaVersion must stay 20");

  if (listing.completeTagPhase !== 4) errors.push("listing.completeTagPhase must be 4");
  if (listing.completeTagCatalog !== "shared/ship/complete-tag.json") {
    errors.push("listing.completeTagCatalog mismatch");
  }
  if (listing.completeTag !== "v1.0-complete") errors.push("listing.completeTag must be v1.0-complete");

  if (pin.completeTag !== "v1.0-complete") errors.push("RELEASE_PIN.completeTag must be v1.0-complete");
  const cr = pin.completeRelease;
  if (!cr) {
    errors.push("RELEASE_PIN missing completeRelease — run npm run complete:pin");
  } else {
    if (cr.releaseTag !== "v1.0-complete") errors.push("completeRelease.releaseTag mismatch");
    if (cr.schemaVersion !== 20) errors.push("completeRelease.schemaVersion must stay 20");
    if (cr.hashes?.algorithm !== "sha256") errors.push("completeRelease hash algorithm");
    if (cr.hashes?.policy !== "pinned_at_complete_tag") errors.push("completeRelease policy");
    const arts = cr.hashes?.artifacts ?? {};
    for (const [slot, rel] of Object.entries(catalog.artifactSlots as Record<string, string>)) {
      const pinned = arts[slot];
      if (!pinned) {
        errors.push(`completeRelease missing artifact hash ${slot}`);
        continue;
      }
      const abs = resolve(root, rel);
      if (!existsSync(abs)) {
        errors.push(`artifact missing on disk ${rel} (pin present)`);
        continue;
      }
      if (sha256File(abs) !== pinned) {
        errors.push(`artifact hash drift ${slot} — re-run complete:pin`);
      }
    }
  }

  if (dod.closeout?.status !== "archived") {
    errors.push(`DoD closeout.status must be archived, got ${dod.closeout?.status}`);
  }
  if (dod.closeout?.completeTagCut?.tag !== "v1.0-complete") {
    errors.push("DoD completeTagCut.tag must be v1.0-complete");
  }
  if (dod.closeout?.completeTagCut?.status !== "archived") {
    errors.push("DoD completeTagCut.status must be archived");
  }
  if (dod.completeTag !== "v1.0-complete") errors.push("DoD.completeTag must be v1.0-complete");

  for (const pre of catalog.prerequisitePhases as { catalog: string }[]) {
    if (!existsSync(resolve(root, pre.catalog))) errors.push(`missing prerequisite ${pre.catalog}`);
  }
  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  if (!ci.includes("complete:validate")) errors.push("ci.yml missing complete:validate");
  if (!kotlin.includes('TAG = "v1.0-complete"')) errors.push("Kotlin CompleteTag.TAG mismatch");

  // Git tag must exist locally or on origin (CI checkouts may omit tags until fetch).
  let tagFound = false;
  try {
    const tags = execFileSync("git", ["tag", "-l", "v1.0-complete"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    tagFound = tags === "v1.0-complete";
  } catch {
    tagFound = false;
  }
  if (!tagFound) {
    try {
      const remote = execFileSync(
        "git",
        ["ls-remote", "--tags", "origin", "refs/tags/v1.0-complete"],
        { cwd: root, encoding: "utf8" },
      ).trim();
      tagFound = remote.includes("refs/tags/v1.0-complete");
    } catch {
      tagFound = false;
    }
  }
  if (!tagFound) errors.push("git tag v1.0-complete not found locally or on origin");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("complete:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK complete:validate — v1.0-complete tagged; artifacts pinned; DoD archived");
