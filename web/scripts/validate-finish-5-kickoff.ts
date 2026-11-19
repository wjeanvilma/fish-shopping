/**
 * Finish 5.0 Phase 1 — kickoff + gap scoreboard readiness.
 *
 * Usage:
 *   npm run finish5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  baselineScoreboard,
  FINISH5_KICKOFF,
  FINISH5_KICKOFF_MARKER,
  FINISH5_KICKOFF_PHASE,
  FINISH5_KICKOFF_SCHEMA,
  FINISH5_OPEN_GAP_FLAGS,
  FINISH5_PHASE_COUNT,
  FINISH5_PLAN,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish5Kickoff";
import { LOC_FLOORS, measureLocScoreboard } from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-finish-5.0-kickoff.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const freeze4 = readJson(resolve(root, "shared/ship/freeze-4.0.0.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const loc = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 1) errors.push(`phase expected 1, got ${catalog.phase}`);
  if (catalog.schema !== FINISH5_KICKOFF_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== FINISH5_PLAN) errors.push("plan must be 30_finish_5.0");
  if (FINISH5_KICKOFF_PHASE !== 1) errors.push("phase mirror mismatch");
  if (catalog.kickoffMarker !== FINISH5_KICKOFF_MARKER) errors.push("kickoff marker mismatch");
  if (fixture.kickoffMarker !== FINISH5_KICKOFF_MARKER) errors.push("fixture marker mismatch");
  // Soft-floor: Phase 30 freeze advances kickoff contentVersion to 5.0.0.
  if (!["4.0.0", "5.0.0"].includes(catalog.contentVersion)) {
    errors.push("kickoff contentVersion must be 4.0.0 or 5.0.0");
  }
  if (catalog.schemaVersion < 26) {
    errors.push("kickoff schemaVersion must be >= 26");
  }
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");

  if (catalog.priorPlan?.id !== "30_finish_4.0") errors.push("priorPlan.id must be 30_finish_4.0");
  if (catalog.priorPlan?.status !== "finished") errors.push("priorPlan.status must be finished");
  if (catalog.priorPlan?.releaseTag !== "v4.0.0") errors.push("priorPlan.releaseTag must be v4.0.0");
  if (catalog.priorPlan?.freezeCatalog !== "shared/ship/freeze-4.0.0.json") {
    errors.push("priorPlan.freezeCatalog must be freeze-4.0.0.json");
  }
  if (freeze4.releaseTag !== "v4.0.0") errors.push("freeze-4.0.0 releaseTag must remain v4.0.0");
  if (freeze4.contentVersion !== "4.0.0") errors.push("freeze-4.0.0 contentVersion must remain 4.0.0");

  if (catalog.endState?.contentVersion !== "5.0.0") errors.push("endState.contentVersion must be 5.0.0");
  if (catalog.endState?.releaseTag !== "v5.0.0") errors.push("endState.releaseTag must be v5.0.0");
  if (catalog.endState?.schemaVersionMin !== 26) errors.push("endState.schemaVersionMin must be 26");
  if (catalog.endState?.versionCode !== 6) errors.push("endState.versionCode must be 6");
  if (catalog.endState?.productLocMin !== 120000) errors.push("endState.productLocMin must be 120000");
  if (catalog.endState?.gameCoreLocMin !== 38000) errors.push("endState.gameCoreLocMin must be 38000");
  if (catalog.endState?.appLocMin !== 26000) errors.push("endState.appLocMin must be 26000");
  if (catalog.endState?.webSrcLocMin !== 56000) errors.push("endState.webSrcLocMin must be 56000");

  const b = catalog.baseline;
  if (b.gameCoreLoc !== 28162) errors.push("baseline.gameCoreLoc drift");
  if (b.appLoc !== 14691) errors.push("baseline.appLoc drift");
  if (b.webSrcLoc !== 37322) errors.push("baseline.webSrcLoc drift");
  if (b.productLoc !== 80175) errors.push("baseline.productLoc drift");
  // Soft-floored Finish 5.0 Phase 14: authored harbors baseline raised to 12.
  if (b.authoredHarbors !== 12) errors.push("baseline.authoredHarbors must be 12 after Phase 14");
  // Soft-floored Finish 5.0 Phase 9: authoredFish baseline raised to 125.
  if (b.authoredFish !== 125) errors.push("baseline.authoredFish must be 125 after Phase 9");
  if (b.species !== 125) errors.push("baseline.species must be 125");
  if (b.harbors !== 12) errors.push("baseline.harbors must be 12 after Phase 14");
  // Soft-floored Finish 5.0 Phase 15: machines baseline raised to 14.
  if (b.machines !== 14) errors.push("baseline.machines must be 14 after Phase 15");
  // Soft-floored Finish 5.0 Phase 16: quests baseline raised to 75.
  if (b.quests !== 75) errors.push("baseline.quests must be 75 after Phase 16");
  if (b.deliveryChains !== 7) errors.push("baseline.deliveryChains must be 7 after Phase 16");
  if (b.i18nLocales !== 8) errors.push("baseline.i18nLocales must be 8");
  if (b.staffComingSoonReasons !== 0) errors.push("baseline.staffComingSoonReasons must be 0");
  if (b.productLoc !== b.gameCoreLoc + b.appLoc + b.webSrcLoc) {
    errors.push("baseline productLoc must equal sum of scopes");
  }

  if (catalog.gaps.authoredHarborsRemaining !== 0) {
    errors.push("authoredHarborsRemaining must be 0 after Phase 14");
  }
  if (catalog.gaps.authoredFishRemaining !== 0) {
    errors.push("authoredFishRemaining must be 0 after Phase 9");
  }
  if (catalog.gaps.productLocRemaining !== 39825) {
    errors.push("productLocRemaining must be 39825 (→120k from Phase 1 baseline)");
  }
  if (catalog.gaps.speciesRemaining !== 0) errors.push("speciesRemaining must be 0 after Phase 13");
  if (catalog.gaps.machinesRemaining !== 0) errors.push("machinesRemaining must be 0 after Phase 15");
  if (catalog.gaps.questsRemaining !== 0) errors.push("questsRemaining must be 0 after Phase 16");

  // Phase 2 closed engineDepthIncomplete; Phase 8 harborArt5; Phase 9 fishArt5.
  if (catalog.gaps.engineDepthIncomplete !== false) {
    errors.push("gaps.engineDepthIncomplete must be false after Phase 2");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("engineDepthIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include engineDepthIncomplete after Phase 2");
  }
  if (catalog.gaps.harborArt5Incomplete !== false) {
    errors.push("gaps.harborArt5Incomplete must be false after Phase 8");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("harborArt5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include harborArt5Incomplete after Phase 8");
  }
  if (catalog.gaps.fishArt5Incomplete !== false) {
    errors.push("gaps.fishArt5Incomplete must be false after Phase 9");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("fishArt5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include fishArt5Incomplete after Phase 9");
  }
  if (catalog.gaps.productArt5Incomplete !== false) {
    errors.push("gaps.productArt5Incomplete must be false after Phase 10");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("productArt5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include productArt5Incomplete after Phase 10");
  }
  if (catalog.gaps.atmosphere5Incomplete !== false) {
    errors.push("gaps.atmosphere5Incomplete must be false after Phase 11");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("atmosphere5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include atmosphere5Incomplete after Phase 11");
  }
  if (catalog.gaps.audioVfx5Incomplete !== false) {
    errors.push("gaps.audioVfx5Incomplete must be false after Phase 12");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("audioVfx5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include audioVfx5Incomplete after Phase 12");
  }
  if (catalog.gaps.endgameSchema26Pending !== false) {
    errors.push("gaps.endgameSchema26Pending must be false after Phase 17");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("endgameSchema26Pending")) {
    errors.push("OPEN_GAP_FLAGS must not include endgameSchema26Pending after Phase 17");
  }
  if (catalog.gaps.contentFloorsShort !== false) {
    errors.push("gaps.contentFloorsShort must be false after Phase 18");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("contentFloorsShort")) {
    errors.push("OPEN_GAP_FLAGS must not include contentFloorsShort after Phase 18");
  }
  if ((catalog.baseline?.rivalMarkets ?? 0) < 16) {
    errors.push("baseline.rivalMarkets must be ≥16 after Phase 18");
  }
  if ((catalog.baseline?.seasonalEvents ?? 0) < 16) {
    errors.push("baseline.seasonalEvents must be ≥16 after Phase 18");
  }
  if ((catalog.baseline?.baits ?? 0) < 16) {
    errors.push("baseline.baits must be ≥16 after Phase 18");
  }
  if ((catalog.baseline?.cosmetics ?? 0) < 24) {
    errors.push("baseline.cosmetics must be ≥24 after Phase 18");
  }
  if (catalog.gaps.tutorialRetentionIncomplete !== false) {
    errors.push("gaps.tutorialRetentionIncomplete must be false after Phase 19");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("tutorialRetentionIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include tutorialRetentionIncomplete after Phase 19");
  }
  if (catalog.gaps.staffAi3Incomplete !== false) {
    errors.push("gaps.staffAi3Incomplete must be false after Phase 20");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("staffAi3Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include staffAi3Incomplete after Phase 20");
  }
  if (catalog.gaps.economy3Incomplete !== false) {
    errors.push("gaps.economy3Incomplete must be false after Phase 21");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("economy3Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include economy3Incomplete after Phase 21");
  }
  if (catalog.gaps.offlineCloud3Incomplete !== false) {
    errors.push("gaps.offlineCloud3Incomplete must be false after Phase 22");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("offlineCloud3Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include offlineCloud3Incomplete after Phase 22");
  }
  if (catalog.gaps.uiParity5Incomplete !== false) {
    errors.push("gaps.uiParity5Incomplete must be false after Phase 23");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("uiParity5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include uiParity5Incomplete after Phase 23");
  }
  if (catalog.gaps.a11yI18n5Incomplete !== false) {
    errors.push("gaps.a11yI18n5Incomplete must be false after Phase 24");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("a11yI18n5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include a11yI18n5Incomplete after Phase 24");
  }
  if (catalog.gaps.stripeOps5Incomplete !== false) {
    errors.push("gaps.stripeOps5Incomplete must be false after Phase 25");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("stripeOps5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include stripeOps5Incomplete after Phase 25");
  }
  if (catalog.gaps.deeplinkE2e5Thin !== false) {
    errors.push("gaps.deeplinkE2e5Thin must be false after Phase 26");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("deeplinkE2e5Thin")) {
    errors.push("OPEN_GAP_FLAGS must not include deeplinkE2e5Thin after Phase 26");
  }
  if (catalog.gaps.devicePerf5Incomplete !== false) {
    errors.push("gaps.devicePerf5Incomplete must be false after Phase 27");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("devicePerf5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include devicePerf5Incomplete after Phase 27");
  }
  if (catalog.gaps.contentCli5Missing !== false) {
    errors.push("gaps.contentCli5Missing must be false after Phase 28");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("contentCli5Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include contentCli5Missing after Phase 28");
  }
  if (catalog.gaps.parityLock5Missing !== false) {
    errors.push("gaps.parityLock5Missing must be false after Phase 29");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("parityLock5Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include parityLock5Missing after Phase 29");
  }
  const expectedOpen: string[] = [];
  for (const flag of expectedOpen) {
    if (catalog.gaps[flag] !== true) errors.push(`gaps.${flag} must be true (Finish 5 open gap)`);
    if (!FINISH5_OPEN_GAP_FLAGS.includes(flag)) {
      errors.push(`OPEN_GAP_FLAGS missing ${flag}`);
    }
  }
  if (FINISH5_OPEN_GAP_FLAGS.length !== expectedOpen.length) {
    errors.push(
      `OPEN_GAP_FLAGS expected ${expectedOpen.length}, got ${FINISH5_OPEN_GAP_FLAGS.length}`,
    );
  }

  if (catalog.gapTargets.productLoc !== 120000) errors.push("gapTargets.productLoc must be 120000");
  if (catalog.gapTargets.authoredFish !== 125) errors.push("gapTargets.authoredFish must be 125");
  if (catalog.gapTargets.authoredHarbors !== 12) errors.push("gapTargets.authoredHarbors must be 12");
  if (catalog.gapTargets.speciesMin !== 125) errors.push("gapTargets.speciesMin must be 125");
  if (catalog.gapTargets.machinesMin !== 14) errors.push("gapTargets.machinesMin must be 14");
  if (catalog.gapTargets.questsMin !== 75) errors.push("gapTargets.questsMin must be 75");

  if (!Array.isArray(catalog.phases) || catalog.phases.length !== FINISH5_PHASE_COUNT) {
    errors.push(`phases must list ${FINISH5_PHASE_COUNT} entries`);
  }
  if (!requireThirtyPhases(catalog.phases)) {
    errors.push("phases must be ordered 1–30 kickoff→freeze-5");
  }
  if (FINISH5_KICKOFF.phases.length !== FINISH5_PHASE_COUNT) {
    errors.push("TS phases mirror length mismatch");
  }

  const board = baselineScoreboard();
  if (board.authoredHarbors.remaining !== 0) errors.push("scoreboard harbor remaining mismatch");
  if (board.authoredFish.remaining !== 0) errors.push("scoreboard fish remaining mismatch");
  if (board.productLoc.remaining !== 39825) errors.push("scoreboard LOC remaining mismatch");
  if (board.species.remaining !== 0) errors.push("scoreboard species remaining mismatch");
  if (board.machines.remaining !== 0) errors.push("scoreboard machines remaining mismatch");
  if (board.quests.remaining !== 0) errors.push("scoreboard quests remaining mismatch");
  if (board.openFlagCount !== FINISH5_OPEN_GAP_FLAGS.length) {
    errors.push("openFlagCount mismatch");
  }
  if (board.allNumericGapsClosed) errors.push("Phase 1 must still have open numeric gaps");
  if (productLocProgress(b.productLoc) !== 0) errors.push("LOC progress at baseline must be 0%");

  const art = measureArtCounts(root);
  if (art.authoredHarbors !== b.authoredHarbors) {
    errors.push(`harbor-art-pass authored count ${art.authoredHarbors} ≠ baseline ${b.authoredHarbors}`);
  }
  if (art.authoredFish !== b.authoredFish) {
    errors.push(`fish-art-pass authored count ${art.authoredFish} ≠ baseline ${b.authoredFish}`);
  }
  if ((pack.harbors as unknown[]).length !== b.harbors) errors.push("content harbors ≠ baseline");
  if ((pack.species as unknown[]).length !== b.species) errors.push("content species ≠ baseline");
  if ((pack.machines as unknown[]).length !== b.machines) errors.push("content machines ≠ baseline");
  if ((pack.quests as unknown[]).length !== b.quests) errors.push("content quests ≠ baseline");

  const locBoard = measureLocScoreboard(root);
  if (locBoard.productTotal < b.productLoc - 50) {
    errors.push(
      `measured product LOC ${locBoard.productTotal} regressed below baseline ${b.productLoc}`,
    );
  }

  if (loc.productTotalPlanTarget !== 120000) {
    errors.push("loc-floors productTotalPlanTarget must be 120000 for Finish 5.0");
  }
  if (loc.scopes?.gameCore?.planTarget !== 38000) errors.push("loc-floors gameCore planTarget must be 38000");
  if (loc.scopes?.app?.planTarget !== 26000) errors.push("loc-floors app planTarget must be 26000");
  if (loc.scopes?.webSrc?.planTarget !== 56000) {
    errors.push("loc-floors webSrc planTarget must be 56000");
  }
  if (LOC_FLOORS.productTotalPlanTarget !== 120000) {
    errors.push("LOC_FLOORS.productTotalPlanTarget mirror must be 120000");
  }

  if (listing.finish5KickoffPhase !== 1) errors.push("listing.finish5KickoffPhase must be 1");
  if (listing.finish5KickoffCatalog !== "shared/ship/finish-5.0-kickoff.json") {
    errors.push("listing.finish5KickoffCatalog mismatch");
  }
  if (pin.finish5Kickoff !== "shared/ship/finish-5.0-kickoff.json") {
    errors.push("RELEASE_PIN.finish5Kickoff path missing");
  }
  if (!pin.fixtures?.includes("parity-finish-5.0-kickoff.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-finish-5.0-kickoff.json");
  }
  if (pin.finish4Kickoff !== "shared/ship/finish-4.0-kickoff.json") {
    errors.push("RELEASE_PIN.finish4Kickoff must remain");
  }

  const finish5 = dod.finish5Kickoff;
  if (!finish5) errors.push("DoD missing finish5Kickoff block");
  else {
    if (finish5.phase !== 1) errors.push("DoD finish5Kickoff.phase must be 1");
    if (finish5.plan !== "30_finish_5.0") errors.push("DoD finish5Kickoff.plan mismatch");
    if (finish5.status !== "frozen") errors.push("DoD finish5Kickoff.status must be frozen");
    if (finish5.kickoffMarker !== FINISH5_KICKOFF_MARKER) {
      errors.push("DoD finish5Kickoff.kickoffMarker mismatch");
    }
  }
  if (dod.finish4Freeze?.status !== "ready_for_release_tag" && dod.finish4Freeze?.status !== "tag_cut") {
    errors.push("finish4Freeze must remain ready_for_release_tag or tag_cut");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["finish5:validate"]) errors.push("package.json missing finish5:validate");
  if (!pkg.scripts?.["finish5:smoke"]) errors.push("package.json missing finish5:smoke");
  if (!ci.includes("finish5:validate")) errors.push("ci.yml missing finish5:validate");
  if (!ci.includes("finish5:smoke")) errors.push("ci.yml missing finish5:smoke");
  if (!kotlin.includes("KICKOFF_MARKER")) errors.push("Kotlin Finish5Kickoff missing KICKOFF_MARKER");
  if (!kotlin.includes("baselineScoreboard")) {
    errors.push("Kotlin Finish5Kickoff missing baselineScoreboard");
  }
  if (!kotlin.includes("PHASE_COUNT = 30")) errors.push("Kotlin PHASE_COUNT must be 30");
  if (!kotlin.includes("freeze-5")) errors.push("Kotlin phases must end at freeze-5");
  if (!summaryLine(board).includes("Finish 5.0 Phase 1 gaps")) {
    errors.push("summaryLine missing expected prefix");
  }

  if (fixture.expect?.phaseCount !== 30) errors.push("parity fixture phaseCount must be 30");
  if (fixture.expect?.baselineProductLoc !== 80175) {
    errors.push("parity fixture baselineProductLoc drift");
  }
  if (fixture.expect?.productLocTarget !== 120000) {
    errors.push("parity fixture productLocTarget must be 120000");
  }
  if (fixture.expect?.priorPlanFinished !== "30_finish_4.0") {
    errors.push("parity fixture priorPlanFinished mismatch");
  }
  if (fixture.expect?.endReleaseTag !== "v5.0.0") {
    errors.push("parity fixture endReleaseTag must be v5.0.0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("finish5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK finish5:validate — Finish 5.0 Phase 1 kickoff + gap scoreboard locked");
