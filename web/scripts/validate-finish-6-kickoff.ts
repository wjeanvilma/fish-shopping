/**
 * Finish 6.0 Phase 1 — kickoff + gap scoreboard readiness.
 *
 * Usage:
 *   npm run finish6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  baselineScoreboard,
  FINISH6_KICKOFF,
  FINISH6_KICKOFF_MARKER,
  FINISH6_KICKOFF_PHASE,
  FINISH6_KICKOFF_SCHEMA,
  FINISH6_OPEN_GAP_FLAGS,
  FINISH6_PHASE_COUNT,
  FINISH6_PLAN,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish6Kickoff";
import { LOC_FLOORS, measureLocScoreboard } from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-finish-6.0-kickoff.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const freeze5 = readJson(resolve(root, "shared/ship/freeze-5.0.0.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const loc = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 1) errors.push(`phase expected 1, got ${catalog.phase}`);
  if (catalog.schema !== FINISH6_KICKOFF_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== FINISH6_PLAN) errors.push("plan must be 30_finish_6.0");
  if (FINISH6_KICKOFF_PHASE !== 1) errors.push("phase mirror mismatch");
  if (catalog.kickoffMarker !== FINISH6_KICKOFF_MARKER) errors.push("kickoff marker mismatch");
  if (fixture.kickoffMarker !== FINISH6_KICKOFF_MARKER) errors.push("fixture marker mismatch");
  // Soft-floor: Phase 30 freeze advances kickoff contentVersion to 6.0.0.
  if (!["5.0.0", "6.0.0"].includes(catalog.contentVersion)) {
    errors.push("kickoff contentVersion must be 5.0.0 or 6.0.0");
  }
  // Soft-floor: Phase 14 bumps live kickoff schema to 27.
  if (catalog.schemaVersion !== 27) {
    errors.push("kickoff schemaVersion must be 27 after Phase 14");
  }
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");

  if (catalog.priorPlan?.id !== "30_finish_5.0") errors.push("priorPlan.id must be 30_finish_5.0");
  if (catalog.priorPlan?.status !== "finished") errors.push("priorPlan.status must be finished");
  if (catalog.priorPlan?.releaseTag !== "v5.0.0") errors.push("priorPlan.releaseTag must be v5.0.0");
  if (catalog.priorPlan?.freezeCatalog !== "shared/ship/freeze-5.0.0.json") {
    errors.push("priorPlan.freezeCatalog must be freeze-5.0.0.json");
  }
  if (freeze5.releaseTag !== "v5.0.0") errors.push("freeze-5.0.0 releaseTag must remain v5.0.0");
  if (freeze5.contentVersion !== "5.0.0") errors.push("freeze-5.0.0 contentVersion must remain 5.0.0");

  if (catalog.endState?.contentVersion !== "6.0.0") errors.push("endState.contentVersion must be 6.0.0");
  if (catalog.endState?.releaseTag !== "v6.0.0") errors.push("endState.releaseTag must be v6.0.0");
  if (catalog.endState?.schemaVersionMin !== 27) errors.push("endState.schemaVersionMin must be 27");
  if (catalog.endState?.versionCode !== 7) errors.push("endState.versionCode must be 7");
  if (catalog.endState?.productLocMin !== 120000) errors.push("endState.productLocMin must be 120000");
  if (catalog.endState?.gameCoreLocMin !== 38000) errors.push("endState.gameCoreLocMin must be 38000");
  if (catalog.endState?.appLocMin !== 26000) errors.push("endState.appLocMin must be 26000");
  if (catalog.endState?.webSrcLocMin !== 56000) errors.push("endState.webSrcLocMin must be 56000");
  if (catalog.endState?.harborsMin !== 14) errors.push("endState.harborsMin must be 14");
  if (catalog.endState?.speciesMin !== 150) errors.push("endState.speciesMin must be 150");
  if (catalog.endState?.machinesMin !== 16) errors.push("endState.machinesMin must be 16");
  if (catalog.endState?.questsMin !== 100) errors.push("endState.questsMin must be 100");

  const b = catalog.baseline;
  if (b.gameCoreLoc !== 32287) errors.push("baseline.gameCoreLoc drift");
  if (b.appLoc !== 15415) errors.push("baseline.appLoc drift");
  if (b.webSrcLoc !== 42895) errors.push("baseline.webSrcLoc drift");
  if (b.productLoc !== 90597) errors.push("baseline.productLoc drift");
  if (b.authoredHarbors !== 12) errors.push("baseline.authoredHarbors must be 12");
  if (b.authoredFish !== 125) errors.push("baseline.authoredFish must be 125");
  if (b.species !== 125) errors.push("baseline.species must be 125");
  if (b.harbors !== 12) errors.push("baseline.harbors must be 12");
  if (b.machines !== 14) errors.push("baseline.machines must be 14");
  if (b.quests !== 75) errors.push("baseline.quests must be 75");
  if (b.deliveryChains !== 7) errors.push("baseline.deliveryChains must be 7");
  if (b.i18nLocales !== 8) errors.push("baseline.i18nLocales must be 8");
  if (b.staffComingSoonReasons !== 0) errors.push("baseline.staffComingSoonReasons must be 0");
  if (b.paritySuites !== 20) errors.push("baseline.paritySuites must be 20");
  if (b.systemsTsLines !== 4293) errors.push("baseline.systemsTsLines must be 4293");
  if (b.gameViewModelLines !== 1644) errors.push("baseline.gameViewModelLines must be 1644");
  if (b.gameHostLines !== 1313) errors.push("baseline.gameHostLines must be 1313");
  if (b.productLoc !== b.gameCoreLoc + b.appLoc + b.webSrcLoc) {
    errors.push("baseline productLoc must equal sum of scopes");
  }

  // Soft-floor: Phase 7 closed harbors 13–14 → remaining 0 (baseline stays 12).
  if (catalog.gaps.authoredHarborsRemaining !== 0) {
    errors.push("authoredHarborsRemaining must be 0 after Phase 7");
  }
  // Soft-floor: Phase 8 closed species 126–150 + fish-art-6.
  if (catalog.gaps.authoredFishRemaining !== 0) {
    errors.push("authoredFishRemaining must be 0 after Phase 8");
  }
  if (catalog.gaps.productLocRemaining !== 29403) {
    errors.push("productLocRemaining must be 29403 (→120k from Phase 1 baseline)");
  }
  if (catalog.gaps.speciesRemaining !== 0) {
    errors.push("speciesRemaining must be 0 after Phase 8");
  }
  // Soft-floor: Phase 9 closed machines 15–16 → remaining 0 (baseline stays 14).
  if (catalog.gaps.machinesRemaining !== 0) {
    errors.push("machinesRemaining must be 0 after Phase 9");
  }
  // Soft-floor: Phase 13 closed questsRemaining (baseline.quests stays 75).
  if (catalog.gaps.questsRemaining !== 0) {
    errors.push("questsRemaining must be 0 after Phase 13");
  }

  // Soft-floor: Phase 2–4 closed schemaFoundationsIncomplete / shipCodegenMissing / systemsSplit3Incomplete.
  if (catalog.gaps.schemaFoundationsIncomplete !== false) {
    errors.push("gaps.schemaFoundationsIncomplete must be false after Phase 2");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("schemaFoundationsIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include schemaFoundationsIncomplete after Phase 2");
  }
  if (catalog.gaps.shipCodegenMissing !== false) {
    errors.push("gaps.shipCodegenMissing must be false after Phase 3");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("shipCodegenMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include shipCodegenMissing after Phase 3");
  }
  if (catalog.gaps.systemsSplit3Incomplete !== false) {
    errors.push("gaps.systemsSplit3Incomplete must be false after Phase 4");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("systemsSplit3Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include systemsSplit3Incomplete after Phase 4");
  }
  if (catalog.gaps.hostVmCapsIncomplete !== false) {
    errors.push("gaps.hostVmCapsIncomplete must be false after Phase 5");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("hostVmCapsIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include hostVmCapsIncomplete after Phase 5");
  }
  if (catalog.gaps.harborArt6Incomplete !== false) {
    errors.push("gaps.harborArt6Incomplete must be false after Phase 7");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("harborArt6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include harborArt6Incomplete after Phase 7");
  }
  if (catalog.gaps.fishArt6Incomplete !== false) {
    errors.push("gaps.fishArt6Incomplete must be false after Phase 8");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("fishArt6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include fishArt6Incomplete after Phase 8");
  }
  // Soft-floor: Phase 10 closed productArt6Incomplete.
  if (catalog.gaps.productArt6Incomplete !== false) {
    errors.push("gaps.productArt6Incomplete must be false after Phase 10");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("productArt6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include productArt6Incomplete after Phase 10");
  }
  // Soft-floor: Phase 11 closed atmosphere6Incomplete.
  if (catalog.gaps.atmosphere6Incomplete !== false) {
    errors.push("gaps.atmosphere6Incomplete must be false after Phase 11");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("atmosphere6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include atmosphere6Incomplete after Phase 11");
  }
  // Soft-floor: Phase 12 closed audioVfx6Incomplete.
  if (catalog.gaps.audioVfx6Incomplete !== false) {
    errors.push("gaps.audioVfx6Incomplete must be false after Phase 12");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("audioVfx6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include audioVfx6Incomplete after Phase 12");
  }
  // Soft-floor: Phase 14 closed endgameSchema27Pending.
  if (catalog.gaps.endgameSchema27Pending !== false) {
    errors.push("gaps.endgameSchema27Pending must be false after Phase 14");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("endgameSchema27Pending")) {
    errors.push("OPEN_GAP_FLAGS must not include endgameSchema27Pending after Phase 14");
  }
  // Soft-floor: Phase 15 closed contentFloorsShort.
  if (catalog.gaps.contentFloorsShort !== false) {
    errors.push("gaps.contentFloorsShort must be false after Phase 15");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("contentFloorsShort")) {
    errors.push("OPEN_GAP_FLAGS must not include contentFloorsShort after Phase 15");
  }
  // Soft-floor: Phase 16 closed staffAi4Incomplete.
  if (catalog.gaps.staffAi4Incomplete !== false) {
    errors.push("gaps.staffAi4Incomplete must be false after Phase 16");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("staffAi4Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include staffAi4Incomplete after Phase 16");
  }
  // Soft-floor: Phase 17 closed economy4Incomplete.
  if (catalog.gaps.economy4Incomplete !== false) {
    errors.push("gaps.economy4Incomplete must be false after Phase 17");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("economy4Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include economy4Incomplete after Phase 17");
  }
  // Soft-floor: Phase 18 closed offlineCloud4Incomplete.
  if (catalog.gaps.offlineCloud4Incomplete !== false) {
    errors.push("gaps.offlineCloud4Incomplete must be false after Phase 18");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("offlineCloud4Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include offlineCloud4Incomplete after Phase 18");
  }
  // Soft-floor: Phase 19 closed tutorialRetention6Incomplete.
  if (catalog.gaps.tutorialRetention6Incomplete !== false) {
    errors.push("gaps.tutorialRetention6Incomplete must be false after Phase 19");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("tutorialRetention6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include tutorialRetention6Incomplete after Phase 19");
  }
  // Soft-floor: Phase 20 closed uiParity6Incomplete.
  if (catalog.gaps.uiParity6Incomplete !== false) {
    errors.push("gaps.uiParity6Incomplete must be false after Phase 20");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("uiParity6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include uiParity6Incomplete after Phase 20");
  }
  // Soft-floor: Phase 21 closed presenterHarnessMissing.
  if (catalog.gaps.presenterHarnessMissing !== false) {
    errors.push("gaps.presenterHarnessMissing must be false after Phase 21");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("presenterHarnessMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include presenterHarnessMissing after Phase 21");
  }
  // Soft-floor: Phase 22 closed a11yI18n6Incomplete.
  if (catalog.gaps.a11yI18n6Incomplete !== false) {
    errors.push("gaps.a11yI18n6Incomplete must be false after Phase 22");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("a11yI18n6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include a11yI18n6Incomplete after Phase 22");
  }
  // Soft-floor: Phase 23 closed e2eDepthThin.
  if (catalog.gaps.e2eDepthThin !== false) {
    errors.push("gaps.e2eDepthThin must be false after Phase 23");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("e2eDepthThin")) {
    errors.push("OPEN_GAP_FLAGS must not include e2eDepthThin after Phase 23");
  }
  // Soft-floor: Phase 24 closed composeE2eThin.
  if (catalog.gaps.composeE2eThin !== false) {
    errors.push("gaps.composeE2eThin must be false after Phase 24");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("composeE2eThin")) {
    errors.push("OPEN_GAP_FLAGS must not include composeE2eThin after Phase 24");
  }
  // Soft-floor: Phase 25 closed stripeOps6Incomplete.
  if (catalog.gaps.stripeOps6Incomplete !== false) {
    errors.push("gaps.stripeOps6Incomplete must be false after Phase 25");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("stripeOps6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include stripeOps6Incomplete after Phase 25");
  }
  // Soft-floor: Phase 26 closed loadtestBanksIncomplete.
  if (catalog.gaps.loadtestBanksIncomplete !== false) {
    errors.push("gaps.loadtestBanksIncomplete must be false after Phase 26");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("loadtestBanksIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include loadtestBanksIncomplete after Phase 26");
  }
  // Soft-floor: Phase 27 closed contentCli6Missing.
  if (catalog.gaps.contentCli6Missing !== false) {
    errors.push("gaps.contentCli6Missing must be false after Phase 27");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("contentCli6Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include contentCli6Missing after Phase 27");
  }
  // Soft-floor: Phase 28 closed devicePerf6Incomplete.
  if (catalog.gaps.devicePerf6Incomplete !== false) {
    errors.push("gaps.devicePerf6Incomplete must be false after Phase 28");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("devicePerf6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include devicePerf6Incomplete after Phase 28");
  }
  // Soft-floor: Phase 29 closed parityLock6Missing → 0 open boolean gaps.
  const expectedOpen: string[] = [];
  for (const flag of expectedOpen) {
    if (catalog.gaps[flag] !== true) errors.push(`gaps.${flag} must be true (Finish 6 open gap)`);
    if (!FINISH6_OPEN_GAP_FLAGS.includes(flag)) {
      errors.push(`OPEN_GAP_FLAGS missing ${flag}`);
    }
  }
  if (catalog.gaps.parityLock6Missing !== false) {
    errors.push("gaps.parityLock6Missing must be false after Phase 29");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("parityLock6Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include parityLock6Missing after Phase 29");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length !== expectedOpen.length) {
    errors.push(
      `OPEN_GAP_FLAGS expected ${expectedOpen.length}, got ${FINISH6_OPEN_GAP_FLAGS.length}`,
    );
  }

  if (catalog.gapTargets.productLoc !== 120000) errors.push("gapTargets.productLoc must be 120000");
  if (catalog.gapTargets.authoredFish !== 150) errors.push("gapTargets.authoredFish must be 150");
  if (catalog.gapTargets.authoredHarbors !== 14) errors.push("gapTargets.authoredHarbors must be 14");
  if (catalog.gapTargets.speciesMin !== 150) errors.push("gapTargets.speciesMin must be 150");
  if (catalog.gapTargets.machinesMin !== 16) errors.push("gapTargets.machinesMin must be 16");
  if (catalog.gapTargets.questsMin !== 100) errors.push("gapTargets.questsMin must be 100");
  if (catalog.gapTargets.systemsTsMax !== 2800) errors.push("gapTargets.systemsTsMax must be 2800");
  if (catalog.gapTargets.gameViewModelMax !== 1200) {
    errors.push("gapTargets.gameViewModelMax must be 1200");
  }
  if (catalog.gapTargets.gameHostMax !== 1100) errors.push("gapTargets.gameHostMax must be 1100");

  if (!Array.isArray(catalog.phases) || catalog.phases.length !== FINISH6_PHASE_COUNT) {
    errors.push(`phases must list ${FINISH6_PHASE_COUNT} entries`);
  }
  if (!requireThirtyPhases(catalog.phases)) {
    errors.push("phases must be ordered 1–30 kickoff→freeze-6");
  }
  if (FINISH6_KICKOFF.phases.length !== FINISH6_PHASE_COUNT) {
    errors.push("TS phases mirror length mismatch");
  }

  const board = baselineScoreboard();
  if (board.authoredHarbors.remaining !== 0) errors.push("scoreboard harbor remaining mismatch");
  if (board.authoredFish.remaining !== 0) errors.push("scoreboard fish remaining mismatch");
  if (board.productLoc.remaining !== 29403) errors.push("scoreboard LOC remaining mismatch");
  if (board.species.remaining !== 0) errors.push("scoreboard species remaining mismatch");
  // Soft-floor: Phase 9 closed machinesRemaining.
  if (board.machines.remaining !== 0) errors.push("scoreboard machines remaining mismatch");
  // Soft-floor: Phase 13 closed questsRemaining.
  if (board.quests.remaining !== 0) errors.push("scoreboard quests remaining mismatch");
  if (board.systemsTs.met) errors.push("systems.ts must still exceed cap at Phase 1");
  if (board.gameViewModel.met) errors.push("GameViewModel must still exceed cap at Phase 1");
  if (board.gameHost.met) errors.push("GameHost must still exceed cap at Phase 1");
  if (board.openFlagCount !== FINISH6_OPEN_GAP_FLAGS.length) {
    errors.push("openFlagCount mismatch");
  }
  if (board.allNumericGapsClosed) errors.push("Phase 1 must still have open numeric gaps");
  if (productLocProgress(b.productLoc) !== 0) errors.push("LOC progress at baseline must be 0%");

  const art = measureArtCounts(root);
  // Soft-floor: Phase 7 grew authored harbors to 14; baseline stays Phase-1 lock (12).
  if (art.authoredHarbors < b.authoredHarbors) {
    errors.push(`harbor-art-pass authored count ${art.authoredHarbors} < baseline ${b.authoredHarbors}`);
  }
  // Soft-floor: Phase 8 grew authored fish/species to 150; baseline stays Phase-1 lock (125).
  if (art.authoredFish < b.authoredFish) {
    errors.push(`fish-art-pass authored count ${art.authoredFish} < baseline ${b.authoredFish}`);
  }
  if ((pack.harbors as unknown[]).length < b.harbors) errors.push("content harbors < baseline");
  if ((pack.species as unknown[]).length < b.species) errors.push("content species < baseline");
  // Soft-floor: Phase 9 grew machines to 16; baseline stays Phase-1 lock (14).
  if ((pack.machines as unknown[]).length < b.machines) errors.push("content machines < baseline");
  // Soft-floor: Phase 7 added 2 landing quests (75 → 77); baseline quests stay 75.
  if ((pack.quests as unknown[]).length < b.quests) errors.push("content quests < baseline");

  const locBoard = measureLocScoreboard(root);
  if (locBoard.productTotal < b.productLoc - 50) {
    errors.push(
      `measured product LOC ${locBoard.productTotal} regressed below baseline ${b.productLoc}`,
    );
  }

  if (loc.productTotalPlanTarget !== 120000) {
    errors.push("loc-floors productTotalPlanTarget must remain 120000 for Finish 6.0");
  }
  if (loc.scopes?.gameCore?.planTarget !== 38000) errors.push("loc-floors gameCore planTarget must be 38000");
  if (loc.scopes?.app?.planTarget !== 26000) errors.push("loc-floors app planTarget must be 26000");
  if (loc.scopes?.webSrc?.planTarget !== 56000) {
    errors.push("loc-floors webSrc planTarget must be 56000");
  }
  if (LOC_FLOORS.productTotalPlanTarget !== 120000) {
    errors.push("LOC_FLOORS.productTotalPlanTarget mirror must be 120000");
  }

  if (listing.finish6KickoffPhase !== 1) errors.push("listing.finish6KickoffPhase must be 1");
  if (listing.finish6KickoffCatalog !== "shared/ship/finish-6.0-kickoff.json") {
    errors.push("listing.finish6KickoffCatalog mismatch");
  }
  if (pin.finish6Kickoff !== "shared/ship/finish-6.0-kickoff.json") {
    errors.push("RELEASE_PIN.finish6Kickoff path missing");
  }
  if (!pin.fixtures?.includes("parity-finish-6.0-kickoff.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-finish-6.0-kickoff.json");
  }
  if (pin.finish5Kickoff !== "shared/ship/finish-5.0-kickoff.json") {
    errors.push("RELEASE_PIN.finish5Kickoff must remain");
  }

  const finish6 = dod.finish6Kickoff;
  if (!finish6) errors.push("DoD missing finish6Kickoff block");
  else {
    if (finish6.phase !== 1) errors.push("DoD finish6Kickoff.phase must be 1");
    if (finish6.plan !== "30_finish_6.0") errors.push("DoD finish6Kickoff.plan mismatch");
    if (finish6.status !== "frozen") errors.push("DoD finish6Kickoff.status must be frozen");
    if (finish6.kickoffMarker !== FINISH6_KICKOFF_MARKER) {
      errors.push("DoD finish6Kickoff.kickoffMarker mismatch");
    }
  }
  if (dod.finish5Freeze?.status !== "ready_for_release_tag" && dod.finish5Freeze?.status !== "tag_cut") {
    errors.push("finish5Freeze must remain ready_for_release_tag or tag_cut");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["finish6:validate"]) errors.push("package.json missing finish6:validate");
  if (!pkg.scripts?.["finish6:smoke"]) errors.push("package.json missing finish6:smoke");
  if (!ci.includes("finish6:validate")) errors.push("ci.yml missing finish6:validate");
  if (!ci.includes("finish6:smoke")) errors.push("ci.yml missing finish6:smoke");
  if (!kotlin.includes("KICKOFF_MARKER")) errors.push("Kotlin Finish6Kickoff missing KICKOFF_MARKER");
  if (!kotlin.includes("baselineScoreboard")) {
    errors.push("Kotlin Finish6Kickoff missing baselineScoreboard");
  }
  if (!kotlin.includes("PHASE_COUNT = 30")) errors.push("Kotlin PHASE_COUNT must be 30");
  if (!kotlin.includes("freeze-6")) errors.push("Kotlin phases must end at freeze-6");
  if (!summaryLine(board).includes("Finish 6.0 Phase 1 gaps")) {
    errors.push("summaryLine missing expected prefix");
  }

  if (fixture.expect?.phaseCount !== 30) errors.push("parity fixture phaseCount must be 30");
  if (fixture.expect?.baselineProductLoc !== 90597) {
    errors.push("parity fixture baselineProductLoc drift");
  }
  if (fixture.expect?.productLocTarget !== 120000) {
    errors.push("parity fixture productLocTarget must be 120000");
  }
  if (fixture.expect?.priorPlanFinished !== "30_finish_5.0") {
    errors.push("parity fixture priorPlanFinished mismatch");
  }
  if (fixture.expect?.endReleaseTag !== "v6.0.0") {
    errors.push("parity fixture endReleaseTag must be v6.0.0");
  }
  // Soft-floor: Phase 29 closed parityLock6Missing → openGapFlagMin 0.
  if (fixture.expect?.openGapFlagMin !== 0) {
    errors.push("parity fixture openGapFlagMin must be 0 after Phase 29");
  }
  if (fixture.expect?.schemaVersion !== 27) {
    errors.push("parity fixture schemaVersion must be 27 after Phase 14");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("finish6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK finish6:validate — Finish 6.0 Phase 1 kickoff + gap scoreboard locked");
