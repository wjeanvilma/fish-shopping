/**
 * Finish 5.0 Phase 16 — quests/contracts expansion readiness.
 *
 * Usage:
 *   npm run quests5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractSystem, loadContent, SCHEMA_VERSION } from "../src/engine";
import {
  QUESTS5_CHAINS_MIN,
  QUESTS5_QUESTS_MIN,
  QUESTS5_REP_GATED_MIN,
  QUESTS5_TEMPLATES_MIN,
  QUESTS_CONTRACTS_5,
  QUESTS_CONTRACTS_5_MARKER,
  QUESTS_CONTRACTS_5_PHASE,
  QUESTS_CONTRACTS_5_SCHEMA,
  chainLengthsOk,
  measureQuestsContracts5,
} from "../src/ship/questsContracts5";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/quests-contracts-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-quests-contracts-5.json"));
  const packRaw = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(packRaw);
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/QuestsContracts5.kt"),
    "utf8",
  );
  const quests4 = readJson(resolve(root, "shared/ship/quests-contracts-4.json"));

  if (catalog.phase !== 16) errors.push(`phase expected 16, got ${catalog.phase}`);
  if (catalog.schema !== QUESTS_CONTRACTS_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (QUESTS_CONTRACTS_5_PHASE !== 16) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 25) errors.push("catalog schemaVersion must be 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.questsContracts5Marker !== QUESTS_CONTRACTS_5_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.questsContracts5Marker !== QUESTS_CONTRACTS_5_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "4.0.0") errors.push("ship catalog contentVersion must stay 4.0.0");
  if (!["4.0.0", "5.0.0"].includes(packRaw.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsQuestsContracts4 !== "shared/ship/quests-contracts-4.json") {
    errors.push("extendsQuestsContracts4 path mismatch");
  }
  if ((quests4.questsMin ?? 0) < 50 || (quests4.deliveryChainsMin ?? 0) < 5) {
    errors.push("Finish 4.0 quests-contracts-4 floors must stay intact");
  }

  const measure = measureQuestsContracts5(root);
  if (measure.questCount < QUESTS5_QUESTS_MIN) {
    errors.push(`quests ${measure.questCount} < ${QUESTS5_QUESTS_MIN}`);
  }
  if (measure.chainCount < QUESTS5_CHAINS_MIN) {
    errors.push(`delivery chains ${measure.chainCount} < ${QUESTS5_CHAINS_MIN}`);
  }
  if (measure.repGatedCount < QUESTS5_REP_GATED_MIN) {
    errors.push(`reputation-gated templates ${measure.repGatedCount} < ${QUESTS5_REP_GATED_MIN}`);
  }
  if (measure.templateCount < QUESTS5_TEMPLATES_MIN) {
    errors.push(`contract templates ${measure.templateCount} < ${QUESTS5_TEMPLATES_MIN}`);
  }
  if (!measure.newQuestsPresent) errors.push("new quests missing from content-pack");
  if (!measure.newChainsPresent) errors.push("new chains missing from content-pack");
  if (!measure.newRepGatedPresent) errors.push("new reputation-gated contracts missing");
  if (!measure.kickoffQuestsMet) {
    errors.push("kickoff baseline.quests≥75, deliveryChains≥7, questsRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);
  if (!chainLengthsOk(root)) errors.push("new chains must each have length 3");

  for (const id of QUESTS_CONTRACTS_5.newQuests) {
    if (!content.questsById.has(id)) errors.push(`missing new quest ${id}`);
  }
  const terminal = content.questsById.get(fixture.terminalQuestId);
  if (!terminal) errors.push(`missing terminal quest ${fixture.terminalQuestId}`);

  for (const id of QUESTS_CONTRACTS_5.newChainHeads) {
    if (!content.contractTemplatesById.has(id)) errors.push(`missing chain head ${id}`);
  }
  for (const id of QUESTS_CONTRACTS_5.newChains) {
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
    ...QUESTS_CONTRACTS_5.newQuests,
    ...QUESTS_CONTRACTS_5.newReputationGated,
    ...QUESTS_CONTRACTS_5.newBoardContracts,
    "contract.chain_aurora_catch",
    "contract.chain_aurora_poach",
    "contract.chain_aurora_crate",
    "contract.chain_tide_catch",
    "contract.chain_tide_can",
    "contract.chain_tide_crate",
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if ((dod.quotas?.quests ?? 0) < 75) errors.push("DoD quotas.quests must be ≥ 75");
  if ((kickoff.gapTargets?.questsMin ?? 0) < 75) {
    errors.push("kickoff gapTargets.questsMin must be ≥ 75");
  }
  if ((kickoff.gapTargets?.chainsMin ?? 0) < 7) {
    errors.push("kickoff gapTargets.chainsMin must be ≥ 7");
  }
  if ((kickoff.baseline?.quests ?? 0) < 75) {
    errors.push("kickoff.baseline.quests must be ≥ 75 after Phase 16");
  }
  if ((kickoff.baseline?.deliveryChains ?? 0) < 7) {
    errors.push("kickoff.baseline.deliveryChains must be ≥ 7 after Phase 16");
  }
  if ((kickoff.gaps?.questsRemaining ?? 1) !== 0) {
    errors.push("kickoff.gaps.questsRemaining must be 0 after Phase 16");
  }

  if (listing.questsContracts5Phase !== 16) {
    errors.push("listing.questsContracts5Phase must be 16");
  }
  if (listing.questsContracts5Catalog !== "shared/ship/quests-contracts-5.json") {
    errors.push("listing.questsContracts5Catalog mismatch");
  }
  if (!pkg.scripts?.["quests5:validate"]) {
    errors.push("package.json missing quests5:validate");
  }
  if (!ci.includes("quests5:validate")) errors.push("ci.yml missing quests5:validate");
  if (!ci.includes("quests4:validate")) {
    errors.push("ci.yml missing baseline quests4:validate");
  }
  if (!pin.fixtures?.includes("parity-quests-contracts-5.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-quests-contracts-5.json");
  }
  if (pin.questsContracts5 !== "shared/ship/quests-contracts-5.json") {
    errors.push("RELEASE_PIN.questsContracts5 path mismatch");
  }
  if (pin.schemaVersion < 25) errors.push("RELEASE_PIN.schemaVersion must be >= 25");

  const phase16 = (kickoff.phases as any[])?.find((p: any) => p.phase === 16);
  if (!phase16) errors.push("kickoff missing phase 16");
  else if (phase16.validate !== "quests5:validate") {
    errors.push("kickoff phase 16 validate must be quests5:validate");
  }
  if (phase16?.id !== "quests-contracts-5") {
    errors.push("kickoff phase 16 id must be quests-contracts-5");
  }

  const block = dod.questsContracts5;
  if (!block) errors.push("DoD missing questsContracts5 block");
  else {
    if (block.phase !== 16) errors.push("DoD questsContracts5.phase must be 16");
    if (block.plan !== "30_finish_5.0") errors.push("DoD questsContracts5.plan mismatch");
    if (block.status !== "complete") errors.push("DoD questsContracts5.status must be complete");
    if (block.questsContracts5Marker !== QUESTS_CONTRACTS_5_MARKER) {
      errors.push("DoD questsContracts5 marker mismatch");
    }
  }
  if (!kotlin.includes("NEW_QUESTS")) errors.push("Kotlin QuestsContracts5 missing NEW_QUESTS");
  if (!existsSync(resolve(root, "shared/tools/author_quests_contracts_5.py"))) {
    errors.push("missing author_quests_contracts_5.py");
  }

  if (fixture.expect?.newQuests !== QUESTS_CONTRACTS_5.newQuests.length) {
    errors.push("parity newQuests count mismatch");
  }
  if (fixture.terminalQuestId !== "quest.legend_circuit") {
    errors.push("parity terminalQuestId must be quest.legend_circuit");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("quests5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK quests5:validate — quests≥75, chains≥7, contracts depth locked");
