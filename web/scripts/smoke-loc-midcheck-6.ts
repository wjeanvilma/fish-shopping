/**
 * Finish 6.0 Phase 6 — print LOC mid-check vs baseline/plan.
 *
 * Usage:
 *   npm run locmidcheck6:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  formatLocMidcheck6,
  LOC_MIDCHECK_6,
  measureLocMidcheck6,
} from "../src/ship/locMidcheck6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const m = measureLocMidcheck6(root);
const errors: string[] = [];

if (!m.meetsPriorBaseline) errors.push("below Finish 6 Phase 1 baseline");
if (!m.meetsInterimFloors) errors.push("below interim soft floors");
if (!m.midcheckAligned) errors.push("below midcheck beyond slack");
if (!m.planTargetsIntact) errors.push("plan targets drifted");
if (!m.kickoffWired) errors.push("kickoff phase 6 not wired");
if (m.missingGates.length) errors.push(`missing gates: ${m.missingGates.join(", ")}`);
if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
  errors.push(`expected 7 open flags after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
}

console.log(formatLocMidcheck6(m));

if (errors.length) {
  console.error("locmidcheck6:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK locmidcheck6:smoke — product ${m.live.productTotal} (≥ interim ${LOC_MIDCHECK_6.interimSoftFloors.productLoc}, midcheck ${LOC_MIDCHECK_6.midcheck.productLoc}); openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
