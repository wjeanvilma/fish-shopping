/**
 * Finish 2.0 Phase 30 — 2.0.0 freeze & DoD readiness.
 *
 * Usage:
 *   npm run freeze2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  FREEZE_20,
  FREEZE_20_CONTENT_FLOORS,
  FREEZE_20_CONTENT_VERSION,
  FREEZE_20_MARKER,
  FREEZE_20_PHASE,
  FREEZE_20_RELEASE_TAG,
  FREEZE_20_SCHEMA,
  FREEZE_20_VERSION_CODE,
} from "../src/ship/freeze20";
import { LOC_FLOORS, measureLocScoreboard } from "../src/ship/locFloors";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/freeze-2.0.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-freeze-2.0.0.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const listingCopy = readJson(resolve(root, "shared/store/listing-copy.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const loc = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (ship.phase !== 30) errors.push(`ship phase expected 30, got ${ship.phase}`);
  if (ship.schema !== FREEZE_20_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (FREEZE_20_PHASE !== 30) errors.push("phase mirror mismatch");
  if (ship.freeze2Marker !== FREEZE_20_MARKER) errors.push("ship marker mismatch");
  if (fixture.freeze2Marker !== FREEZE_20_MARKER) errors.push("fixture marker mismatch");

  if (ship.contentVersion !== "2.0.0" || FREEZE_20_CONTENT_VERSION !== "2.0.0") {
    errors.push("freeze contentVersion must be 2.0.0");
  }
  if (ship.releaseTag !== "v2.0.0" || FREEZE_20_RELEASE_TAG !== "v2.0.0") {
    errors.push("freeze releaseTag must be v2.0.0");
  }
  if (ship.versionCode !== 3 || FREEZE_20_VERSION_CODE !== 3) {
    errors.push("freeze versionCode must be 3");
  }
  if (ship.schemaVersion !== 23) errors.push("ship schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");

  // Pin / pack lock
  if (pin.contentVersion !== "2.0.0") errors.push("RELEASE_PIN contentVersion must be 2.0.0");
  if (pin.versionName !== "2.0.0") errors.push("RELEASE_PIN versionName must be 2.0.0");
  if (pin.versionCode !== 3) errors.push("RELEASE_PIN versionCode must be 3");
  if (pin.releaseTag !== "v2.0.0") errors.push("RELEASE_PIN releaseTag must be v2.0.0");
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN schemaVersion must be 23");
  if (pin.freeze20 !== "shared/ship/freeze-2.0.0.json") errors.push("RELEASE_PIN.freeze20 path");
  if (pin.completeTag !== "v1.0-complete") errors.push("completeTag archive must stay v1.0-complete");
  if (!pin.fixtures?.includes("parity-freeze-2.0.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-freeze-2.0.0.json");
  }
  if (pack.contentVersion !== "2.0.0") errors.push("content-pack must be 2.0.0");
  if (pkg.version !== "2.0.0") errors.push("web/package.json version must be 2.0.0");

  // Content floors
  const floors = FREEZE_20_CONTENT_FLOORS;
  const seasonal = pack.seasonalEvents?.events ?? pack.seasonalEvents ?? [];
  const counts = {
    harbors: (pack.harbors as any[]).length,
    species: (pack.species as any[]).length,
    machines: (pack.machines as any[]).length,
    quests: (pack.quests as any[]).length,
    seasonalEvents: (seasonal as any[]).length,
    baits: (pack.bait as any[]).length,
    cosmetics: (entitlements.cosmetics as any[]).length,
  };
  for (const [key, min] of Object.entries(floors) as [keyof typeof floors, number][]) {
    if ((counts as any)[key] < min) {
      errors.push(`content floor ${key}: ${counts[key]} < ${min}`);
    }
    if ((ship.contentFloors?.[key] ?? 0) < min) {
      errors.push(`ship contentFloors.${key} below freeze floor`);
    }
  }
  for (const cos of entitlements.cosmetics as any[]) {
    if (cos.powerNeutral !== true) errors.push(`cosmetic ${cos.sku} must be powerNeutral`);
  }

  // DoD finish2 freeze
  const freeze = dod.finish2Freeze;
  if (!freeze) errors.push("DoD missing finish2Freeze block");
  else {
    if (freeze.status !== "ready_for_release_tag" && freeze.status !== "tag_cut" && freeze.status !== "archived") {
      errors.push(`finish2Freeze.status not ready: ${freeze.status}`);
    }
    if (freeze.releaseTag !== "v2.0.0") errors.push("finish2Freeze.releaseTag must be v2.0.0");
    if (freeze.contentVersion !== "2.0.0") errors.push("finish2Freeze.contentVersion must be 2.0.0");
    if (freeze.schemaVersion !== 23) errors.push("finish2Freeze.schemaVersion must be 23");
    if (freeze.catalog !== "shared/ship/freeze-2.0.0.json") errors.push("finish2Freeze.catalog mismatch");
    if (freeze.versionCode !== 3) errors.push("finish2Freeze.versionCode must be 3");
  }
  if (dod.contentVersion !== "2.0.0") errors.push("DoD contentVersion must be 2.0.0");
  if (dod.releaseTag !== "v2.0.0") errors.push("DoD releaseTag must be v2.0.0");
  if (dod.schemaVersion !== 23) errors.push("DoD schemaVersion must be 23");
  if (dod.completeTag !== "v1.0-complete") errors.push("DoD completeTag archive must stay v1.0-complete");
  if (dod.closeout?.status !== "archived") errors.push("post-1.0 closeout must stay archived");
  if ((dod.quotas?.quests ?? 0) < 20) errors.push("DoD quotas.quests must be ≥ 20");
  if ((dod.quotas?.cosmetics ?? 0) < 12) errors.push("DoD quotas.cosmetics must be ≥ 12");

  // LOC freeze enforcement
  if (loc.enforceFloors !== true) errors.push("loc-floors.enforceFloors must be true at Phase 30");
  if (loc.enforceMode !== "freeze_anti_regression") {
    errors.push("loc-floors.enforceMode must be freeze_anti_regression");
  }
  if (LOC_FLOORS.enforceFloors !== true) errors.push("LOC_FLOORS.enforceFloors mirror must be true");
  if ((loc.scopes?.gameCore?.planTarget ?? 0) !== 25000) errors.push("planTarget gameCore must stay 25000");
  if ((loc.scopes?.app?.planTarget ?? 0) !== 16000) errors.push("planTarget app must stay 16000");
  if ((loc.scopes?.webSrc?.planTarget ?? 0) !== 38000) errors.push("planTarget webSrc must stay 38000");
  if ((loc.productTotalPlanTarget ?? 0) !== 80000) errors.push("productTotalPlanTarget must stay 80000");
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

  // Listing / copy
  if (listing.freeze20Phase !== 30) errors.push("listing.freeze20Phase must be 30");
  if (listing.freeze20Catalog !== "shared/ship/freeze-2.0.0.json") {
    errors.push("listing.freeze20Catalog mismatch");
  }
  if (listing.whatsNewVersion !== "2.0.0") errors.push("listing.whatsNewVersion must be 2.0.0");
  if (listingCopy.copy?.whatsNewVersion !== "2.0.0") {
    errors.push("listing-copy whatsNewVersion must be 2.0.0");
  }

  // Store release / complete archives untouched
  if (pin.storeRelease?.contentVersion !== "1.0.0") {
    errors.push("storeRelease.contentVersion stays 1.0.0");
  }
  if (pin.storeRelease?.releaseTag !== "v1.0.0-store") {
    errors.push("storeRelease.releaseTag stays v1.0.0-store");
  }
  if (pin.completeRelease?.releaseTag !== "v1.0-complete") {
    errors.push("completeRelease.releaseTag stays v1.0-complete");
  }

  // Manual tag only — freeze catalog must not claim tag already cut
  if (!ship.manualCommands?.some((c: string) => c.includes("git tag -a v2.0.0"))) {
    errors.push("manualCommands must include git tag -a v2.0.0");
  }
  if (freeze?.status === "tag_cut" && !freeze?.gitHeadAtPin) {
    errors.push("tag_cut requires gitHeadAtPin");
  }

  if (!ci.includes("freeze2:validate")) errors.push("ci.yml missing freeze2:validate");
  if (!pkg.scripts?.["freeze2:validate"]) errors.push("web/package.json missing freeze2:validate");

  for (const gate of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (!["pin_at_2_0_0", "content_floors_met", "loc_freeze_enforced", "dod_finish2_ready", "tag_manual_only"].includes(gate)) {
      errors.push(`unexpected fixture gate ${gate}`);
    }
  }

  if (FREEZE_20.parityFixture !== "shared/fixtures/parity-freeze-2.0.0.json") {
    errors.push("ship parityFixture mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("freeze2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK freeze2:validate — 2.0.0 freeze pin/floors/DoD ready (tag manual)");
