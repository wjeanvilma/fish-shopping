/**
 * Finish 5.0 Phase 30 — 5.0.0 freeze & DoD readiness.
 *
 * Usage:
 *   npm run freeze5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { PARITY_LOCK_SUITE_IDS } from "../src/engine/parityLock";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  FREEZE_50,
  FREEZE_50_CONTENT_FLOORS,
  FREEZE_50_CONTENT_VERSION,
  FREEZE_50_MARKER,
  FREEZE_50_PHASE,
  FREEZE_50_RELEASE_TAG,
  FREEZE_50_SCHEMA,
  FREEZE_50_VERSION_CODE,
} from "../src/ship/freeze50";
import { LOC_FLOORS, measureLocScoreboard } from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/freeze-5.0.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-freeze-5.0.0.json"));
  const freeze4 = readJson(resolve(root, "shared/ship/freeze-4.0.0.json"));
  const freeze3 = readJson(resolve(root, "shared/ship/freeze-3.0.0.json"));
  const freeze2 = readJson(resolve(root, "shared/ship/freeze-2.0.0.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const listingCopy = readJson(resolve(root, "shared/store/listing-copy.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const loc = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Freeze50.kt"),
    "utf8",
  );
  const androidEn = readFileSync(resolve(root, "app/src/main/res/values/strings.xml"), "utf8");

  if (ship.phase !== 30) errors.push(`ship phase expected 30, got ${ship.phase}`);
  if (ship.schema !== FREEZE_50_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (FREEZE_50_PHASE !== 30) errors.push("phase mirror mismatch");
  if (ship.freeze5Marker !== FREEZE_50_MARKER) errors.push("ship marker mismatch");
  if (fixture.freeze5Marker !== FREEZE_50_MARKER) errors.push("fixture marker mismatch");

  if (ship.contentVersion !== "5.0.0" || FREEZE_50_CONTENT_VERSION !== "5.0.0") {
    errors.push("freeze contentVersion must be 5.0.0");
  }
  if (ship.releaseTag !== "v5.0.0" || FREEZE_50_RELEASE_TAG !== "v5.0.0") {
    errors.push("freeze releaseTag must be v5.0.0");
  }
  if (ship.versionCode !== 6 || FREEZE_50_VERSION_CODE !== 6) {
    errors.push("freeze versionCode must be 6");
  }
  if (ship.schemaVersion !== 26) errors.push("ship schemaVersion must be 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (ship.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (ship.priorFreeze !== "shared/ship/freeze-4.0.0.json") errors.push("priorFreeze path mismatch");
  if (freeze4.contentVersion !== "4.0.0" || freeze4.releaseTag !== "v4.0.0") {
    errors.push("Finish 4.0 freeze-4.0.0 must stay historical at 4.0.0");
  }
  if (freeze3.contentVersion !== "3.0.0" || freeze3.releaseTag !== "v3.0.0") {
    errors.push("Finish 3.0 freeze-3.0.0 must stay historical at 3.0.0");
  }
  if (freeze2.contentVersion !== "2.0.0" || freeze2.releaseTag !== "v2.0.0") {
    errors.push("Finish 2.0 freeze-2.0.0 must stay historical at 2.0.0");
  }
  if ((ship.softFloors?.finish4HistoricalVersionCode as number) < 5) {
    errors.push("soft floor finish4HistoricalVersionCode must stay ≥5");
  }

  // Soft-floor: Finish 6.0 Phase 30 may advance live pin to 6.0.0 / vc 7.
  if (!["5.0.0", "6.0.0"].includes(pin.contentVersion)) {
    errors.push("RELEASE_PIN contentVersion must be 5.0.0 or 6.0.0");
  }
  if (!["5.0.0", "6.0.0"].includes(pin.versionName)) {
    errors.push("RELEASE_PIN versionName must be 5.0.0 or 6.0.0");
  }
  if ((pin.versionCode ?? 0) < 6) errors.push("RELEASE_PIN versionCode must be ≥ 6");
  if (!["v5.0.0", "v6.0.0"].includes(pin.releaseTag)) {
    errors.push("RELEASE_PIN releaseTag must be v5.0.0 or v6.0.0");
  }
  if (pin.schemaVersion < 26) errors.push("RELEASE_PIN schemaVersion must be >= 26");
  if (pin.freeze50 !== "shared/ship/freeze-5.0.0.json") errors.push("RELEASE_PIN.freeze50 path");
  if (pin.freeze40 !== "shared/ship/freeze-4.0.0.json") errors.push("RELEASE_PIN.freeze40 must remain");
  if (pin.freeze30 !== "shared/ship/freeze-3.0.0.json") errors.push("RELEASE_PIN.freeze30 must remain");
  if (pin.freeze20 !== "shared/ship/freeze-2.0.0.json") errors.push("RELEASE_PIN.freeze20 must remain");
  if (pin.completeTag !== "v1.0-complete") errors.push("completeTag archive must stay v1.0-complete");
  if (!pin.fixtures?.includes("parity-freeze-5.0.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-freeze-5.0.0.json");
  }
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");
  if (!["5.0.0", "6.0.0"].includes(pkg.version)) {
    errors.push("web/package.json version must be 5.0.0 or 6.0.0");
  }

  const floors = FREEZE_50_CONTENT_FLOORS;
  const seasonal = pack.seasonalEvents?.events ?? pack.seasonalEvents ?? [];
  const chains = new Set(
    (pack.contracts?.templates as any[] | undefined)?.map((t) => t.chainId).filter(Boolean) ?? [],
  );
  const rivals = ((pack.rivalMarkets as { rivals?: any[] } | undefined)?.rivals ?? []).length;
  const counts = {
    harbors: (pack.harbors as any[]).length,
    species: (pack.species as any[]).length,
    machines: (pack.machines as any[]).length,
    quests: (pack.quests as any[]).length,
    seasonalEvents: (seasonal as any[]).length,
    baits: (pack.bait as any[]).length,
    cosmetics: (entitlements.cosmetics as any[]).length,
    deliveryChains: chains.size,
    rivalMarkets: rivals,
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

  const freeze = dod.finish5Freeze;
  if (!freeze) errors.push("DoD missing finish5Freeze block");
  else {
    if (freeze.status !== "ready_for_release_tag" && freeze.status !== "tag_cut" && freeze.status !== "archived") {
      errors.push(`finish5Freeze.status not ready: ${freeze.status}`);
    }
    if (freeze.releaseTag !== "v5.0.0") errors.push("finish5Freeze.releaseTag must be v5.0.0");
    if (freeze.contentVersion !== "5.0.0") errors.push("finish5Freeze.contentVersion must be 5.0.0");
    if (freeze.schemaVersion !== 26) errors.push("finish5Freeze.schemaVersion must be 26");
    if (freeze.catalog !== "shared/ship/freeze-5.0.0.json") errors.push("finish5Freeze.catalog mismatch");
    if (freeze.versionCode !== 6) errors.push("finish5Freeze.versionCode must be 6");
  }
  if (!["5.0.0", "6.0.0"].includes(dod.contentVersion)) {
    errors.push("DoD contentVersion must be 5.0.0 or 6.0.0");
  }
  if (!["v5.0.0", "v6.0.0"].includes(dod.releaseTag)) {
    errors.push("DoD releaseTag must be v5.0.0 or v6.0.0");
  }
  if ((dod.schemaVersion ?? 0) < 26) errors.push("DoD schemaVersion must be ≥ 26");
  if (dod.completeTag !== "v1.0-complete") errors.push("DoD completeTag archive must stay v1.0-complete");
  if (dod.closeout?.status !== "archived") errors.push("post-1.0 closeout must stay archived");
  if (dod.finish4Freeze?.releaseTag !== "v4.0.0") {
    errors.push("finish4Freeze must remain historical at v4.0.0");
  }
  if (dod.finish3Freeze?.releaseTag !== "v3.0.0") {
    errors.push("finish3Freeze must remain historical at v3.0.0");
  }
  if (dod.finish2Freeze?.releaseTag !== "v2.0.0") {
    errors.push("finish2Freeze must remain historical at v2.0.0");
  }
  if ((dod.quotas?.quests ?? 0) < 75) errors.push("DoD quotas.quests must be ≥ 75");
  if ((dod.quotas?.speciesMin ?? 0) < 125) errors.push("DoD quotas.speciesMin must be ≥ 125");
  if ((dod.quotas?.machineClasses ?? 0) < 14) errors.push("DoD quotas.machineClasses must be ≥ 14");
  if ((dod.quotas?.parityLockSuites ?? 0) < 20) errors.push("DoD quotas.parityLockSuites must be ≥ 20");

  if (loc.enforceFloors !== true) errors.push("loc-floors.enforceFloors must be true at Phase 30");
  if (loc.enforceMode !== "freeze_anti_regression") {
    errors.push("loc-floors.enforceMode must be freeze_anti_regression");
  }
  if (LOC_FLOORS.enforceFloors !== true) errors.push("LOC_FLOORS.enforceFloors mirror must be true");
  if ((loc.scopes?.gameCore?.planTarget ?? 0) < 38000) errors.push("planTarget gameCore must be ≥38000");
  if ((loc.scopes?.app?.planTarget ?? 0) < 26000) errors.push("planTarget app must be ≥26000");
  if ((loc.scopes?.webSrc?.planTarget ?? 0) < 56000) errors.push("planTarget webSrc must be ≥56000");
  if ((loc.productTotalPlanTarget ?? 0) < 120000) errors.push("productTotalPlanTarget must be ≥120000");
  if ((loc.scopes?.gameCore?.phase30Floor ?? 0) < 32000) {
    errors.push("gameCore freeze floor must be ≥ 32000");
  }
  if ((loc.scopes?.app?.phase30Floor ?? 0) < 15200) errors.push("app freeze floor must be ≥ 15200");
  if ((loc.scopes?.webSrc?.phase30Floor ?? 0) < 42500) {
    errors.push("webSrc freeze floor must be ≥ 42500");
  }
  if ((loc.productTotalFloor ?? 0) < 90000) errors.push("productTotalFloor must be ≥ 90000");
  // Soft-floor: Finish 6.0 may refresh freezeCut above Finish 5.0 measured cut.
  if ((loc.freezeCut?.productTotal ?? 0) < 90000) {
    errors.push("loc-floors freezeCut.productTotal must be ≥ Finish 5.0 cut");
  }
  if ((loc.softFloors?.finish4HistoricalProductTotalFloor as number) < 73100) {
    errors.push("soft floor Finish 4.0 productTotalFloor must stay ≥73100");
  }
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

  if (listing.freeze50Phase !== 30) errors.push("listing.freeze50Phase must be 30");
  if (listing.freeze50Catalog !== "shared/ship/freeze-5.0.0.json") {
    errors.push("listing.freeze50Catalog mismatch");
  }
  if (!["5.0.0", "6.0.0"].includes(listing.whatsNewVersion)) {
    errors.push("listing.whatsNewVersion must be 5.0.0 or 6.0.0");
  }
  if (!["5.0.0", "6.0.0"].includes(listingCopy.copy?.whatsNewVersion)) {
    errors.push("listing-copy whatsNewVersion must be 5.0.0 or 6.0.0");
  }
  if (!androidEn.includes("5.0.0") && !androidEn.includes("6.0.0")) {
    errors.push("Android values/strings.xml must mention 5.0.0 or 6.0.0 whats-new");
  }

  if (pin.storeRelease?.contentVersion !== "1.0.0") {
    errors.push("storeRelease.contentVersion stays 1.0.0");
  }
  if (pin.completeRelease?.releaseTag !== "v1.0-complete") {
    errors.push("completeRelease.releaseTag stays v1.0-complete");
  }

  if (!ship.manualCommands?.some((c: string) => c.includes("git tag -a v5.0.0"))) {
    errors.push("manualCommands must include git tag -a v5.0.0");
  }
  if (freeze?.status === "tag_cut" && !freeze?.gitHeadAtPin) {
    errors.push("tag_cut requires gitHeadAtPin");
  }

  if (kickoff.contentVersion !== "5.0.0") errors.push("kickoff contentVersion must be 5.0.0 at freeze");
  if (kickoff.baseline?.contentVersion !== "4.0.0") {
    errors.push("kickoff.baseline.contentVersion must stay Phase 1 historical 4.0.0");
  }
  if (kickoff.schemaVersion < 26) errors.push("kickoff schemaVersion must be ≥ 26");
  if (kickoff.endState?.contentVersion !== "5.0.0") errors.push("kickoff endState.contentVersion must be 5.0.0");
  if (kickoff.endState?.versionCode !== 6) errors.push("kickoff endState.versionCode must be 6");
  if (FINISH5_OPEN_GAP_FLAGS.length !== 0) {
    errors.push(`OPEN_GAP_FLAGS expected 0 at freeze, got ${FINISH5_OPEN_GAP_FLAGS.length}`);
  }
  if (dod.finish5Kickoff?.status !== "frozen") {
    errors.push("DoD finish5Kickoff.status must be frozen");
  }
  const phase30 = (kickoff.phases as any[])?.find((p: any) => p.phase === 30);
  if (!phase30 || phase30.validate !== "freeze5:validate") {
    errors.push("kickoff phase 30 validate must be freeze5:validate");
  }
  if (!finish5Kt.includes("freeze5:validate")) {
    errors.push("Finish5Kickoff.kt phase 30 missing freeze5:validate");
  }
  if (!kotlin.includes("FREEZE_5_MARKER") || !kotlin.includes("VERSION_CODE = 6")) {
    errors.push("Kotlin Freeze50 missing constants");
  }

  if (!ci.includes("freeze5:validate")) errors.push("ci.yml missing freeze5:validate");
  if (!ci.includes("freeze4:validate")) errors.push("ci.yml missing soft freeze4:validate");
  if (!ci.includes("freeze3:validate")) errors.push("ci.yml missing soft freeze3:validate");
  if (!ci.includes("freeze2:validate")) errors.push("ci.yml missing soft freeze2:validate");
  if (!pkg.scripts?.["freeze5:validate"]) errors.push("web/package.json missing freeze5:validate");
  if (ship.softFreeze4Validate !== "npm run freeze4:validate") {
    errors.push("catalog softFreeze4Validate must pin freeze4:validate");
  }

  for (const gate of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (
      ![
        "pin_at_5_0_0",
        "content_floors_met",
        "loc_freeze_enforced",
        "dod_finish5_ready",
        "finish4_historical",
        "tag_manual_only",
      ].includes(gate)
    ) {
      errors.push(`unexpected fixture gate ${gate}`);
    }
  }

  if (FREEZE_50.parityFixture !== "shared/fixtures/parity-freeze-5.0.0.json") {
    errors.push("ship parityFixture mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("freeze5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK freeze5:validate — 5.0.0 freeze pin/floors/DoD ready (tag manual)");
