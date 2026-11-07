/**
 * Phase 18 (post-1.0) — public store + web 1.0 release readiness gate.
 *
 * Usage:
 *   npm run public-ship:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  const catalog = readJson(resolve(root, "shared/ship/public-ship.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const closed = readJson(resolve(root, "shared/android/closed-testing.json"));
  const aab = readJson(resolve(root, "shared/android/aab-ci.json"));
  const legal = readJson(resolve(root, "shared/store/legal-pages.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 18) errors.push(`phase expected 18, got ${catalog.phase}`);
  if (catalog.schema !== "fish.ship.public_ship.v1") errors.push("bad schema");
  if (catalog.releaseTag !== "v1.0.0-store") errors.push("releaseTag must be v1.0.0-store");
  if (catalog.packageName !== listing.packageName) errors.push("packageName ≠ listing");
  // Phase 18 catalog stays pinned to the v1.0.0-store cut; later balance patches
  // advance top-level RELEASE_PIN while storeRelease remains historical.
  const storeCut = pin.storeRelease;
  if (!storeCut) {
    errors.push("RELEASE_PIN missing storeRelease");
  } else {
    if (catalog.contentVersion !== storeCut.contentVersion) {
      errors.push(
        `public-ship contentVersion ${catalog.contentVersion} ≠ storeRelease ${storeCut.contentVersion}`,
      );
    }
    if (catalog.schemaVersion !== storeCut.schemaVersion) {
      errors.push(
        `public-ship schemaVersion ${catalog.schemaVersion} ≠ storeRelease ${storeCut.schemaVersion}`,
      );
    }
  }
  // Phase 18 store cut stays at schema 20 via storeRelease; Finish 2.0 mainline is schema 21+.
  if (pin.schemaVersion < 21) errors.push("RELEASE_PIN schemaVersion must be ≥21");

  if (catalog.prerequisite.closedTestingPhase !== 17) errors.push("prerequisite closed phase");
  if (catalog.prerequisite.closedTestingCatalog !== "shared/android/closed-testing.json") {
    errors.push("prerequisite closed catalog path");
  }
  if (closed.phase !== 17) errors.push("closed-testing.json phase must be 17");
  if (closed.signoff.productionPromotion !== "Phase 18") {
    errors.push("closed testing must promote to Phase 18");
  }

  if (catalog.android.track !== "production") errors.push("android track must be production");
  if (catalog.android.promoteFrom !== "closed") errors.push("promoteFrom must be closed");
  if (!catalog.android.requireSignedUploadKey) errors.push("must require signed upload key");
  if (!catalog.android.requireMappingUpload) errors.push("must require mapping.txt");
  if (catalog.android.artifacts.aab !== aab.artifacts.aab) errors.push("AAB path ≠ aab-ci");
  if (catalog.android.artifacts.mapping !== aab.artifacts.mapping) errors.push("mapping ≠ aab-ci");
  if (catalog.android.artifacts.ciJob !== aab.ciJob) errors.push("ciJob ≠ aab-ci");
  if ((catalog.android.stagedRollout?.initialPercent ?? 0) < 1) {
    errors.push("staged rollout initialPercent must be ≥1");
  }
  if ((catalog.android.stagedRollout?.initialPercent ?? 100) > 100) {
    errors.push("staged rollout initialPercent must be ≤100");
  }

  if (catalog.web.host !== "github_pages") errors.push("web host must be github_pages");
  if (catalog.web.canonicalHost !== listing.canonicalHost) {
    errors.push("web.canonicalHost ≠ listing.canonicalHost");
  }
  if (catalog.web.spaHostPhase != null && catalog.web.spaHostPhase !== 3) {
    errors.push("web.spaHostPhase must be 3 when set");
  }
  if (catalog.web.playUrl && catalog.web.playUrl !== listing.playUrl) {
    errors.push("web.playUrl ≠ listing.playUrl");
  }
  if (catalog.web.canonicalHost !== legal.canonicalHost) {
    errors.push("web.canonicalHost ≠ legal-pages.canonicalHost");
  }
  if (catalog.web.ciJob !== "web-release") errors.push("web.ciJob must be web-release");
  if (catalog.web.ciArtifactName !== "web-release-dist") {
    errors.push("web.ciArtifactName must be web-release-dist");
  }
  if (catalog.web.distDir !== "web/dist") errors.push("web.distDir must be web/dist");

  if ((catalog.signoff.checklist as string[]).length < 6) {
    errors.push("need ≥6 signoff checklist items");
  }
  if (!catalog.signoff.statusValues.includes(catalog.signoff.status)) {
    errors.push("signoff.status not in statusValues");
  }
  if (catalog.signoff.status !== "ready_for_production") {
    errors.push("default signoff status must be ready_for_production");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight gate ${gate}`);
  }

  for (const rel of catalog.storeBuildHashes.inputFiles as string[]) {
    if (!existsSync(resolve(root, rel))) errors.push(`missing hash input ${rel}`);
  }

  const store = pin.storeRelease;
  if (!store) {
    errors.push("RELEASE_PIN missing storeRelease — run npm run public-ship:hash");
  } else {
    if (store.phase !== 18) errors.push("storeRelease.phase must be 18");
    if (store.releaseTag !== "v1.0.0-store") errors.push("storeRelease.releaseTag must be v1.0.0-store");
    if (store.catalog !== "shared/ship/public-ship.json") errors.push("storeRelease.catalog path");
    if (store.androidTrack !== "production") errors.push("storeRelease.androidTrack must be production");
    if (store.contentVersion !== "1.0.0") errors.push("storeRelease.contentVersion must stay 1.0.0");
    if (store.versionName !== "1.0.0") errors.push("storeRelease.versionName must stay 1.0.0");
    if (store.versionCode !== 1) errors.push("storeRelease.versionCode must stay 1");
    if (store.hashes?.algorithm !== "sha256") errors.push("hashes.algorithm must be sha256");

    // storeRelease input hashes freeze the Phase 18 cut. When mainline pin has moved past
    // that contentVersion (Finish 2.0 → 2.0.0), live files may diverge — keep the archive pin.
    const mainlinePastStoreCut = pin.contentVersion !== store.contentVersion;
    if (!mainlinePastStoreCut) {
      const inputs = store.hashes?.inputs ?? {};
      for (const rel of catalog.storeBuildHashes.inputFiles as string[]) {
        const key = rel.replace(/^shared\//, "").replace(/\//g, "__").replace(/\.json$/, "");
        const expected = sha256File(resolve(root, rel));
        if (inputs[key] !== expected) {
          errors.push(`stale hash for ${rel} — run npm run public-ship:hash`);
        }
      }
    } else if (!store.hashes?.inputs || Object.keys(store.hashes.inputs).length < 1) {
      errors.push("storeRelease.hashes.inputs must remain pinned for the v1.0.0-store archive");
    }

    const artifacts = store.hashes?.artifacts ?? {};
    const policy = store.hashes?.artifactHashPolicy ?? catalog.storeBuildHashes.artifactHashPolicy;
    for (const [slot, rel] of Object.entries(
      catalog.storeBuildHashes.artifactSlots as Record<string, string>,
    )) {
      const abs = resolve(root, rel);
      const pinned = artifacts[slot] ?? null;
      if (pinned === null) {
        // null_until_built: local/CI build outputs may exist without locking the pin yet.
        if (policy !== "null_until_built" && existsSync(abs)) {
          errors.push(`artifact ${slot} built but pin is null`);
        }
        continue;
      }
      if (!existsSync(abs)) {
        errors.push(`artifact ${slot} missing on disk but pin has hash`);
        continue;
      }
      if (sha256File(abs) !== pinned) {
        errors.push(`artifact hash mismatch ${slot} — run npm run public-ship:hash -- --artifacts`);
      }
    }
  }

  if (!ci.includes("web-release")) errors.push("ci.yml missing web-release job");
  if (!ci.includes("web-release-dist")) errors.push("ci.yml missing web-release-dist artifact");
  if (!ci.includes("public-ship:validate")) errors.push("ci.yml missing public-ship:validate");
  if (!ci.includes("android-release")) errors.push("ci.yml missing android-release");

  if (listing.publicShipPhase !== 18) errors.push("listing.publicShipPhase must be 18");
  if (listing.publicShipCatalog !== "shared/ship/public-ship.json") {
    errors.push("listing.publicShipCatalog mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("public-ship:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK public-ship:validate — production track + web 1.0 release ready (tag v1.0.0-store)");
