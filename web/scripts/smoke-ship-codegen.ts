/**
 * Finish 6.0 Phase 3 — smoke ship:codegen --check against live mirrors.
 *
 * Usage:
 *   npm run shipcodegen:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { measureShipCodegen, SHIP_CODEGEN } from "../src/ship/shipCodegen";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const errors: string[] = [];
const measure = measureShipCodegen(root);

if (measure.catalogCount < SHIP_CODEGEN.catalogMin) {
  errors.push("catalog count below floor");
}
if (measure.featureCount < SHIP_CODEGEN.featureMin) {
  errors.push("feature count below floor");
}
if (!measure.generatedPresent) errors.push("generated mirrors missing");
if (!measure.checkClean) {
  errors.push("codegen check dirty");
  errors.push(...measure.checkErrors.slice(0, 8));
}
if (!measure.gapClosed) errors.push("shipCodegenMissing still open");
if (FINISH6_OPEN_GAP_FLAGS.includes("shipCodegenMissing")) {
  errors.push("OPEN_GAP_FLAGS still lists shipCodegenMissing");
}
if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
  errors.push(`expected 7 open Finish 6 gaps after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
}

if (errors.length) {
  console.error("shipcodegen:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK shipcodegen:smoke — catalogs=${measure.catalogCount}; features=${measure.featureCount}; check=clean; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
