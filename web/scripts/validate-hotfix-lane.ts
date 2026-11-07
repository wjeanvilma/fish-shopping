/**
 * Phase 29 (post-1.0) — 1.0.x hotfix lane readiness.
 *
 * Usage:
 *   npm run hotfix:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HOTFIX_LANE,
  HOTFIX_LANE_PHASE,
  HOTFIX_LANE_SCHEMA,
  hotfixTagFor,
  initialHotfixRolloutPercent,
  isHotfixVersionName,
  isValidHotfixBump,
  validateHotfixPin,
} from "../src/engine/hotfixLane";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/hotfix-lane.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const publicShip = readJson(resolve(root, "shared/ship/public-ship.json"));
  const aab = readJson(resolve(root, "shared/android/aab-ci.json"));
  const web = readFileSync(resolve(root, "web/src/engine/hotfixLane.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/HotfixLane.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 29) errors.push(`phase expected 29, got ${catalog.phase}`);
  if (catalog.schema !== HOTFIX_LANE_SCHEMA) errors.push("bad schema");
  if (catalog.schemaVersion !== 20) errors.push("schemaVersion must stay 20");
  if (catalog.packageName !== listing.packageName) errors.push("packageName ≠ listing");
  if (catalog.contentVersionLine !== "1.0.x") errors.push("contentVersionLine must be 1.0.x");

  if (listing.hotfixLanePhase !== 29) errors.push("listing.hotfixLanePhase must be 29");
  if (listing.hotfixLaneCatalog !== "shared/ship/hotfix-lane.json") {
    errors.push("listing.hotfixLaneCatalog mismatch");
  }
  if (pin.hotfixLane !== "shared/ship/hotfix-lane.json") {
    errors.push("RELEASE_PIN.hotfixLane must point at catalog");
  }

  const pol = catalog.versioning;
  if (pol.allowedMajor !== 1 || pol.allowedMinor !== 0) errors.push("versioning must lock 1.0.x");
  if (pol.schemaMustStay !== 20) errors.push("versioning.schemaMustStay must be 20");
  if (!pol.forbidSchemaBump) errors.push("forbidSchemaBump required");
  if (!pol.forbidMajorMinorBump) errors.push("forbidMajorMinorBump required");
  if (!pol.versionNameMatchesContentVersion) errors.push("versionNameMatchesContentVersion required");
  if (!pol.versionCodeStrictlyIncreases) errors.push("versionCodeStrictlyIncreases required");

  const steps = catalog.stagedRollout?.steps as { percent: number; minSoakHours: number; label: string }[];
  if (!steps || steps.length < 3) errors.push("stagedRollout.steps need ≥3");
  else {
    if (steps[0].percent !== 10 || steps[0].label !== "canary") errors.push("first step must be canary@10");
    if (steps[1].percent !== 50 || steps[1].label !== "expand") errors.push("second step must be expand@50");
    if (steps[2].percent !== 100 || steps[2].label !== "full") errors.push("third step must be full@100");
    if (steps[0].minSoakHours < 24 || steps[1].minSoakHours < 24) {
      errors.push("canary/expand soak must be ≥24h");
    }
  }
  if ((catalog.stagedRollout?.haltCriteria as string[]).length < 3) {
    errors.push("haltCriteria too short");
  }

  if (catalog.ci?.job !== "android-hotfix") errors.push("ci.job must be android-hotfix");
  if (catalog.ci?.artifactName !== "android-hotfix-aab") errors.push("ci.artifactName mismatch");
  if (catalog.ci?.trigger !== "workflow_dispatch") errors.push("ci.trigger must be workflow_dispatch");
  if (catalog.ci?.gradleTask !== aab.gradleTask) errors.push("ci.gradleTask ≠ aab-ci");
  if (aab.hotfixJob !== "android-hotfix") errors.push("aab-ci.hotfixJob must be android-hotfix");
  if (aab.hotfixArtifactUploadName !== "android-hotfix-aab") {
    errors.push("aab-ci.hotfixArtifactUploadName mismatch");
  }

  const rollout = publicShip.android?.stagedRollout;
  if (rollout?.hotfixLanePhase !== 29) errors.push("public-ship stagedRollout.hotfixLanePhase must be 29");
  if (rollout?.hotfixLaneCatalog !== "shared/ship/hotfix-lane.json") {
    errors.push("public-ship stagedRollout.hotfixLaneCatalog mismatch");
  }
  if (!String(rollout?.note ?? "").includes("Phase 29")) {
    errors.push("public-ship stagedRollout.note must mention Phase 29");
  }

  // 1.0.x hotfix policy stays frozen at schema 20. Finish 2.0 mainline may exceed that
  // (schema 21+); only validateHotfixPin against the live pin when still on the freeze.
  if (pin.storeRelease?.schemaVersion !== 20) {
    errors.push("storeRelease.schemaVersion must stay 20 (Phase 18 cut)");
  }
  if (pin.schemaVersion === pol.schemaMustStay) {
    const pinErrors = validateHotfixPin({
      versionName: pin.versionName,
      contentVersion: pin.contentVersion,
      versionCode: pin.versionCode,
      schemaVersion: pin.schemaVersion,
      storeRelease: pin.storeRelease,
    });
    for (const e of pinErrors) errors.push(`RELEASE_PIN: ${e}`);
  } else if (pin.schemaVersion < pol.schemaMustStay) {
    errors.push(`RELEASE_PIN schemaVersion ${pin.schemaVersion} below hotfix freeze ${pol.schemaMustStay}`);
  } else if (!Number.isInteger(pin.schemaVersion) || pin.schemaVersion < 21) {
    errors.push("mainline RELEASE_PIN schemaVersion must be ≥21 once past hotfix freeze");
  }

  // Hotfix lane stays on 1.0.x. Finish 2.0 mainline freeze (2.0.0 / schema 23) leaves that line.
  if (isHotfixVersionName(pin.versionName)) {
    if (hotfixTagFor(pin.versionName) !== `v${pin.versionName}`) {
      errors.push("hotfix tag pattern mismatch");
    }
  } else if (!/^2\.\d+\.\d+$/.test(pin.versionName)) {
    errors.push(`pin versionName ${pin.versionName} must be 1.0.x hotfix or 2.x mainline`);
  } else if (hotfixTagFor("1.0.1") !== "v1.0.1") {
    errors.push("hotfix tag helper regression");
  }
  if (initialHotfixRolloutPercent() !== 10) errors.push("initialHotfixRolloutPercent must be 10");
  if (!isValidHotfixBump("1.0.1", "1.0.2")) errors.push("isValidHotfixBump 1.0.1→1.0.2 failed");
  if (isValidHotfixBump("1.0.1", "1.1.0")) errors.push("isValidHotfixBump must reject minor bump");
  if (isValidHotfixBump("1.0.1", "1.0.1")) errors.push("isValidHotfixBump must reject same patch");

  if (HOTFIX_LANE_PHASE !== 29) errors.push("HOTFIX_LANE_PHASE mirror mismatch");
  if (HOTFIX_LANE.ci.job !== catalog.ci.job) errors.push("web HOTFIX_LANE.ci.job mismatch");

  if (!web.includes("validateHotfixPin")) errors.push("web hotfixLane missing validateHotfixPin");
  if (!kotlin.includes("validatePin")) errors.push("Kotlin HotfixLane missing validatePin");
  if (!kotlin.includes("INITIAL_ROLLOUT_PERCENT = 10")) {
    errors.push("Kotlin INITIAL_ROLLOUT_PERCENT must be 10");
  }

  if (!ci.includes("hotfix:validate")) errors.push("ci.yml missing hotfix:validate");
  if (!ci.includes("android-hotfix")) errors.push("ci.yml missing android-hotfix job");
  if (!ci.includes("android-hotfix-aab")) errors.push("ci.yml missing android-hotfix-aab");
  if (!ci.includes("workflow_dispatch")) errors.push("ci.yml missing workflow_dispatch");
  if (!ci.includes("confirm_pin_bumped")) errors.push("ci.yml missing confirm_pin_bumped input");
  if (!ci.includes("rollout_step")) errors.push("ci.yml missing rollout_step input");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if ((catalog.checklist as string[]).length < 6) errors.push("checklist too short");
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("hotfix:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK hotfix:validate — 1.0.x versioning + staged rollout 10→50→100 + android-hotfix CI");
