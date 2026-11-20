/**
 * Finish 6.0 Phase 2 — smoke Ajv against live sample catalogs.
 *
 * Usage:
 *   npm run schema6:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { measureSchema6, SCHEMA_6 } from "../src/ship/schema6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const errors: string[] = [];
const measure = measureSchema6(root);

if (!measure.indexOk) errors.push("schema index floors failed");
if (!measure.ajvOk) {
  errors.push("Ajv sample set failed");
  errors.push(...measure.sampleErrors.slice(0, 12));
}
if (measure.shipValidated < SCHEMA_6.sampleCatalogMin.ship) {
  errors.push("ship sample count below floor");
}
if (measure.billingValidated < SCHEMA_6.sampleCatalogMin.billing) {
  errors.push("billing sample count below floor");
}
if (measure.opsValidated < SCHEMA_6.sampleCatalogMin.ops) {
  errors.push("ops sample count below floor");
}
if (!measure.gapClosed) errors.push("schemaFoundationsIncomplete still open");
if (FINISH6_OPEN_GAP_FLAGS.includes("schemaFoundationsIncomplete")) {
  errors.push("OPEN_GAP_FLAGS still lists schemaFoundationsIncomplete");
}
// Soft-floor: Phase 7 closed harborArt6Incomplete → 19 open flags.
if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
  errors.push(`expected 7 open Finish 6 gaps after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
}

if (errors.length) {
  console.error("schema6:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK schema6:smoke — schemas=${measure.schemaCount}; ship=${measure.shipValidated} billing=${measure.billingValidated} ops=${measure.opsValidated}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
