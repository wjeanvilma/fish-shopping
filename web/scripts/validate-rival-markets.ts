/**
 * Finish 3.0 Phase 14 — rival NPC markets readiness.
 *
 * Usage:
 *   npm run rivalmarkets:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  measureRivalMarkets,
  RIVAL_COUNT,
  RIVAL_MARKETS,
  RIVAL_MARKETS_MARKER,
  RIVAL_MARKETS_PHASE,
  RIVAL_MARKETS_SCHEMA,
} from "../src/ship/rivalMarkets";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/rival-markets.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-rival-markets.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RivalMarkets.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const schema = readFileSync(resolve(root, "shared/schema/content-pack.schema.json"), "utf8");

  if (catalog.phase !== 14) errors.push(`phase expected 14, got ${catalog.phase}`);
  if (catalog.schema !== RIVAL_MARKETS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (RIVAL_MARKETS_PHASE !== 14) errors.push("phase mirror mismatch");
  if (catalog.rivalMarketsMarker !== RIVAL_MARKETS_MARKER) errors.push("marker mismatch");
  if (fixture.rivalMarketsMarker !== RIVAL_MARKETS_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.rivalCount !== 8 || RIVAL_COUNT !== 8) errors.push("catalog rivalCount must stay 8");
  if (catalog.rivalIds?.length !== 8) errors.push("rivalIds must list 8");

  const measure = measureRivalMarkets(root);
  // Finish 4.0 Phase 15 soft floor — content may exceed Finish 3.0's 8 rivals.
  if (measure.rivalCount < 8) errors.push(`rivals ${measure.rivalCount} < 8`);
  if (!measure.rivalsPresent) {
    errors.push(`missing rivals: ${measure.missingRivals.join(", ")}`);
  }
  if (!measure.harborsCovered) errors.push("rivals must cover all harbors");
  if (!measure.statsWiredTs) errors.push("TS stats missing rival keys");
  if (!measure.statsWiredKt) errors.push("Kotlin stats missing rival keys");
  if (!measure.systemMarkersTs) errors.push("TS RivalMarketSystem markers missing");
  if (!measure.systemMarkersKt) errors.push("Kotlin RivalMarketSystem markers missing");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 14 must set validate=rivalmarkets:validate and measuredAtPhase≥14");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of RIVAL_MARKETS.rivalIds) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }

  const phase14 = (kickoff.phases as any[])?.find((p) => p.phase === 14);
  if (!phase14) errors.push("kickoff missing phase 14");
  else if (phase14.validate !== "rivalmarkets:validate") {
    errors.push("kickoff phase 14 validate must be rivalmarkets:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 14) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 14");
  }

  if (listing.rivalMarketsPhase !== 14) errors.push("listing.rivalMarketsPhase must be 14");
  if (listing.rivalMarketsCatalog !== "shared/ship/rival-markets.json") {
    errors.push("listing.rivalMarketsCatalog mismatch");
  }
  if (pin.rivalMarkets !== "shared/ship/rival-markets.json") {
    errors.push("RELEASE_PIN.rivalMarkets path missing");
  }
  if (!pin.fixtures?.includes("parity-rival-markets.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-rival-markets.json");
  }

  const block = dod.rivalMarkets;
  if (!block) errors.push("DoD missing rivalMarkets block");
  else {
    if (block.phase !== 14) errors.push("DoD rivalMarkets.phase must be 14");
    if (block.plan !== "30_finish_3.0") errors.push("DoD rivalMarkets.plan mismatch");
    if (block.status !== "complete") errors.push("DoD rivalMarkets.status must be complete");
    if (block.rivalMarketsMarker !== RIVAL_MARKETS_MARKER) {
      errors.push("DoD rivalMarkets marker mismatch");
    }
  }
  if ((dod.quotas?.rivalMarkets ?? 0) < 8) {
    errors.push("DoD quotas.rivalMarkets must be ≥ 8");
  }

  if (!pkg.scripts?.["rivalmarkets:validate"]) {
    errors.push("package.json missing rivalmarkets:validate");
  }
  if (!ci.includes("rivalmarkets:validate")) errors.push("ci.yml missing rivalmarkets:validate");
  if (!kotlin.includes("RIVAL_IDS")) errors.push("Kotlin RivalMarkets missing RIVAL_IDS");
  if (!schema.includes('"rivalMarkets"')) {
    errors.push("content-pack.schema.json missing rivalMarkets");
  }
  if (!existsSync(resolve(root, "shared/tools/mutate_phase14_rivals.py"))) {
    errors.push("missing mutate_phase14_rivals.py");
  }

  if (fixture.expectFinal?.rivalCount !== 8) errors.push("parity rivalCount must be 8");
  if (fixture.expectActive?.rivalId !== "rival.dockside_dolly") {
    errors.push("parity expectActive.rivalId must be rival.dockside_dolly");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("rivalmarkets:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK rivalmarkets:validate — 8 rival NPC markets wired");
