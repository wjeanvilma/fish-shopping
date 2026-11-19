/**
 * Finish 6.0 Phase 8 — species 150 smoke.
 *
 * Usage:
 *   npm run species150:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { measureSpecies150 } from "../src/ship/species150";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const m = measureSpecies150(root);
const ok =
  m.speciesCount >= 150 &&
  m.habitatCount >= 32 &&
  m.newBasesPresent &&
  m.newRaresPresent &&
  m.newHabitatsPresent &&
  m.waveWeighted &&
  m.i18nTranslated &&
  m.fishArtMet &&
  m.kickoffGapsClosed &&
  m.missingGates.length === 0 &&
  FINISH6_OPEN_GAP_FLAGS.length <= 7;

if (!ok) {
  console.error("species150:smoke FAILED");
  console.error(JSON.stringify(m, null, 2));
  process.exit(1);
}

console.log(
  `OK species150:smoke — species=${m.speciesCount}; habitats=${m.habitatCount}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
