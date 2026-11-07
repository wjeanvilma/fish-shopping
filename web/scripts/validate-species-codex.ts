/**
 * Finish 2.0 Phase 12 — species codex / journal readiness.
 *
 * Usage:
 *   npm run codex:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/engine";
import {
  CODEX_ENTRY_FLOOR,
  SPECIES_CODEX,
  SPECIES_CODEX_PHASE,
  SPECIES_CODEX_SCHEMA,
} from "../src/ship/speciesCodex";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/species-codex.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-species-codex.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 12) errors.push(`phase expected 12, got ${catalog.phase}`);
  if (catalog.schema !== SPECIES_CODEX_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (SPECIES_CODEX_PHASE !== 12) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must be 21");
  if (catalog.codexEntryCount !== 50 || CODEX_ENTRY_FLOOR !== 50) {
    errors.push("codexEntryCount must be 50");
  }
  if (catalog.familyCount !== 9) errors.push("familyCount must be 9");
  if (dod.quotas?.codexEntries !== 50) {
    errors.push("DoD quotas.codexEntries must be 50");
  }
  if (!Array.isArray(dod.screensPresent) || !dod.screensPresent.includes("species_journal")) {
    errors.push("DoD screensPresent must include species_journal");
  }
  if (content.species.length !== 50) errors.push(`species ${content.species.length} ≠ 50`);
  if (content.codex.entries.length !== 50) {
    errors.push(`codex entries ${content.codex.entries.length} ≠ 50`);
  }
  if (content.codex.families.length !== 9) {
    errors.push(`codex families ${content.codex.families.length} ≠ 9`);
  }

  if (listing.speciesCodexPhase !== 12) errors.push("listing.speciesCodexPhase must be 12");
  if (listing.speciesCodexCatalog !== "shared/ship/species-codex.json") {
    errors.push("listing.speciesCodexCatalog mismatch");
  }
  if (!ci.includes("codex:validate")) errors.push("ci.yml missing codex:validate");
  if (!pin.fixtures?.includes("parity-species-codex.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-species-codex.json");
  }
  if (pin.speciesCodex !== "shared/ship/species-codex.json") {
    errors.push("RELEASE_PIN.speciesCodex path mismatch");
  }

  for (const fam of SPECIES_CODEX.families) {
    if (!content.codex.families.includes(fam)) errors.push(`missing family ${fam}`);
  }
  for (const sp of content.species) {
    if (!content.codexBySpeciesId.has(sp.id)) errors.push(`missing codex for ${sp.id}`);
  }

  if (fixture.expect?.total !== 50) errors.push("fixture expect.total must be 50");
  if (fixture.expect?.familyCount !== 9) errors.push("fixture expect.familyCount must be 9");
  if (fixture.expect?.sprat?.family !== "pier") errors.push("fixture sprat family must be pier");

  const bookTs = readFileSync(resolve(root, "web/src/engine/speciesBook.ts"), "utf8");
  const bookKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/inventory/SpeciesBook.kt"),
    "utf8",
  );
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const screenKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  if (!bookTs.includes("habitatHint") || !bookTs.includes("rarityBand")) {
    errors.push("web SpeciesBook missing Phase 12 fields");
  }
  if (!bookKt.includes("habitatHint") || !bookKt.includes("rarityBand")) {
    errors.push("Kotlin SpeciesBook missing Phase 12 fields");
  }
  if (!appTsx.includes("Species journal") || !appTsx.includes("habitatHint")) {
    errors.push("web SpeciesBookPanel missing journal depth");
  }
  if (!screenKt.includes("Species journal") || !screenKt.includes("habitatHint")) {
    errors.push("Android SpeciesBookPanel missing journal depth");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("codex:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK codex:validate — species codex / journal ready");
