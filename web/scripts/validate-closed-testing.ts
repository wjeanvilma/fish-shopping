/**
 * Phase 17 (post-1.0) — closed testing track readiness gate.
 *
 * Usage:
 *   npm run closed-test:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/android/closed-testing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const aab = readJson(resolve(root, "shared/android/aab-ci.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 17) errors.push(`phase expected 17, got ${catalog.phase}`);
  if (catalog.schema !== "fish.android.closed_testing.v1") errors.push("bad schema");
  if (catalog.packageName !== listing.packageName) errors.push("packageName ≠ listing");
  if (catalog.tracks.primary !== "internal") errors.push("primary track must be internal");
  if (catalog.tracks.secondary !== "closed") errors.push("secondary track must be closed");

  if (catalog.artifacts.aab !== aab.artifacts.aab) errors.push("AAB path ≠ aab-ci.json");
  if (catalog.artifacts.mapping !== aab.artifacts.mapping) errors.push("mapping path ≠ aab-ci.json");
  if (catalog.artifacts.ciJob !== aab.ciJob) errors.push("ciJob ≠ aab-ci.json");
  if (catalog.artifacts.ciArtifactName !== aab.artifactUploadName) {
    errors.push("ciArtifactName ≠ aab-ci artifactUploadName");
  }

  if (!catalog.upload.requireSignedUploadKey) errors.push("must require signed upload key");
  if (!catalog.upload.requireMappingUpload) errors.push("must require mapping.txt");
  if (catalog.crashTriage.provider !== "play_console_android_vitals") {
    errors.push("crash triage provider must be Play Android Vitals");
  }
  if (catalog.crashTriage.sdk !== null) {
    errors.push("no Crashlytics SDK in 1.0 — sdk must be null");
  }
  if ((catalog.crashTriage.blockerCriteria as string[]).length < 3) {
    errors.push("need ≥3 crash/ANR blocker criteria");
  }
  if ((catalog.signoff.checklist as string[]).length < 5) {
    errors.push("need ≥5 signoff checklist items");
  }
  if (!catalog.signoff.statusValues.includes(catalog.signoff.status)) {
    errors.push("signoff.status not in statusValues");
  }
  if (catalog.signoff.productionPromotion !== "Phase 18") {
    errors.push("production promotion must point at Phase 18");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight gate ${gate}`);
  }

  if (pin.versionName !== listing.whatsNewVersion && listing.whatsNewVersion) {
    // soft: listing whatsNewVersion should match pin when present
    if (listing.whatsNewVersion !== pin.versionName) {
      errors.push(`listing.whatsNewVersion ${listing.whatsNewVersion} ≠ pin ${pin.versionName}`);
    }
  }
  if (aab.releasePin !== "shared/fixtures/RELEASE_PIN.json") errors.push("aab-ci releasePin path");

  if (!ci.includes("android-release")) errors.push("ci.yml missing android-release job");
  if (!ci.includes("android-release-aab")) errors.push("ci.yml missing AAB artifact name");
  if (!ci.includes(":app:bundleRelease")) errors.push("ci.yml missing bundleRelease");
  if (!ci.includes("mapping.txt")) errors.push("ci.yml must upload mapping.txt");

  if (listing.closedTestingPhase !== 17) errors.push("listing.closedTestingPhase must be 17");
  if (listing.closedTestingCatalog !== "shared/android/closed-testing.json") {
    errors.push("listing.closedTestingCatalog mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("closed-test:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK closed-test:validate — internal/closed track ready (AAB CI + Vitals triage)");
