/**
 * Finish 6.0 Phase 1 — smoke the gap scoreboard against live catalogs.
 *
 * Usage:
 *   npm run finish6:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  baselineScoreboard,
  FINISH6_KICKOFF,
  FINISH6_OPEN_GAP_FLAGS,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish6Kickoff";
import { measureLocScoreboard } from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const errors: string[] = [];

if (!requireThirtyPhases()) errors.push("thirty phases contract failed");

const art = measureArtCounts(root);
const loc = measureLocScoreboard(root);
const board = baselineScoreboard({
  authoredHarbors: art.authoredHarbors,
  authoredFish: art.authoredFish,
  productLoc: loc.productTotal,
});

if (art.authoredHarbors < FINISH6_KICKOFF.baseline.authoredHarbors) {
  errors.push("authored harbors regressed below Phase 1 baseline");
}
if (art.authoredFish < FINISH6_KICKOFF.baseline.authoredFish) {
  errors.push("authored fish regressed below Phase 1 baseline");
}
if (loc.productTotal < FINISH6_KICKOFF.baseline.productLoc * 0.98) {
  errors.push("product LOC collapsed below 98% of Phase 1 baseline");
}
if (board.openFlagCount !== FINISH6_OPEN_GAP_FLAGS.length) {
  errors.push("open gap flags drifted from Phase 1 lock");
}
if (productLocProgress(FINISH6_KICKOFF.baseline.productLoc) !== 0) {
  errors.push("baseline LOC progress must be 0%");
}
// Soft-floor: Phase 29 closed parityLock6Missing → 0 open boolean gaps.
if (FINISH6_OPEN_GAP_FLAGS.length > 0) {
  errors.push("Finish 6.0 must lock 0 open boolean gaps after Phase 29");
}
if (FINISH6_OPEN_GAP_FLAGS.includes("schemaFoundationsIncomplete")) {
  errors.push("schemaFoundationsIncomplete must be closed after Phase 2");
}
if (FINISH6_OPEN_GAP_FLAGS.includes("shipCodegenMissing")) {
  errors.push("shipCodegenMissing must be closed after Phase 3");
}
if (FINISH6_OPEN_GAP_FLAGS.includes("systemsSplit3Incomplete")) {
  errors.push("systemsSplit3Incomplete must be closed after Phase 4");
}
if (FINISH6_OPEN_GAP_FLAGS.includes("hostVmCapsIncomplete")) {
  errors.push("hostVmCapsIncomplete must be closed after Phase 5");
}
if (FINISH6_OPEN_GAP_FLAGS.includes("parityLock6Missing")) {
  errors.push("parityLock6Missing must be closed after Phase 29");
}
if (board.allNumericGapsClosed) {
  errors.push("Phase 1 numeric gaps must remain open");
}

if (errors.length) {
  console.error("finish6:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK finish6:smoke — ${summaryLine(board)}; LOC progress ${productLocProgress(loc.productTotal)}%`,
);
