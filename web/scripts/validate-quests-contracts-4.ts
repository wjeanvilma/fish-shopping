/**
 * Finish 4.0 Phase 14 — quests/contracts expansion readiness.
 *
 * Usage:
 *   npm run quests4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractSystem, loadContent, SCHEMA_VERSION } from "../src/engine";
import {
  QUESTS4_CHAINS_MIN,
  QUESTS4_QUESTS_MIN,
  QUESTS4_REP_GATED_MIN,
  QUESTS4_TEMPLATES_MIN,
  QUESTS_CONTRACTS_4,
  QUESTS_CONTRACTS_4_MARKER,
  QUESTS_CONTRACTS_4_PHASE,
  QUESTS_CONTRACTS_4_SCHEMA,
  chainLengthsOk,
  measureQuestsContracts4,
} from "../src/ship/questsContracts4";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/quests-contracts-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-quests-contracts-4.json"));
  const packRaw = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(packRaw);
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/QuestsContracts4.kt"),
    "utf8",
  );
  const quests3 = readJson(resolve(root, "shared/ship/quests-contracts-3.json"));

  if (catalog.phase !== 14) errors.push(`phase expected 14, got ${catalog.phase}`);
  if (catalog.schema !== QUESTS_CONTRACTS_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (QUESTS_CONTRACTS_4_PHASE !== 14) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.questsContracts4Marker !== QUESTS_CONTRACTS_4_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.questsContracts4Marker !== QUESTS_CONTRACTS_4_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "3.0.0") errors.push("ship catalog contentVersion must stay 3.0.0");
  if (!["3.0.0", "4.0.0"].includes(packRaw.contentVersion)) {
    errors.push("content-pack contentVersion must be 3.0.0 or 4.0.0");
  }
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsQuestsContracts3 !== "shared/ship/quests-contracts-3.json") {
    errors.push("extendsQuestsContracts3 path mismatch");
  }
  if ((quests3.questsMin ?? 0) < 30 || (quests3.deliveryChainsMin ?? 0) < 3) {
    errors.push("Finish 3.0 quests-contracts-3 floors must stay intact");
  }

  const measure = measureQuestsContracts4(root);
  if (measure.questCount < QUESTS4_QUESTS_MIN) {
    errors.push(`quests ${measure.questCount} < ${QUESTS4_QUESTS_MIN}`);
  }
  if (measure.chainCount < QUESTS4_CHAINS_MIN) {
    errors.push(`delivery chains ${measure.chainCount} < ${QUESTS4_CHAINS_MIN}`);
  }
  if (measure.repGatedCount < QUESTS4_REP_GATED_MIN) {
    errors.push(`reputation-gated templates ${measure.repGatedCount} < ${QUESTS4_REP_GATED_MIN}`);
  }
  if (measure.templateCount < QUESTS4_TEMPLATES_MIN) {
    errors.push(`contract templates ${measure.templateCount} < ${QUESTS4_TEMPLATES_MIN}`);
  }
  if (!measure.newQuestsPresent) errors.push("new quests missing from content-pack");
  if (!measure.newChainsPresent) errors.push("new chains missing from content-pack");
  if (!measure.newRepGatedPresent) errors.push("new reputation-gated contracts missing");
  if (!measure.kickoffQuestsMet) {
    errors.push("kickoff baseline.quests≥50, deliveryChains≥5, questsRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);
  if (!chainLengthsOk(root)) errors.push("new chains must each have length 3");

  for (const id of QUESTS_CONTRACTS_4.newQuests) {
    if (!content.questsById.has(id)) errors.push(`missing new quest ${id}`);
  }
  const terminal = content.questsById.get(fixture.terminalQuestId);
  if (!terminal) errors.push(`missing terminal quest ${fixture.terminalQuestId}`);

  for (const id of QUESTS_CONTRACTS_4.newChainHeads) {
    if (!content.contractTemplatesById.has(id)) errors.push(`missing chain head ${id}`);
  }
  for (const id of QUESTS_CONTRACTS_4.newChains) {
    if (ContractSystem.chainLength(content, id) !== fixture.newChainLength) {
      errors.push(`chain ${id} length mismatch`);
    }
  }

  const trusted = content.contractTemplatesById.get(fixture.newRepGatedId);
  if (!trusted) errors.push(`fixture rep-gated ${fixture.newRepGatedId} missing`);
  else if (trusted.requiresReputationBand !== fixture.newRepGatedBand) {
    errors.push("fixture rep gate band mismatch");
  }

  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [
    ...QUESTS_CONTRACTS_4.newQuests,
    ...QUESTS_CONTRACTS_4.newReputationGated,
    ...QUESTS_CONTRACTS_4.newBoardContracts,
    "contract.chain_mist_catch",
    "contract.chain_mist_braise",
    "contract.chain_mist_crate",
    "contract.chain_prism_catch",
    "contract.chain_prism_glaze",
    "contract.chain_prism_crate",
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if ((dod.quotas?.quests ?? 0) < 50) errors.push("DoD quotas.quests must be ≥ 50");
  if ((kickoff.gapTargets?.questsMin ?? 0) < 50) {
    errors.push("kickoff gapTargets.questsMin must be ≥ 50");
  }
  if ((kickoff.gapTargets?.chainsMin ?? 0) < 5) {
    errors.push("kickoff gapTargets.chainsMin must be ≥ 5");
  }
  if ((kickoff.baseline?.quests ?? 0) < 50) {
    errors.push("kickoff.baseline.quests must be ≥ 50 after Phase 14");
  }
  if ((kickoff.baseline?.deliveryChains ?? 0) < 5) {
    errors.push("kickoff.baseline.deliveryChains must be ≥ 5 after Phase 14");
  }
  if ((kickoff.gaps?.questsRemaining ?? 1) !== 0) {
    errors.push("kickoff.gaps.questsRemaining must be 0 after Phase 14");
  }

  if (listing.questsContracts4Phase !== 14) {
    errors.push("listing.questsContracts4Phase must be 14");
  }
  if (listing.questsContracts4Catalog !== "shared/ship/quests-contracts-4.json") {
    errors.push("listing.questsContracts4Catalog mismatch");
  }
  if (!pkg.scripts?.["quests4:validate"]) {
    errors.push("package.json missing quests4:validate");
  }
  if (!ci.includes("quests4:validate")) errors.push("ci.yml missing quests4:validate");
  if (!ci.includes("quests3:validate")) {
    errors.push("ci.yml missing baseline quests3:validate");
  }
  if (!pin.fixtures?.includes("parity-quests-contracts-4.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-quests-contracts-4.json");
  }
  if (pin.questsContracts4 !== "shared/ship/quests-contracts-4.json") {
    errors.push("RELEASE_PIN.questsContracts4 path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be >= 24");

  const phase14 = (kickoff.phases as any[])?.find((p: any) => p.phase === 14);
  if (!phase14 || phase14.validate !== "quests4:validate") {
    errors.push("kickoff phase 14 validate must be quests4:validate");
  }
  if (phase14?.id !== "quests-contracts-4") {
    errors.push("kickoff phase 14 id must be quests-contracts-4");
  }
  if (!finish4Kt.includes("quests4:validate")) {
    errors.push("Finish4Kickoff.kt phase 14 missing quests4:validate");
  }
  if (!kotlin.includes("QUESTS_CONTRACTS_4_MARKER") || !kotlin.includes("NEW_CHAINS")) {
    errors.push("Kotlin QuestsContracts4 missing constants");
  }

  const block = dod.questsContracts4;
  if (!block) errors.push("DoD missing questsContracts4 block");
  else {
    if (block.phase !== 14) errors.push("DoD questsContracts4.phase must be 14");
    if (block.plan !== "30_finish_4.0") errors.push("DoD questsContracts4.plan mismatch");
    if (block.status !== "complete") errors.push("DoD questsContracts4.status must be complete");
    if (block.questsContracts4Marker !== QUESTS_CONTRACTS_4_MARKER) {
      errors.push("DoD questsContracts4 marker mismatch");
    }
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("quests4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK quests4:validate — Finish 4.0 quests/contracts expansion ready");
