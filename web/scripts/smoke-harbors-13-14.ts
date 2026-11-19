/**
 * Finish 6.0 Phase 7 — harbors 13–14 smoke.
 *
 * Usage:
 *   npm run harbors1314:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { measureHarbors1314 } from "../src/ship/harbors1314";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const m = measureHarbors1314(root);
const ok =
  m.harborCount >= 14 &&
  m.newHarborsPresent &&
  m.prestigePresent &&
  m.questsPresent &&
  m.galleriesPresent &&
  m.blockoutsPresent &&
  m.kickoffHarborMet &&
  m.harborArt6Closed &&
  m.missingGates.length === 0 &&
  FINISH6_OPEN_GAP_FLAGS.length <= 7;

if (!ok) {
  console.error("harbors1314:smoke FAILED");
  console.error(JSON.stringify(m, null, 2));
  process.exit(1);
}

console.log(
  `OK harbors1314:smoke — harbors=${m.harborCount}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
