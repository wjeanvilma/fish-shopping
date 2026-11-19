/**
 * Finish 6.0 Phase 11 — atmosphere/cozy depth 6 smoke.
 *
 * Usage:
 *   npm run atmosphere6:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { measureAtmosphere6 } from "../src/ship/atmosphere6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const m = measureAtmosphere6(root);
const ok =
  m.harborCount >= 14 &&
  m.stampedCount >= 14 &&
  m.finish5Retained &&
  m.socketsOk &&
  m.renderModulesPresent &&
  m.atmosphereSamplesOk &&
  m.gapClosed &&
  m.kickoffWired &&
  m.missingGates.length === 0 &&
  !FINISH6_OPEN_GAP_FLAGS.includes("atmosphere6Incomplete") &&
  FINISH6_OPEN_GAP_FLAGS.length <= 7;

if (!ok) {
  console.error("atmosphere6:smoke FAILED");
  console.error(JSON.stringify(m, null, 2));
  process.exit(1);
}

console.log(
  `OK atmosphere6:smoke — harbors=${m.stampedCount}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
