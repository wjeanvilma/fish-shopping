/**
 * Finish 4.0 Phase 15 — rival markets 8→12 + AI depth readiness.
 *
 * Usage:
 *   npm run rivals2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  RIVAL_COUNT_2,
  RIVAL_MARKETS_2,
  RIVAL_MARKETS_2_MARKER,
  RIVAL_MARKETS_2_PHASE,
  RIVAL_MARKETS_2_SCHEMA,
  measureRivalMarkets2,
} from "../src/ship/rivalMarkets2";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/rival-markets-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-rival-markets-2.json"));
  const historic = readJson(resolve(root, "shared/ship/rival-markets.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RivalMarkets2.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const schema = readFileSync(resolve(root, "shared/schema/content-pack.schema.json"), "utf8");

  if (catalog.phase !== 15) errors.push(`phase expected 15, got ${catalog.phase}`);
  if (catalog.schema !== RIVAL_MARKETS_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (RIVAL_MARKETS_2_PHASE !== 15) errors.push("phase mirror mismatch");
  if (catalog.rivalMarkets2Marker !== RIVAL_MARKETS_2_MARKER) errors.push("marker mismatch");
  if (fixture.rivalMarkets2Marker !== RIVAL_MARKETS_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.rivalCount !== 12 || RIVAL_COUNT_2 !== 12) errors.push("rivalCount must be 12");
  if (catalog.newRivalIds?.length !== 4) errors.push("newRivalIds must list 4");
  if ((historic.rivalCount ?? 0) !== 8) {
    errors.push("Finish 3.0 rival-markets.json rivalCount must stay 8 (historical floor)");
  }

  const measure = measureRivalMarkets2(root);
  if (measure.rivalCount < 12) errors.push(`rivals ${measure.rivalCount} < 12`);
  if (!measure.newRivalsPresent) {
    errors.push(`missing new rivals: ${measure.missingNewRivals.join(", ")}`);
  }
  if (!measure.harborsCovered) errors.push("rivals must cover all harbors");
  if (!measure.aiProfilesPresent) errors.push("every rival must have a valid aiProfile");
  if (!measure.aiCatalogWired) errors.push("AI catalog knobs not wired in content-pack");
  if (!measure.systemAiDepthTs) errors.push("TS RivalMarketSystem missing AI depth markers");
  if (!measure.systemAiDepthKt) errors.push("Kotlin RivalMarketSystem missing AI depth markers");
  if (!measure.kickoffRivalsMet) errors.push("kickoff baseline.rivalMarkets must be ≥ 12");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of RIVAL_MARKETS_2.newRivalIds) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
    if (!CONTENT_STRING_KEYS.includes(id)) errors.push(`CONTENT_STRING_KEYS missing ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if (!schema.includes("aiProfile")) {
    errors.push("content-pack.schema.json missing aiProfile");
  }
  if (!schema.includes("adaptiveAggressionBoostPermille")) {
    errors.push("content-pack.schema.json missing adaptiveAggressionBoostPermille");
  }

  const phase15 = (kickoff.phases as any[])?.find((p) => p.phase === 15);
  if (!phase15) errors.push("kickoff missing phase 15");
  else if (phase15.validate !== "rivals2:validate") {
    errors.push("kickoff phase 15 validate must be rivals2:validate");
  }
  if (phase15?.id !== "rivals-2") errors.push("kickoff phase 15 id must be rivals-2");
  if ((kickoff.baseline?.rivalMarkets ?? 0) < 12) {
    errors.push("kickoff.baseline.rivalMarkets must be ≥ 12");
  }
  if ((kickoff.gapTargets?.rivalsMin ?? 0) < 12) {
    errors.push("kickoff.gapTargets.rivalsMin must be ≥ 12");
  }

  if (listing.rivalMarkets2Phase !== 15) errors.push("listing.rivalMarkets2Phase must be 15");
  if (listing.rivalMarkets2Catalog !== "shared/ship/rival-markets-2.json") {
    errors.push("listing.rivalMarkets2Catalog mismatch");
  }
  if (pin.rivalMarkets2 !== "shared/ship/rival-markets-2.json") {
    errors.push("RELEASE_PIN.rivalMarkets2 path missing");
  }
  if (!pin.fixtures?.includes("parity-rival-markets-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-rival-markets-2.json");
  }

  const block = dod.rivalMarkets2;
  if (!block) errors.push("DoD missing rivalMarkets2 block");
  else {
    if (block.phase !== 15) errors.push("DoD rivalMarkets2.phase must be 15");
    if (block.plan !== "30_finish_4.0") errors.push("DoD rivalMarkets2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD rivalMarkets2.status must be complete");
    if (block.rivalMarkets2Marker !== RIVAL_MARKETS_2_MARKER) {
      errors.push("DoD rivalMarkets2 marker mismatch");
    }
  }
  if ((dod.quotas?.rivalMarkets ?? 0) < 12) {
    errors.push("DoD quotas.rivalMarkets must be ≥ 12");
  }

  if (!pkg.scripts?.["rivals2:validate"]) errors.push("package.json missing rivals2:validate");
  if (!ci.includes("rivals2:validate")) errors.push("ci.yml missing rivals2:validate");
  if (!ci.includes("rivalmarkets:validate")) {
    errors.push("ci.yml missing baseline rivalmarkets:validate");
  }
  if (!kotlin.includes("NEW_RIVAL_IDS")) errors.push("Kotlin RivalMarkets2 missing NEW_RIVAL_IDS");
  if (!finish4Kt.includes("rivals2:validate")) {
    errors.push("Finish4Kickoff.kt phase 15 missing rivals2:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_rivals_2.py"))) {
    errors.push("missing author_rivals_2.py");
  }

  if (fixture.expectFinal?.rivalCount !== 12) errors.push("parity rivalCount must be 12");
  if (fixture.expectFinal?.schemaVersion !== 24) {
    errors.push("fixture schemaVersion must stay 24");
  }
  if (!fixture.expectActive?.multiRivalPressure) {
    errors.push("fixture must expect multiRivalPressure");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("rivals2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK rivals2:validate — rival markets 12 + AI depth wired");
