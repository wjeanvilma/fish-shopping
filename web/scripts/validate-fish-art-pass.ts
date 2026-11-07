/**
 * Finish 2.0 Phase 20 — fish art pass readiness.
 *
 * Usage:
 *   npm run fishart:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, SCHEMA_VERSION } from "../src/engine";
import {
  AUTHORED_FISH_FLOOR,
  FISH_ART_MARKER,
  FISH_ART_PASS,
  FISH_ART_PHASE,
  FISH_ART_SCHEMA,
} from "../src/ship/fishArtPass";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseGlbJson(buf: Buffer): Record<string, unknown> {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  const chunkLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error("missing JSON chunk");
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8").replace(/\0+$/, ""));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/fish-art-pass.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-fish-art-pass.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 20) errors.push(`phase expected 20, got ${catalog.phase}`);
  if (catalog.schema !== FISH_ART_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (FISH_ART_PHASE !== 20) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.authoredSpeciesMin !== 10 || AUTHORED_FISH_FLOOR !== 10) {
    errors.push("authoredSpeciesMin must be 10");
  }
  if (catalog.fishArtMarker !== FISH_ART_MARKER) errors.push("fishArtMarker mirror mismatch");
  if ((dod.quotas?.authoredFishSpecies ?? 0) < 10) {
    errors.push("DoD quotas.authoredFishSpecies must be ≥ 10");
  }
  if (listing.fishArtPassPhase !== 20) errors.push("listing.fishArtPassPhase must be 20");
  if (listing.fishArtPassCatalog !== "shared/ship/fish-art-pass.json") {
    errors.push("listing.fishArtPassCatalog mismatch");
  }
  if (!ci.includes("fishart:validate")) errors.push("ci.yml missing fishart:validate");
  if (!pin.fixtures?.includes("parity-fish-art-pass.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-fish-art-pass.json");
  }
  if (pin.fishArtPass !== "shared/ship/fish-art-pass.json") {
    errors.push("RELEASE_PIN.fishArtPass path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  const licenseIds = new Set((licenses.records ?? []).map((r: { id: string }) => r.id));
  if (!licenseIds.has("fish-authored-art")) {
    errors.push("licenses.json missing fish-authored-art record");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight gate ${gate}`);
  }

  if (!Array.isArray(catalog.authoredSpecies) || catalog.authoredSpecies.length < 10) {
    errors.push("authoredSpecies must list ≥ 10 species");
  }
  if (fixture.expect?.species?.length !== catalog.authoredSpecies.length) {
    errors.push("parity fixture species count must match catalog");
  }

  const hashes = new Map<string, string>();
  let authoredBytes = 0;
  const authoredIds = new Set<string>();
  for (const entry of catalog.authoredSpecies) {
    authoredIds.add(entry.speciesId);
    if (!content.speciesById.has(entry.speciesId)) {
      errors.push(`unknown species ${entry.speciesId}`);
      continue;
    }
    const assetPath = resolve(root, entry.asset);
    if (!existsSync(assetPath)) {
      errors.push(`missing asset ${entry.asset}`);
      continue;
    }
    const size = statSync(assetPath).size;
    authoredBytes += size;
    if (size > catalog.maxBytesPerFish) {
      errors.push(`${entry.asset} size ${size} > maxBytesPerFish ${catalog.maxBytesPerFish}`);
    }
    const buf = readFileSync(assetPath);
    hashes.set(entry.speciesId, createHash("sha256").update(buf).digest("hex"));
    let gltf: Record<string, unknown>;
    try {
      gltf = parseGlbJson(buf);
    } catch (e) {
      errors.push(`${entry.asset} GLB parse failed: ${e}`);
      continue;
    }
    const extras = (gltf.extras ?? {}) as Record<string, unknown>;
    if (extras.fishArt !== catalog.fishArtMarker) {
      errors.push(`${entry.asset} extras.fishArt expected ${catalog.fishArtMarker}`);
    }
    if (extras.fishTheme !== entry.theme) {
      errors.push(`${entry.asset} extras.fishTheme expected ${entry.theme}`);
    }
    if (extras.phase !== 20) errors.push(`${entry.asset} extras.phase expected 20`);
    if (extras.stylized !== true) errors.push(`${entry.asset} must be stylized`);
    const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
    const artNodes = nodes.filter((n) => n.startsWith("FishArt_"));
    const fx = (fixture.expect.species as any[]).find((s) => s.speciesId === entry.speciesId);
    if (fx && artNodes.length < fx.minFishArtNodes) {
      errors.push(`${entry.speciesId} FishArt nodes ${artNodes.length} < ${fx.minFishArtNodes}`);
    }
  }

  if (authoredBytes > catalog.maxTotalAuthoredBytes) {
    errors.push(`authored total bytes ${authoredBytes} > ${catalog.maxTotalAuthoredBytes}`);
  }
  if (new Set(hashes.values()).size !== hashes.size) {
    errors.push("authored fish GLBs must have pairwise-distinct SHA-256 digests");
  }

  // Non-authored fish stay Phase 13 stubs.
  for (const sp of content.raw.species) {
    if (!sp.asset || authoredIds.has(sp.id)) continue;
    const path = resolve(root, "shared/assets", sp.asset);
    if (!existsSync(path)) {
      errors.push(`missing stub ${sp.asset}`);
      continue;
    }
    const extras = (parseGlbJson(readFileSync(path)).extras ?? {}) as Record<string, unknown>;
    if (extras.phase !== 13) errors.push(`${sp.id} stub phase expected 13`);
    if (extras.fishArt) errors.push(`${sp.id} stub must not set fishArt`);
  }

  for (const id of FISH_ART_PASS.authoredSpecies.map((s) => s.speciesId)) {
    if (!catalog.authoredSpecies.some((s: any) => s.speciesId === id)) {
      errors.push(`TS mirror authored species missing from catalog JSON: ${id}`);
    }
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("fishart:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK fishart:validate — fish art pass ready");
