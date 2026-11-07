/**
 * Finish 2.0 Phase 19 — harbor art pass readiness.
 *
 * Usage:
 *   npm run harborart:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, SCHEMA_VERSION } from "../src/engine";
import {
  AUTHORED_HARBOR_FLOOR,
  HARBOR_ART_MARKER,
  HARBOR_ART_PASS,
  HARBOR_ART_PHASE,
  HARBOR_ART_SCHEMA,
} from "../src/ship/harborArtPass";
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
  const catalog = readJson(resolve(root, "shared/ship/harbor-art-pass.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbor-art-pass.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 19) errors.push(`phase expected 19, got ${catalog.phase}`);
  if (catalog.schema !== HARBOR_ART_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (HARBOR_ART_PHASE !== 19) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.authoredHarborMin !== 3 || AUTHORED_HARBOR_FLOOR !== 3) {
    errors.push("authoredHarborMin must be 3");
  }
  if (catalog.harborArtMarker !== HARBOR_ART_MARKER) {
    errors.push("harborArtMarker mirror mismatch");
  }
  if ((dod.quotas?.authoredHarborScenes ?? 0) < 3) {
    errors.push("DoD quotas.authoredHarborScenes must be ≥ 3");
  }
  if (listing.harborArtPassPhase !== 19) {
    errors.push("listing.harborArtPassPhase must be 19");
  }
  if (listing.harborArtPassCatalog !== "shared/ship/harbor-art-pass.json") {
    errors.push("listing.harborArtPassCatalog mismatch");
  }
  if (!ci.includes("harborart:validate")) errors.push("ci.yml missing harborart:validate");
  if (!pin.fixtures?.includes("parity-harbor-art-pass.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbor-art-pass.json");
  }
  if (pin.harborArtPass !== "shared/ship/harbor-art-pass.json") {
    errors.push("RELEASE_PIN.harborArtPass path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  const licenseIds = new Set((licenses.records ?? []).map((r: { id: string }) => r.id));
  if (!licenseIds.has("harbor-authored-art")) {
    errors.push("licenses.json missing harbor-authored-art record");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight gate ${gate}`);
  }

  if (!Array.isArray(catalog.authoredHarbors) || catalog.authoredHarbors.length < 3) {
    errors.push("authoredHarbors must list ≥ 3 harbors");
  }
  if (fixture.expect?.harbors?.length !== catalog.authoredHarbors.length) {
    errors.push("parity fixture harbor count must match catalog");
  }

  const hashes = new Map<string, string>();
  let authoredBytes = 0;
  for (const entry of catalog.authoredHarbors) {
    if (!content.harborsById.has(entry.harborId)) {
      errors.push(`unknown harbor ${entry.harborId}`);
      continue;
    }
    const assetPath = resolve(root, entry.asset);
    if (!existsSync(assetPath)) {
      errors.push(`missing asset ${entry.asset}`);
      continue;
    }
    const size = statSync(assetPath).size;
    authoredBytes += size;
    if (size > catalog.maxBytesPerHarbor) {
      errors.push(`${entry.asset} size ${size} > maxBytesPerHarbor ${catalog.maxBytesPerHarbor}`);
    }
    const buf = readFileSync(assetPath);
    const digest = createHash("sha256").update(buf).digest("hex");
    hashes.set(entry.harborId, digest);
    let gltf: Record<string, unknown>;
    try {
      gltf = parseGlbJson(buf);
    } catch (e) {
      errors.push(`${entry.asset} GLB parse failed: ${e}`);
      continue;
    }
    const extras = (gltf.extras ?? {}) as Record<string, string>;
    if (extras.harborArt !== catalog.harborArtMarker) {
      errors.push(`${entry.asset} extras.harborArt expected ${catalog.harborArtMarker}`);
    }
    if (extras.harborTheme !== entry.theme) {
      errors.push(`${entry.asset} extras.harborTheme expected ${entry.theme}`);
    }
    if (!String(extras.envArt ?? "").includes("harbor-art-19")) {
      errors.push(`${entry.asset} extras.envArt must note harbor-art-19`);
    }
    const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
    const nameSet = new Set(nodes);
    const artNodes = nodes.filter((n) => n.startsWith("HarborArt_"));
    const fx = (fixture.expect.harbors as any[]).find((h) => h.harborId === entry.harborId);
    if (fx && artNodes.length < fx.minHarborArtNodes) {
      errors.push(`${entry.harborId} HarborArt nodes ${artNodes.length} < ${fx.minHarborArtNodes}`);
    }
    for (const required of ["Player", "PlayerBody", "Water"]) {
      if (!nameSet.has(required)) errors.push(`${entry.asset} missing socket ${required}`);
    }
    if (!nodes.some((n) => n.startsWith("Zone_"))) errors.push(`${entry.asset} missing Zone_*`);
    if (!nodes.some((n) => n.startsWith("Footprint_"))) {
      errors.push(`${entry.asset} missing Footprint_*`);
    }
  }

  if (authoredBytes > catalog.maxTotalAuthoredBytes) {
    errors.push(`authored total bytes ${authoredBytes} > ${catalog.maxTotalAuthoredBytes}`);
  }
  const uniqueHashes = new Set(hashes.values());
  if (uniqueHashes.size !== hashes.size) {
    errors.push("authored harbor GLBs must have pairwise-distinct SHA-256 digests");
  }

  for (const asset of catalog.allBlockoutAssets ?? []) {
    const path = resolve(root, "shared/assets/models", asset);
    if (!existsSync(path)) errors.push(`missing blockout ${asset}`);
    if (!appTsx.includes(asset)) {
      errors.push(`web App.tsx BLOCKOUT_URLS missing ${asset}`);
    }
  }

  for (const id of HARBOR_ART_PASS.authoredHarbors.map((h) => h.harborId)) {
    if (!catalog.authoredHarbors.some((h: any) => h.harborId === id)) {
      errors.push(`TS mirror authored harbor missing from catalog JSON: ${id}`);
    }
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harborart:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harborart:validate — harbor art pass ready");
