/**
 * Finish 3.0 Phase 13 — machines 9–10 readiness.
 *
 * Usage:
 *   npm run machines910:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MACHINE_COUNT_910,
  MACHINES_910,
  MACHINES_910_MARKER,
  MACHINES_910_PHASE,
  MACHINES_910_SCHEMA,
  measureMachines910,
} from "../src/ship/machines910";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/machines-9-10.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-machines-9-10.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Machines910.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 13) errors.push(`phase expected 13, got ${catalog.phase}`);
  if (catalog.schema !== MACHINES_910_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (MACHINES_910_PHASE !== 13) errors.push("phase mirror mismatch");
  if (catalog.machines910Marker !== MACHINES_910_MARKER) errors.push("marker mismatch");
  if (fixture.machines910Marker !== MACHINES_910_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.machineCount !== 10 || MACHINE_COUNT_910 !== 10) {
    errors.push("machineCount must be 10");
  }
  if (catalog.newMachines?.length !== 2) errors.push("newMachines must list 2");

  const measure = measureMachines910(root);
  if (measure.machineCount !== 10) errors.push(`machines ${measure.machineCount} ≠ 10`);
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
    errors.push("kickoff baseline.machines must be ≥10 with measuredAtPhase≥13");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of MACHINES_910.newMachines) {
    if (!en.strings?.[entry.id]) errors.push(`content-strings.en missing ${entry.id}`);
    if (!en.strings?.[entry.unlockUpgrade]) {
      errors.push(`content-strings.en missing ${entry.unlockUpgrade}`);
    }
    for (const productId of entry.products) {
      if (!en.strings?.[productId]) errors.push(`content-strings.en missing ${productId}`);
    }
  }

  const phase13 = (kickoff.phases as any[])?.find((p) => p.phase === 13);
  if (!phase13) errors.push("kickoff missing phase 13");
  else if (phase13.validate !== "machines910:validate") {
    errors.push("kickoff phase 13 validate must be machines910:validate");
  }
  if (kickoff.baseline?.machines !== 10) errors.push("kickoff.baseline.machines must be 10");
  if (kickoff.gapTargets?.machinesMin !== 10) {
    errors.push("kickoff.gapTargets.machinesMin must be 10");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 13) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 13");
  }

  if (listing.machines910Phase !== 13) errors.push("listing.machines910Phase must be 13");
  if (listing.machines910Catalog !== "shared/ship/machines-9-10.json") {
    errors.push("listing.machines910Catalog mismatch");
  }
  if (pin.machines910 !== "shared/ship/machines-9-10.json") {
    errors.push("RELEASE_PIN.machines910 path missing");
  }
  if (!pin.fixtures?.includes("parity-machines-9-10.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-machines-9-10.json");
  }

  const block = dod.machines910;
  if (!block) errors.push("DoD missing machines910 block");
  else {
    if (block.phase !== 13) errors.push("DoD machines910.phase must be 13");
    if (block.plan !== "30_finish_3.0") errors.push("DoD machines910.plan mismatch");
    if (block.status !== "complete") errors.push("DoD machines910.status must be complete");
    if (block.machines910Marker !== MACHINES_910_MARKER) {
      errors.push("DoD machines910 marker mismatch");
    }
  }
  if ((dod.quotas?.machineClasses ?? 0) < 10) {
    errors.push("DoD quotas.machineClasses must be ≥ 10");
  }

  if (!pkg.scripts?.["machines910:validate"]) {
    errors.push("package.json missing machines910:validate");
  }
  if (!ci.includes("machines910:validate")) errors.push("ci.yml missing machines910:validate");
  if (!kotlin.includes("NEW_MACHINE_IDS")) errors.push("Kotlin Machines910 missing NEW_MACHINE_IDS");
  if (!existsSync(resolve(root, "shared/tools/mutate_phase13_machines.py"))) {
    errors.push("missing mutate_phase13_machines.py");
  }

  if (fixture.expectFinal?.machineCount !== 10) {
    errors.push("parity machineCount must be 10");
  }
  if (fixture.build?.plotId !== "plot.sunrise_press") {
    errors.push("fixture must build plot.sunrise_press");
  }
  if (fixture.expectFinal?.schemaVersion !== 23) {
    errors.push("fixture schemaVersion must stay 23");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("machines910:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK machines910:validate — machines 9–10 + recipes wired");
