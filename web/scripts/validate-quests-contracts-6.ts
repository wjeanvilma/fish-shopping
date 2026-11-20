/**
 * Finish 6.0 Phase 13 — quests/contracts expansion readiness.
 *
 * Usage:
 *   npm run quests6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractSystem, loadContent, SCHEMA_VERSION } from "../src/engine";
import {
  QUESTS6_CHAINS_MIN,
  QUESTS6_QUESTS_MIN,
  QUESTS6_REP_GATED_MIN,
  QUESTS6_TEMPLATES_MIN,
  QUESTS_CONTRACTS_6,
  QUESTS_CONTRACTS_6_MARKER,
  QUESTS_CONTRACTS_6_PHASE,
  QUESTS_CONTRACTS_6_SCHEMA,
  chainLengthsOk,
  measureQuestsContracts6,
} from "../src/ship/questsContracts6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/quests-contracts-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-quests-contracts-6.json"));
  const packRaw = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(packRaw);
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/QuestsContracts6.kt"),
    "utf8",
  );
  const quests5 = readJson(resolve(root, "shared/ship/quests-contracts-5.json"));

  if (catalog.phase !== 13) errors.push(`phase expected 13, got ${catalog.phase}`);
  if (catalog.schema !== QUESTS_CONTRACTS_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (QUESTS_CONTRACTS_6_PHASE !== 13) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 26) errors.push("catalog schemaVersion must be 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (catalog.questsContracts6Marker !== QUESTS_CONTRACTS_6_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.questsContracts6Marker !== QUESTS_CONTRACTS_6_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("ship catalog contentVersion must stay 5.0.0");
  if (!["5.0.0", "6.0.0"].includes(packRaw.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsQuestsContracts5 !== "shared/ship/quests-contracts-5.json") {
    errors.push("extendsQuestsContracts5 path mismatch");
  }
  if ((quests5.questsMin ?? 0) < 75 || (quests5.deliveryChainsMin ?? 0) < 7) {
    errors.push("Finish 5.0 quests-contracts-5 floors must stay intact");
  }

  const measure = measureQuestsContracts6(root);
  if (measure.questCount < QUESTS6_QUESTS_MIN) {
    errors.push(`quests ${measure.questCount} < ${QUESTS6_QUESTS_MIN}`);
  }
  if (measure.chainCount < QUESTS6_CHAINS_MIN) {
    errors.push(`delivery chains ${measure.chainCount} < ${QUESTS6_CHAINS_MIN}`);
  }
  if (measure.repGatedCount < QUESTS6_REP_GATED_MIN) {
    errors.push(`reputation-gated templates ${measure.repGatedCount} < ${QUESTS6_REP_GATED_MIN}`);
  }
  if (measure.templateCount < QUESTS6_TEMPLATES_MIN) {
    errors.push(`contract templates ${measure.templateCount} < ${QUESTS6_TEMPLATES_MIN}`);
  }
  if (!measure.newQuestsPresent) errors.push("new quests missing from content-pack");
  if (!measure.newChainsPresent) errors.push("new chains missing from content-pack");
  if (!measure.newRepGatedPresent) errors.push("new reputation-gated contracts missing");
  if (!measure.kickoffQuestsMet) {
    errors.push("kickoff gapTargets.questsMin≥100, chainsMin≥9, questsRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);
  if (!chainLengthsOk(root)) errors.push("new chains must each have length 3");

  for (const id of QUESTS_CONTRACTS_6.newQuests) {
    if (!content.questsById.has(id)) errors.push(`missing new quest ${id}`);
  }
  const terminal = content.questsById.get(fixture.terminalQuestId);
  if (!terminal) errors.push(`missing terminal quest ${fixture.terminalQuestId}`);

  for (const id of QUESTS_CONTRACTS_6.newChainHeads) {
    if (!content.contractTemplatesById.has(id)) errors.push(`missing chain head ${id}`);
  }
  for (const id of QUESTS_CONTRACTS_6.newChains) {
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
    ...QUESTS_CONTRACTS_6.newQuests,
    ...QUESTS_CONTRACTS_6.newReputationGated,
    ...QUESTS_CONTRACTS_6.newBoardContracts,
    "contract.chain_saffron_catch",
    "contract.chain_saffron_roast",
    "contract.chain_saffron_crate",
    "contract.chain_cobalt_catch",
    "contract.chain_cobalt_ferment",
    "contract.chain_cobalt_crate",
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if ((dod.quotas?.quests ?? 0) < 100) errors.push("DoD quotas.quests must be ≥ 100");
  if ((dod.quotas?.deliveryChains ?? 0) < 9) {
    errors.push("DoD quotas.deliveryChains must be ≥ 9");
  }
  if ((kickoff.gapTargets?.questsMin ?? 0) < 100) {
    errors.push("kickoff gapTargets.questsMin must be ≥ 100");
  }
  if ((kickoff.gapTargets?.chainsMin ?? 0) < 9) {
    errors.push("kickoff gapTargets.chainsMin must be ≥ 9");
  }
  // Soft-floor: Phase 1 baseline stays locked; quest gap closed via questsRemaining.
  if ((kickoff.baseline?.quests ?? 0) !== 75) {
    errors.push("kickoff.baseline.quests must stay 75 (Phase 1 soft-floor)");
  }
  if ((kickoff.baseline?.deliveryChains ?? 0) !== 7) {
    errors.push("kickoff.baseline.deliveryChains must stay 7 (Phase 1 soft-floor)");
  }
  if ((kickoff.gaps?.questsRemaining ?? 1) !== 0) {
    errors.push("kickoff.gaps.questsRemaining must be 0 after Phase 13");
  }
  // Soft-floor: Phase 15 closed contentFloorsShort.
  if (kickoff.gaps?.contentFloorsShort !== false) {
    errors.push("contentFloorsShort must be false after Phase 15");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("contentFloorsShort")) {
    errors.push("OPEN_GAP_FLAGS must drop contentFloorsShort after Phase 15");
  }

  if (listing.questsContracts6Phase !== 13) {
    errors.push("listing.questsContracts6Phase must be 13");
  }
  if (listing.questsContracts6Catalog !== "shared/ship/quests-contracts-6.json") {
    errors.push("listing.questsContracts6Catalog mismatch");
  }
  if (!pkg.scripts?.["quests6:validate"]) {
    errors.push("package.json missing quests6:validate");
  }
  if (!ci.includes("quests6:validate")) errors.push("ci.yml missing quests6:validate");
  if (!ci.includes("quests5:validate")) {
    errors.push("ci.yml missing baseline quests5:validate");
  }
  if (!pin.fixtures?.includes("parity-quests-contracts-6.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-quests-contracts-6.json");
  }
  if (pin.questsContracts6 !== "shared/ship/quests-contracts-6.json") {
    errors.push("RELEASE_PIN.questsContracts6 path mismatch");
  }

  const phase13 = (kickoff.phases as any[])?.find((p: any) => p.phase === 13);
  if (!phase13) errors.push("kickoff missing phase 13");
  else if (phase13.validate !== "quests6:validate") {
    errors.push("kickoff phase 13 validate must be quests6:validate");
  }
  if (phase13?.id !== "quests-contracts-6") {
    errors.push("kickoff phase 13 id must be quests-contracts-6");
  }

  const block = dod.questsContracts6;
  if (!block) errors.push("DoD missing questsContracts6 block");
  else {
    if (block.phase !== 13) errors.push("DoD questsContracts6.phase must be 13");
    if (block.plan !== "30_finish_6.0") errors.push("DoD questsContracts6.plan mismatch");
    if (block.status !== "complete") errors.push("DoD questsContracts6.status must be complete");
    if (block.questsContracts6Marker !== QUESTS_CONTRACTS_6_MARKER) {
      errors.push("DoD questsContracts6 marker mismatch");
    }
  }
  if (!kotlin.includes("NEW_QUESTS")) errors.push("Kotlin QuestsContracts6 missing NEW_QUESTS");
  if (!existsSync(resolve(root, "shared/tools/author_quests_contracts_6.py"))) {
    errors.push("missing author_quests_contracts_6.py");
  }

  if (fixture.expect?.newQuests !== QUESTS_CONTRACTS_6.newQuests.length) {
    errors.push("parity newQuests count mismatch");
  }
  if (fixture.terminalQuestId !== "quest.nest_covenant") {
    errors.push("parity terminalQuestId must be quest.nest_covenant");
  }
  // Soft-floor: Phase 14 closed endgameSchema27Pending → openGapFlagMin 15.
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("quests6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK quests6:validate — quests≥100 + chains≥9 + contracts depth; questsRemaining closed");
