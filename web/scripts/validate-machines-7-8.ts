/**
 * Finish 2.0 Phase 10 — machines 7–8 readiness.
 *
 * Usage:
 *   npm run machines78:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/engine";
import {
  MACHINE_COUNT_FLOOR,
  MACHINES_78,
  MACHINES_78_PHASE,
  MACHINES_78_SCHEMA,
} from "../src/ship/machines78";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/machines-7-8.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-machines-7-8.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 10) errors.push(`phase expected 10, got ${catalog.phase}`);
  if (catalog.schema !== MACHINES_78_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (MACHINES_78_PHASE !== 10) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must be 21");
  if (catalog.machineCount !== 8 || MACHINE_COUNT_FLOOR !== 8) {
    errors.push("machineCount must be 8");
  }
  if (dod.quotas?.machineClasses !== 8) {
    errors.push("DoD quotas.machineClasses must be 8");
  }
  if (content.machines.length !== 8) {
    errors.push(`content machines ${content.machines.length} ≠ 8`);
  }

  if (listing.machines78Phase !== 10) errors.push("listing.machines78Phase must be 10");
  if (listing.machines78Catalog !== "shared/ship/machines-7-8.json") {
    errors.push("listing.machines78Catalog mismatch");
  }
  if (!ci.includes("machines78:validate")) errors.push("ci.yml missing machines78:validate");
  if (!pin.fixtures?.includes("parity-machines-7-8.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-machines-7-8.json");
  }
  if (pin.machines78 !== "shared/ship/machines-7-8.json") {
    errors.push("RELEASE_PIN.machines78 path mismatch");
  }

  for (const entry of MACHINES_78.newMachines) {
    const m = content.machinesById.get(entry.id);
    if (!m) {
      errors.push(`missing machine ${entry.id}`);
      continue;
    }
    if (m.name !== entry.name) errors.push(`${entry.id} name mismatch`);
    if (m.recipes.length !== entry.recipeCount) {
      errors.push(`${entry.id} recipeCount ${m.recipes.length} ≠ ${entry.recipeCount}`);
    }
    if (!m.recipes.includes(entry.sampleRecipe)) {
      errors.push(`${entry.id} missing sample recipe ${entry.sampleRecipe}`);
    }
    if (!content.recipesById.has(entry.sampleRecipe)) {
      errors.push(`missing recipe ${entry.sampleRecipe}`);
    }
    const up = content.upgradesById.get(entry.unlockUpgrade);
    if (!up) {
      errors.push(`missing unlock ${entry.unlockUpgrade}`);
    } else if (
      up.effect.kind !== "unlock_machine" ||
      (up.effect as { machine?: string }).machine !== entry.id
    ) {
      errors.push(`${entry.unlockUpgrade} must unlock ${entry.id}`);
    }
    for (const productId of entry.products) {
      if (!content.productsById.has(productId)) errors.push(`missing product ${productId}`);
      const asset = content.productsById.get(productId)?.asset;
      if (asset && !existsSync(resolve(root, "shared/assets", asset))) {
        errors.push(`missing product GLB ${asset}`);
      }
    }
    for (const harbor of content.harbors) {
      const station = harbor.stations.find((s) => s.machine === entry.id);
      if (!station) {
        errors.push(`${harbor.id} missing station for ${entry.id}`);
        continue;
      }
      if (station.requiresUpgrade !== entry.unlockUpgrade) {
        errors.push(`${harbor.id} ${entry.id} requiresUpgrade mismatch`);
      }
      const plot = harbor.plots?.find((pl) => pl.grantsUpgrade === entry.unlockUpgrade);
      if (!plot) errors.push(`${harbor.id} missing plot for ${entry.unlockUpgrade}`);
    }
  }

  if (fixture.expectFinal?.machineCount !== 8) {
    errors.push("fixture expectFinal.machineCount must be 8");
  }
  if (fixture.build?.plotId !== "plot.sunrise_steamer") {
    errors.push("fixture must build plot.sunrise_steamer");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("machines78:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK machines78:validate — machines 7–8 + recipes ready");
