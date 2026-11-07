/**
 * Finish 2.0 Phase 8 — harbors 6–8 readiness.
 *
 * Usage:
 *   npm run harbors68:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/engine";
import {
  HARBORS_68,
  HARBORS_68_PHASE,
  HARBORS_68_SCHEMA,
  HARBOR_COUNT_FLOOR,
} from "../src/ship/harbors68";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbors-6-8.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbors-6-8.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 8) errors.push(`phase expected 8, got ${catalog.phase}`);
  if (catalog.schema !== HARBORS_68_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (HARBORS_68_PHASE !== 8) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must be 21");
  if (catalog.harborCount !== 8 || HARBOR_COUNT_FLOOR !== 8) errors.push("harborCount must be 8");
  if (dod.quotas?.harbors !== 8) errors.push("DoD quotas.harbors must be 8");
  if (content.harbors.length !== 8) errors.push(`content harbors ${content.harbors.length} ≠ 8`);

  if (listing.harbors68Phase !== 8) errors.push("listing.harbors68Phase must be 8");
  if (listing.harbors68Catalog !== "shared/ship/harbors-6-8.json") {
    errors.push("listing.harbors68Catalog mismatch");
  }
  if (!ci.includes("harbors68:validate")) errors.push("ci.yml missing harbors68:validate");
  if (!pin.fixtures?.includes("parity-harbors-6-8.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbors-6-8.json");
  }

  for (const entry of HARBORS_68.newHarbors) {
    const h = content.harborsById.get(entry.id);
    if (!h) {
      errors.push(`missing harbor ${entry.id}`);
      continue;
    }
    if (h.name !== entry.name) errors.push(`${entry.id} name mismatch`);
    if (JSON.stringify([...(h.requires ?? [])]) !== JSON.stringify(entry.requires)) {
      errors.push(`${entry.id} requires mismatch`);
    }
    if (h.specialization?.id !== entry.specialization) {
      errors.push(`${entry.id} specialization mismatch`);
    }
    if (!content.questsById.has(entry.landingQuest)) {
      errors.push(`missing landing quest ${entry.landingQuest}`);
    }
    if (!content.prestigeMilestonesById.has(entry.prestigeUnlock)) {
      errors.push(`missing prestige ${entry.prestigeUnlock}`);
    }
    if (!content.trophySetsById.has(entry.gallery)) {
      errors.push(`missing gallery ${entry.gallery}`);
    }
    if (!existsSync(resolve(root, entry.blockout))) {
      errors.push(`missing blockout ${entry.blockout}`);
    }
    if (h.zones.length < 15) errors.push(`${entry.id} needs a full zone layout`);
    if (h.fishingSpots.length < 3) errors.push(`${entry.id} needs ≥3 fishing spots`);
    if (h.stations.length < 6) errors.push(`${entry.id} needs marina-class stations`);
  }

  for (const id of HARBORS_68.circuitPrestige) {
    if (!content.prestigeMilestonesById.has(id)) {
      errors.push(`missing circuit prestige ${id}`);
    }
  }

  if (fixture.setup?.harborsTraveled !== 5) errors.push("fixture setup harborsTraveled must be 5");
  if ((fixture.travels as any[])?.length !== 3) errors.push("fixture travels must be 3");
  if (fixture.expectFinal?.harborId !== "harbor.ember_wharf") {
    errors.push("fixture expectFinal harbor must be ember_wharf");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harbors68:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harbors68:validate — harbors 6–8 + circuit prestige + blockouts ready");
