/**
 * Finish 3.0 Phase 30 — 3.0.0 freeze & DoD readiness.
 *
 * Usage:
 *   npm run freeze3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  FREEZE_30,
  FREEZE_30_CONTENT_FLOORS,
  FREEZE_30_CONTENT_VERSION,
  FREEZE_30_MARKER,
  FREEZE_30_PHASE,
  FREEZE_30_RELEASE_TAG,
  FREEZE_30_SCHEMA,
  FREEZE_30_VERSION_CODE,
} from "../src/ship/freeze30";
import { LOC_FLOORS, measureLocScoreboard } from "../src/ship/locFloors";
import { PARITY_LOCK_SUITE_IDS } from "../src/engine/parityLock";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/freeze-3.0.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-freeze-3.0.0.json"));
  const freeze2 = readJson(resolve(root, "shared/ship/freeze-2.0.0.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const listingCopy = readJson(resolve(root, "shared/store/listing-copy.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const loc = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Freeze30.kt"),
    "utf8",
  );
  const androidEn = readFileSync(resolve(root, "app/src/main/res/values/strings.xml"), "utf8");

  if (ship.phase !== 30) errors.push(`ship phase expected 30, got ${ship.phase}`);
  if (ship.schema !== FREEZE_30_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (FREEZE_30_PHASE !== 30) errors.push("phase mirror mismatch");
  if (ship.freeze3Marker !== FREEZE_30_MARKER) errors.push("ship marker mismatch");
  if (fixture.freeze3Marker !== FREEZE_30_MARKER) errors.push("fixture marker mismatch");

  if (ship.contentVersion !== "3.0.0" || FREEZE_30_CONTENT_VERSION !== "3.0.0") {
    errors.push("freeze contentVersion must be 3.0.0");
  }
  if (ship.releaseTag !== "v3.0.0" || FREEZE_30_RELEASE_TAG !== "v3.0.0") {
    errors.push("freeze releaseTag must be v3.0.0");
  }
  if (ship.versionCode !== 4 || FREEZE_30_VERSION_CODE !== 4) {
    errors.push("freeze versionCode must be 4");
  }
  if (ship.schemaVersion !== 24) errors.push("ship schemaVersion must be 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (ship.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (ship.priorFreeze !== "shared/ship/freeze-2.0.0.json") errors.push("priorFreeze path mismatch");
  if (freeze2.contentVersion !== "2.0.0" || freeze2.releaseTag !== "v2.0.0") {
    errors.push("Finish 2.0 freeze-2.0.0 must stay historical at 2.0.0");
  }

  // Soft floor: live pin may advance to Finish 4.0; freeze-3.0.0 catalog stays historical.
  if (!["3.0.0", "4.0.0", "5.0.0"].includes(pin.contentVersion)) {
    errors.push("RELEASE_PIN contentVersion must be 3.0.0, 4.0.0, or 5.0.0");
  }
  if (!["3.0.0", "4.0.0", "5.0.0"].includes(pin.versionName)) {
    errors.push("RELEASE_PIN versionName must be 3.0.0, 4.0.0, or 5.0.0");
  }
  if ((pin.versionCode ?? 0) < 4) errors.push("RELEASE_PIN versionCode must be ≥ 4");
  if (!["v3.0.0", "v4.0.0", "v5.0.0"].includes(pin.releaseTag)) {
    errors.push("RELEASE_PIN releaseTag must be v3.0.0, v4.0.0, or v5.0.0");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN schemaVersion must be >= 24");
  if (pin.freeze30 !== "shared/ship/freeze-3.0.0.json") errors.push("RELEASE_PIN.freeze30 path");
  if (pin.freeze20 !== "shared/ship/freeze-2.0.0.json") errors.push("RELEASE_PIN.freeze20 must remain");
  if (pin.completeTag !== "v1.0-complete") errors.push("completeTag archive must stay v1.0-complete");
  if (!pin.fixtures?.includes("parity-freeze-3.0.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-freeze-3.0.0.json");
  }
  if (!["3.0.0", "4.0.0", "5.0.0"].includes(pack.contentVersion)) {
    errors.push("content-pack must be 3.0.0, 4.0.0, or 5.0.0");
  }
  if (!["3.0.0", "4.0.0", "5.0.0"].includes(pkg.version)) {
    errors.push("web/package.json version must be 3.0.0, 4.0.0, or 5.0.0");
  }

  const floors = FREEZE_30_CONTENT_FLOORS;
  const seasonal = pack.seasonalEvents?.events ?? pack.seasonalEvents ?? [];
  const chains = new Set(
    (pack.contracts?.templates as any[] | undefined)?.map((t) => t.chainId).filter(Boolean) ?? [],
  );
  const counts = {
    harbors: (pack.harbors as any[]).length,
    species: (pack.species as any[]).length,
    machines: (pack.machines as any[]).length,
    quests: (pack.quests as any[]).length,
    seasonalEvents: (seasonal as any[]).length,
    baits: (pack.bait as any[]).length,
    cosmetics: (entitlements.cosmetics as any[]).length,
    deliveryChains: chains.size,
    paritySuites: PARITY_LOCK_SUITE_IDS.length,
  };
  for (const [key, min] of Object.entries(floors) as [keyof typeof floors, number][]) {
    if ((counts as any)[key] < min) {
      errors.push(`content floor ${key}: ${(counts as any)[key]} < ${min}`);
    }
    if ((ship.contentFloors?.[key] ?? 0) < min) {
      errors.push(`ship contentFloors.${key} below freeze floor`);
    }
  }
  for (const cos of entitlements.cosmetics as any[]) {
    if (cos.powerNeutral !== true) errors.push(`cosmetic ${cos.sku} must be powerNeutral`);
  }

  const freeze = dod.finish3Freeze;
  if (!freeze) errors.push("DoD missing finish3Freeze block");
  else {
    if (freeze.status !== "ready_for_release_tag" && freeze.status !== "tag_cut" && freeze.status !== "archived") {
      errors.push(`finish3Freeze.status not ready: ${freeze.status}`);
    }
    if (freeze.releaseTag !== "v3.0.0") errors.push("finish3Freeze.releaseTag must be v3.0.0");
    if (freeze.contentVersion !== "3.0.0") errors.push("finish3Freeze.contentVersion must be 3.0.0");
    if (freeze.schemaVersion !== 24) errors.push("finish3Freeze.schemaVersion must be 24");
    if (freeze.catalog !== "shared/ship/freeze-3.0.0.json") errors.push("finish3Freeze.catalog mismatch");
    if (freeze.versionCode !== 4) errors.push("finish3Freeze.versionCode must be 4");
  }
  if (!["3.0.0", "4.0.0", "5.0.0"].includes(dod.contentVersion)) {
    errors.push("DoD contentVersion must be 3.0.0, 4.0.0, or 5.0.0");
  }
  if (!["v3.0.0", "v4.0.0", "v5.0.0"].includes(dod.releaseTag)) {
    errors.push("DoD releaseTag must be v3.0.0, v4.0.0, or v5.0.0");
  }
  if (![24, 25, 26].includes(dod.schemaVersion)) {
    errors.push("DoD schemaVersion must be 24, 25, or 26");
  }
  if (dod.completeTag !== "v1.0-complete") errors.push("DoD completeTag archive must stay v1.0-complete");
  if (dod.closeout?.status !== "archived") errors.push("post-1.0 closeout must stay archived");
  if (dod.finish2Freeze?.releaseTag !== "v2.0.0") {
    errors.push("finish2Freeze must remain historical at v2.0.0");
  }
  if ((dod.quotas?.quests ?? 0) < 30) errors.push("DoD quotas.quests must be ≥ 30");
  if ((dod.quotas?.speciesMin ?? 0) < 75) errors.push("DoD quotas.speciesMin must be ≥ 75");
  if ((dod.quotas?.machineClasses ?? 0) < 10) errors.push("DoD quotas.machineClasses must be ≥ 10");

  if (loc.enforceFloors !== true) errors.push("loc-floors.enforceFloors must be true at Phase 30");
  if (loc.enforceMode !== "freeze_anti_regression") {
    errors.push("loc-floors.enforceMode must be freeze_anti_regression");
  }
  if (LOC_FLOORS.enforceFloors !== true) errors.push("LOC_FLOORS.enforceFloors mirror must be true");
  if ((loc.scopes?.gameCore?.planTarget ?? 0) < 32000) errors.push("planTarget gameCore must be ≥32000 (Finish 4 soft floor)");
  if ((loc.scopes?.app?.planTarget ?? 0) < 20000) errors.push("planTarget app must be ≥20000 (Finish 4 soft floor)");
  if ((loc.scopes?.webSrc?.planTarget ?? 0) < 48000) errors.push("planTarget webSrc must be ≥48000 (Finish 4 soft floor)");
  if ((loc.productTotalPlanTarget ?? 0) < 100000) errors.push("productTotalPlanTarget must be ≥100000 (Finish 4 soft floor)");
  const board = measureLocScoreboard(root);
  if (!board.gameCore.met) {
    errors.push(`game-core LOC ${board.gameCore.lines} < freeze floor ${board.gameCore.floor}`);
  }
  if (!board.app.met) errors.push(`app LOC ${board.app.lines} < freeze floor ${board.app.floor}`);
  if (!board.webSrc.met) {
    errors.push(`web/src LOC ${board.webSrc.lines} < freeze floor ${board.webSrc.floor}`);
  }
  if (!board.productMet) {
    errors.push(`product LOC ${board.productTotal} < freeze floor ${board.productTotalFloor}`);
  }

  if (listing.freeze30Phase !== 30) errors.push("listing.freeze30Phase must be 30");
  if (listing.freeze30Catalog !== "shared/ship/freeze-3.0.0.json") {
    errors.push("listing.freeze30Catalog mismatch");
  }
  if (!["3.0.0", "4.0.0", "5.0.0"].includes(listing.whatsNewVersion)) {
    errors.push("listing.whatsNewVersion must be 3.0.0, 4.0.0, or 5.0.0");
  }
  if (!["3.0.0", "4.0.0", "5.0.0"].includes(listingCopy.copy?.whatsNewVersion)) {
    errors.push("listing-copy whatsNewVersion must be 3.0.0, 4.0.0, or 5.0.0");
  }
  if (
    !androidEn.includes("3.0.0") &&
    !androidEn.includes("4.0.0") &&
    !androidEn.includes("5.0.0")
  ) {
    errors.push("Android values/strings.xml must mention 3.0.0–5.0.0 whats-new");
  }

  if (pin.storeRelease?.contentVersion !== "1.0.0") {
    errors.push("storeRelease.contentVersion stays 1.0.0");
  }
  if (pin.completeRelease?.releaseTag !== "v1.0-complete") {
    errors.push("completeRelease.releaseTag stays v1.0-complete");
  }

  if (!ship.manualCommands?.some((c: string) => c.includes("git tag -a v3.0.0"))) {
    errors.push("manualCommands must include git tag -a v3.0.0");
  }
  if (freeze?.status === "tag_cut" && !freeze?.gitHeadAtPin) {
    errors.push("tag_cut requires gitHeadAtPin");
  }

  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 30) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 30");
  }
  if (kickoff.contentVersion !== "3.0.0") errors.push("kickoff contentVersion must be 3.0.0");
  if (kickoff.baseline?.contentVersion !== "3.0.0") {
    errors.push("kickoff.baseline.contentVersion must be 3.0.0");
  }
  if (dod.finish3Kickoff?.status !== "frozen") {
    errors.push("DoD finish3Kickoff.status must be frozen");
  }
  const phase30 = (kickoff.phases as any[])?.find((p: any) => p.phase === 30);
  if (!phase30 || phase30.validate !== "freeze3:validate") {
    errors.push("kickoff phase 30 validate must be freeze3:validate");
  }
  if (!finish3Kt.includes("freeze3:validate")) {
    errors.push("Finish3Kickoff.kt phase 30 missing freeze3:validate");
  }
  if (!kotlin.includes("FREEZE_3_MARKER") || !kotlin.includes("VERSION_CODE = 4")) {
    errors.push("Kotlin Freeze30 missing constants");
  }

  if (!ci.includes("freeze3:validate")) errors.push("ci.yml missing freeze3:validate");
  if (!ci.includes("freeze2:validate")) errors.push("ci.yml missing baseline freeze2:validate");
  if (!pkg.scripts?.["freeze3:validate"]) errors.push("web/package.json missing freeze3:validate");

  for (const gate of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (
      ![
        "pin_at_3_0_0",
        "content_floors_met",
        "loc_freeze_enforced",
        "dod_finish3_ready",
        "finish2_historical",
        "tag_manual_only",
      ].includes(gate)
    ) {
      errors.push(`unexpected fixture gate ${gate}`);
    }
  }

  if (FREEZE_30.parityFixture !== "shared/fixtures/parity-freeze-3.0.0.json") {
    errors.push("ship parityFixture mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("freeze3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK freeze3:validate — 3.0.0 freeze pin/floors/DoD ready (tag manual)");
