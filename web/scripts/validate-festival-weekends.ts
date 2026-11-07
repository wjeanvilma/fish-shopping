/**
 * Finish 2.0 Phase 16 — festival weekends readiness.
 *
 * Usage:
 *   npm run festivals:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, SCHEMA_VERSION, CustomerSystem, SeasonalEventSystem } from "../src/engine";
import {
  FESTIVAL_WEEKEND_FLOOR,
  FESTIVAL_WEEKENDS,
  FESTIVAL_WEEKENDS_PHASE,
  FESTIVAL_WEEKENDS_SCHEMA,
} from "../src/ship/festivalWeekends";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/festival-weekends.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-festival-weekends.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 16) errors.push(`phase expected 16, got ${catalog.phase}`);
  if (catalog.schema !== FESTIVAL_WEEKENDS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (FESTIVAL_WEEKENDS_PHASE !== 16) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.weekendEventCount !== 8 || FESTIVAL_WEEKEND_FLOOR !== 8) {
    errors.push("weekendEventCount must be 8");
  }
  if (dod.quotas?.seasonalEvents !== 8) errors.push("DoD quotas.seasonalEvents must be 8");
  if (content.seasonalEvents.events.length < 8) {
    errors.push(`events ${content.seasonalEvents.events.length} < 8`);
  }

  if (listing.festivalWeekendsPhase !== 16) errors.push("listing.festivalWeekendsPhase must be 16");
  if (listing.festivalWeekendsCatalog !== "shared/ship/festival-weekends.json") {
    errors.push("listing.festivalWeekendsCatalog mismatch");
  }
  if (!ci.includes("festivals:validate")) errors.push("ci.yml missing festivals:validate");
  if (!ci.includes("schema23:validate")) errors.push("ci.yml missing schema23:validate");
  if (!pin.fixtures?.includes("parity-festival-weekends.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-festival-weekends.json");
  }
  if (pin.festivalWeekends !== "shared/ship/festival-weekends.json") {
    errors.push("RELEASE_PIN.festivalWeekends path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  for (const id of FESTIVAL_WEEKENDS.events) {
    if (!content.seasonalEventsById.has(id)) errors.push(`missing event ${id}`);
  }
  for (const id of FESTIVAL_WEEKENDS.festivalCustomers) {
    if (!content.customersById.has(id)) errors.push(`missing festival customer ${id}`);
  }

  const event = content.seasonalEventsById.get(fixture.eventId);
  if (!event) errors.push(`fixture event ${fixture.eventId} missing`);
  else {
    if ((event.customerSpawnMultPermille ?? 1000) !== fixture.expect.customerSpawnMultPermille) {
      errors.push("fixture customerSpawnMultPermille mismatch vs content");
    }
    if ((event.priceMultPermille ?? 1000) !== fixture.expect.priceMultPermille) {
      errors.push("fixture priceMultPermille mismatch vs content");
    }
    const weight = event.speciesWeightMultPermille?.["species.silver_sprat"];
    if (weight !== fixture.expect.speciesWeightSilverSprat) {
      errors.push("fixture silver sprat weight mismatch");
    }
  }

  const guest = content.customersById.get(fixture.festivalCustomerId);
  if (!guest) errors.push(`fixture festival customer ${fixture.festivalCustomerId} missing`);
  else if (guest.requiresSeasonalEvent !== fixture.eventId) {
    errors.push("festival customer requiresSeasonalEvent mismatch");
  }

  const gated = content.contractTemplatesById.get(fixture.gatedContractId);
  if (!gated) errors.push(`fixture gated contract ${fixture.gatedContractId} missing`);
  else if (gated.requiresSeasonalEvent !== fixture.eventId) {
    errors.push("gated contract requiresSeasonalEvent mismatch");
  }

  if (typeof SeasonalEventSystem.customerSpawnMultPermille !== "function") {
    errors.push("SeasonalEventSystem.customerSpawnMultPermille missing");
  }
  if (typeof CustomerSystem.spawnIntervalTicks !== "function") {
    errors.push("CustomerSystem.spawnIntervalTicks missing");
  }

  const seasonalKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/world/SeasonalEvents.kt"),
    "utf8",
  );
  const customerKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/customers/CustomerSystem.kt"),
    "utf8",
  );
  const systemsTs = readFileSync(resolve(root, "web/src/engine/systems.ts"), "utf8");
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const screenKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  if (!seasonalKt.includes("fun customerSpawnMultPermille")) {
    errors.push("Kotlin SeasonalEventSystem missing customerSpawnMultPermille");
  }
  if (!seasonalKt.includes("fun priceMultPermille")) {
    errors.push("Kotlin SeasonalEventSystem missing priceMultPermille");
  }
  if (!customerKt.includes("SeasonalEventSystem")) {
    errors.push("Kotlin CustomerSystem missing SeasonalEventSystem stack");
  }
  if (!systemsTs.includes("SeasonalEventSystem.customerSpawnMultPermille")) {
    errors.push("web CustomerSystem missing festival crowd stack");
  }
  if (!systemsTs.includes("SeasonalEventSystem.priceMultPermille")) {
    errors.push("web CustomerSystem missing festival price stack");
  }
  if (!appTsx.includes("customerSpawnMultPermille")) {
    errors.push("web Goals panel missing festival crowd tip");
  }
  if (!screenKt.includes("customerSpawnMultPermille")) {
    errors.push("Android Goals panel missing festival crowd tip");
  }

  for (const e of content.seasonalEvents.events) {
    if ((e.customerSpawnMultPermille ?? 1000) <= 1000) {
      errors.push(`${e.id}: customerSpawnMultPermille should boost crowd (>1000)`);
    }
    if ((e.priceMultPermille ?? 1000) <= 1000) {
      errors.push(`${e.id}: priceMultPermille should tip sales (>1000)`);
    }
    if ((e.festivalCustomerIds ?? []).length < 1) {
      errors.push(`${e.id}: needs ≥1 festivalCustomerId`);
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("festivals:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK festivals:validate — festival weekends ready");
