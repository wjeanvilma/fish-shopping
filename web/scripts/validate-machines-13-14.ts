/**
 * Finish 5.0 Phase 15 — machines 13–14 readiness.
 *
 * Usage:
 *   npm run machines1314:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  MACHINE_COUNT_1314,
  MACHINES_1314,
  MACHINES_1314_MARKER,
  MACHINES_1314_PHASE,
  MACHINES_1314_SCHEMA,
  measureMachines1314,
} from "../src/ship/machines1314";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/machines-13-14.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-machines-13-14.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Machines1314.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 15) errors.push(`phase expected 15, got ${catalog.phase}`);
  if (catalog.schema !== MACHINES_1314_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (MACHINES_1314_PHASE !== 15) errors.push("phase mirror mismatch");
  if (catalog.machines1314Marker !== MACHINES_1314_MARKER) errors.push("marker mismatch");
  if (fixture.machines1314Marker !== MACHINES_1314_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.machineCount !== 14 || MACHINE_COUNT_1314 !== 14) {
    errors.push("machineCount must be 14");
  }
  if (catalog.newMachineCount !== 2) errors.push("newMachineCount must be 2");
  if (catalog.newMachines?.length !== 2) errors.push("newMachines must list 2");

  const measure = measureMachines1314(root);
  if (measure.machineCount < 14) errors.push(`machines ${measure.machineCount} < 14`);
  if (!measure.newMachinesPresent) errors.push("new machines missing");
  if (!measure.recipesWired) errors.push("recipes not wired");
  if (!measure.productsPresent) errors.push("products missing");
  if (!measure.upgradesWired) errors.push("unlock upgrades missing");
  if (!measure.plotsWired) errors.push("plots missing on harbors");
  if (!measure.stationsWired) errors.push("stations missing on harbors");
  if (!measure.assetsPresent) {
    errors.push(`missing assets: ${measure.missingAssets.join(", ")}`);
  }
  if (!measure.kickoffMachinesMet) {
    errors.push("kickoff baseline.machines≥14 and machinesRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of MACHINES_1314.newMachines) {
    if (!en.strings?.[entry.id]) errors.push(`content-strings.en missing ${entry.id}`);
    if (!en.strings?.[entry.unlockUpgrade]) {
      errors.push(`content-strings.en missing ${entry.unlockUpgrade}`);
    }
    for (const productId of entry.products) {
      if (!en.strings?.[productId]) errors.push(`content-strings.en missing ${productId}`);
    }
  }

  const phase15 = (kickoff.phases as any[])?.find((p) => p.phase === 15);
  if (!phase15) errors.push("kickoff missing phase 15");
  else if (phase15.validate !== "machines1314:validate") {
    errors.push("kickoff phase 15 validate must be machines1314:validate");
  }
  if (phase15?.id !== "machines-13-14") errors.push("kickoff phase 15 id must be machines-13-14");
  if (kickoff.baseline?.machines !== 14) errors.push("kickoff.baseline.machines must be 14");
  if (kickoff.gaps?.machinesRemaining !== 0) {
    errors.push("kickoff.gaps.machinesRemaining must be 0");
  }
  if ((kickoff.gapTargets?.machinesMin ?? 0) < 14) {
    errors.push("kickoff.gapTargets.machinesMin must be ≥ 14");
  }

  if (listing.machines1314Phase !== 15) errors.push("listing.machines1314Phase must be 15");
  if (listing.machines1314Catalog !== "shared/ship/machines-13-14.json") {
    errors.push("listing.machines1314Catalog mismatch");
  }
  if (pin.machines1314 !== "shared/ship/machines-13-14.json") {
    errors.push("RELEASE_PIN.machines1314 path missing");
  }
  if (!pin.fixtures?.includes("parity-machines-13-14.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-machines-13-14.json");
  }

  const block = dod.machines1314;
  if (!block) errors.push("DoD missing machines1314 block");
  else {
    if (block.phase !== 15) errors.push("DoD machines1314.phase must be 15");
    if (block.plan !== "30_finish_5.0") errors.push("DoD machines1314.plan mismatch");
    if (block.status !== "complete") errors.push("DoD machines1314.status must be complete");
    if (block.machines1314Marker !== MACHINES_1314_MARKER) {
      errors.push("DoD machines1314 marker mismatch");
    }
  }
  if ((dod.quotas?.machineClasses ?? 0) < 14) {
    errors.push("DoD quotas.machineClasses must be ≥ 14");
  }

  if (!pkg.scripts?.["machines1314:validate"]) {
    errors.push("package.json missing machines1314:validate");
  }
  if (!ci.includes("machines1314:validate")) errors.push("ci.yml missing machines1314:validate");
  if (!kotlin.includes("NEW_MACHINE_IDS")) errors.push("Kotlin Machines1314 missing NEW_MACHINE_IDS");
  if (!existsSync(resolve(root, "shared/tools/author_machines_13_14.py"))) {
    errors.push("missing author_machines_13_14.py");
  }

  if (fixture.expectFinal?.machineCount !== 14) {
    errors.push("parity machineCount must be 14");
  }
  if (fixture.build?.plotId !== "plot.sunrise_poacher") {
    errors.push("fixture must build plot.sunrise_poacher");
  }
  if (fixture.expectFinal?.schemaVersion !== 25) {
    errors.push("fixture schemaVersion must stay 25");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("machines1314:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK machines1314:validate — machines 13–14 + recipes/UI pads wired");
