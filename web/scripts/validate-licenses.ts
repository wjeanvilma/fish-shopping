/**
 * Phase 12 (post-1.0) — validate licenses.json OSS notices vs package pins.
 *
 * Usage:
 *   npm run licenses:validate
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/store/licenses.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const webPkg = readJson(resolve(root, "web/package.json"));
  const versionsToml = readFileSync(resolve(root, "gradle/libs.versions.toml"), "utf8");

  if (catalog.licensesUiPhase !== 12) errors.push("licensesUiPhase must be 12");
  if (catalog.schema !== "fish.store.asset_licenses.v1") errors.push("bad schema");
  if (listing.licensesUiPhase !== 12) errors.push("listing.licensesUiPhase must be 12");
  if (listing.licensesPath !== "shared/store/licenses.json") errors.push("listing.licensesPath mismatch");

  if (!catalog.screenTitle || !catalog.screenIntro) errors.push("missing screen title/intro");
  const notices = catalog.ossNotices as any[];
  if (!Array.isArray(notices) || notices.length < 6) errors.push("need ≥6 ossNotices");

  const byId = new Map(notices.map((n) => [n.id, n]));
  for (const id of catalog.requiredOssIds as string[]) {
    if (!byId.has(id)) errors.push(`required OSS missing: ${id}`);
  }

  const filament = byId.get("filament");
  if (!filament || filament.spdx !== "Apache-2.0") errors.push("Filament must be Apache-2.0");
  if (!versionsToml.includes(`filament = "${filament.version}"`)) {
    errors.push(`Filament version ${filament.version} ≠ libs.versions.toml`);
  }

  const three = byId.get("three");
  if (!three || three.spdx !== "MIT") errors.push("three.js must be MIT");
  if (webPkg.dependencies.three !== three.version) {
    errors.push(`three version ${three.version} ≠ package.json ${webPkg.dependencies.three}`);
  }

  const react = byId.get("react");
  if (webPkg.dependencies.react !== react.version) {
    errors.push(`react version ${react.version} ≠ package.json`);
  }

  const kotlin = byId.get("kotlin");
  if (!versionsToml.includes(`kotlin = "${kotlin.version}"`)) {
    errors.push(`Kotlin version ${kotlin.version} ≠ libs.versions.toml`);
  }

  const ids = (catalog.records as any[]).map((r) => r.id);
  for (const need of ["store-chrome", "third-party-runtime", "authored-sfx", "authored-music"]) {
    if (!ids.includes(need)) errors.push(`records missing ${need}`);
  }

  const third = (catalog.records as any[]).find((r) => r.id === "third-party-runtime");
  if (!third?.note?.includes("ossNotices")) {
    errors.push("third-party-runtime note must point at ossNotices");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("licenses:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK licenses:validate — OSS notices match Filament / Three / React / Kotlin pins");
