/**
 * Finish 3.0 Phase 27 — quests/contracts expansion readiness.
 *
 * Usage:
 *   npm run quests3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractSystem, loadContent, SCHEMA_VERSION } from "../src/engine";
import {
  QUESTS3_CHAINS_MIN,
  QUESTS3_QUESTS_MIN,
  QUESTS3_REP_GATED_MIN,
  QUESTS3_TEMPLATES_MIN,
  QUESTS_CONTRACTS_3,
  QUESTS_CONTRACTS_3_MARKER,
  QUESTS_CONTRACTS_3_PHASE,
  QUESTS_CONTRACTS_3_SCHEMA,
} from "../src/ship/questsContracts3";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/quests-contracts-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-quests-contracts-3.json"));
  const packRaw = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(packRaw);
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/QuestsContracts3.kt"),
    "utf8",
  );
  const contracts20 = readJson(resolve(root, "shared/ship/contracts-2.0.json"));

  if (catalog.phase !== 27) errors.push(`phase expected 27, got ${catalog.phase}`);
  if (catalog.schema !== QUESTS_CONTRACTS_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (QUESTS_CONTRACTS_3_PHASE !== 27) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.questsContracts3Marker !== QUESTS_CONTRACTS_3_MARKER) {
    errors.push("marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("ship catalog contentVersion must stay 2.0.0");
  if (!["2.0.0", "3.0.0"].includes(packRaw.contentVersion)) {
    errors.push("content-pack contentVersion must be 2.0.0 or 3.0.0");
  }
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsContracts20 !== "shared/ship/contracts-2.0.json") {
    errors.push("extendsContracts20 path mismatch");
  }
  if (contracts20.deliveryChainCount !== 2 || contracts20.reputationGatedCount !== 2) {
    errors.push("Finish 2.0 contracts-2.0 floors must stay at 2 (do not collide)");
  }

  const questCount = content.raw.quests.length;
  if (questCount < QUESTS3_QUESTS_MIN) {
    errors.push(`quests ${questCount} < ${QUESTS3_QUESTS_MIN}`);
  }
  if (questCount < (fixture.questsMin ?? 30)) {
    errors.push("fixture questsMin not met");
  }
  for (const id of QUESTS_CONTRACTS_3.newQuests) {
    if (!content.questsById.has(id)) errors.push(`missing new quest ${id}`);
  }
  const terminal = content.questsById.get(fixture.terminalQuestId);
  if (!terminal) errors.push(`missing terminal quest ${fixture.terminalQuestId}`);

  const chains = new Set(
    content.raw.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
  );
  if (chains.size < QUESTS3_CHAINS_MIN) {
    errors.push(`delivery chains ${chains.size} < ${QUESTS3_CHAINS_MIN}`);
  }
  if (!chains.has(QUESTS_CONTRACTS_3.newChain)) {
    errors.push(`missing new chain ${QUESTS_CONTRACTS_3.newChain}`);
  }
  if (!content.contractTemplatesById.has(QUESTS_CONTRACTS_3.newChainHead)) {
    errors.push(`missing new chain head ${QUESTS_CONTRACTS_3.newChainHead}`);
  }
  if (ContractSystem.chainLength(content, fixture.newChainId) !== fixture.newChainLength) {
    errors.push("new chain length mismatch");
  }

  const repGated = content.raw.contracts.templates.filter((t) => t.requiresReputationBand != null);
  if (repGated.length < QUESTS3_REP_GATED_MIN) {
    errors.push(`reputation-gated templates ${repGated.length} < ${QUESTS3_REP_GATED_MIN}`);
  }
  for (const id of QUESTS_CONTRACTS_3.newReputationGated) {
    if (!content.contractTemplatesById.has(id)) errors.push(`missing new rep-gated ${id}`);
  }
  const trusted = content.contractTemplatesById.get(fixture.newRepGatedId);
  if (!trusted) errors.push(`fixture rep-gated ${fixture.newRepGatedId} missing`);
  else if (trusted.requiresReputationBand !== fixture.newRepGatedBand) {
    errors.push("fixture rep gate band mismatch");
  }

  if (content.raw.contracts.templates.length < QUESTS3_TEMPLATES_MIN) {
    errors.push(
      `contract templates ${content.raw.contracts.templates.length} < ${QUESTS3_TEMPLATES_MIN}`,
    );
  }

  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [
    ...QUESTS_CONTRACTS_3.newQuests,
    ...QUESTS_CONTRACTS_3.newReputationGated,
    QUESTS_CONTRACTS_3.newChainHead,
    "contract.chain_dawn_chill",
    "contract.chain_dawn_crate",
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if ((dod.quotas?.quests ?? 0) < 30) errors.push("DoD quotas.quests must be ≥ 30");
  if ((kickoff.gapTargets?.questsMin ?? 0) < 30) {
    errors.push("kickoff gapTargets.questsMin must be ≥ 30");
  }
  if ((kickoff.baseline?.quests ?? 0) < 30) {
    errors.push("kickoff.baseline.quests must be ≥ 30 after Phase 27");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 27) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 27");
  }

  if (listing.questsContracts3Phase !== 27) {
    errors.push("listing.questsContracts3Phase must be 27");
  }
  if (listing.questsContracts3Catalog !== "shared/ship/quests-contracts-3.json") {
    errors.push("listing.questsContracts3Catalog mismatch");
  }
  if (!pkg.scripts?.["quests3:validate"]) {
    errors.push("package.json missing quests3:validate");
  }
  if (!ci.includes("quests3:validate")) errors.push("ci.yml missing quests3:validate");
  if (!ci.includes("contracts:validate")) {
    errors.push("ci.yml missing baseline contracts:validate");
  }
  if (!pin.fixtures?.includes("parity-quests-contracts-3.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-quests-contracts-3.json");
  }
  if (pin.questsContracts3 !== "shared/ship/quests-contracts-3.json") {
    errors.push("RELEASE_PIN.questsContracts3 path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be >= 24");

  const phase27 = (kickoff.phases as any[])?.find((p: any) => p.phase === 27);
  if (!phase27 || phase27.validate !== "quests3:validate") {
    errors.push("kickoff phase 27 validate must be quests3:validate");
  }
  if (!finish3Kt.includes("quests3:validate")) {
    errors.push("Finish3Kickoff.kt phase 27 missing quests3:validate");
  }
  if (!kotlin.includes("QUESTS_CONTRACTS_3_MARKER") || !kotlin.includes("NEW_CHAIN")) {
    errors.push("Kotlin QuestsContracts3 missing constants");
  }

  const block = dod.questsContracts3;
  if (!block) errors.push("DoD missing questsContracts3 block");
  else {
    if (block.phase !== 27) errors.push("DoD questsContracts3.phase must be 27");
    if (block.plan !== "30_finish_3.0") errors.push("DoD questsContracts3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD questsContracts3.status must be complete");
    if (block.questsContracts3Marker !== QUESTS_CONTRACTS_3_MARKER) {
      errors.push("DoD questsContracts3 marker mismatch");
    }
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("quests3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK quests3:validate — Finish 3.0 quests/contracts expansion ready");
