/**
 * Finish 2.0 Phase 17 — Contracts 2.0 readiness.
 *
 * Usage:
 *   npm run contracts:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, SCHEMA_VERSION, ContractSystem } from "../src/engine";
import {
  CONTRACTS_20,
  CONTRACTS_20_PHASE,
  CONTRACTS_20_SCHEMA,
  DELIVERY_CHAIN_FLOOR,
  REPUTATION_GATED_FLOOR,
} from "../src/ship/contracts20";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/contracts-2.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-contracts-2.0.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 17) errors.push(`phase expected 17, got ${catalog.phase}`);
  if (catalog.schema !== CONTRACTS_20_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (CONTRACTS_20_PHASE !== 17) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.deliveryChainCount !== 2 || DELIVERY_CHAIN_FLOOR !== 2) {
    errors.push("deliveryChainCount must be 2");
  }
  if (catalog.reputationGatedCount !== 2 || REPUTATION_GATED_FLOOR !== 2) {
    errors.push("reputationGatedCount must be 2");
  }
  if (dod.quotas?.deliveryChains !== 2) errors.push("DoD quotas.deliveryChains must be 2");
  if (dod.quotas?.reputationGatedContracts !== 2) {
    errors.push("DoD quotas.reputationGatedContracts must be 2");
  }

  if (listing.contracts2Phase !== 17) errors.push("listing.contracts2Phase must be 17");
  if (listing.contracts2Catalog !== "shared/ship/contracts-2.0.json") {
    errors.push("listing.contracts2Catalog mismatch");
  }
  if (!ci.includes("contracts:validate")) errors.push("ci.yml missing contracts:validate");
  if (!pin.fixtures?.includes("parity-contracts-2.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-contracts-2.0.json");
  }
  if (pin.contracts20 !== "shared/ship/contracts-2.0.json") {
    errors.push("RELEASE_PIN.contracts20 path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  for (const id of CONTRACTS_20.chainHeads) {
    if (!content.contractTemplatesById.has(id)) errors.push(`missing chain head ${id}`);
  }
  for (const id of CONTRACTS_20.reputationGated) {
    if (!content.contractTemplatesById.has(id)) errors.push(`missing rep-gated ${id}`);
  }

  const chains = new Set(
    content.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
  );
  if (chains.size < 2) errors.push(`delivery chains ${chains.size} < 2`);

  const repGated = content.contracts.templates.filter((t) => t.requiresReputationBand != null);
  if (repGated.length < 2) errors.push(`reputation-gated templates ${repGated.length} < 2`);

  if ((content.contracts.failStreakThreshold ?? 3) !== fixture.expect.failStreakThreshold) {
    errors.push("failStreakThreshold mismatch vs fixture");
  }
  const payoutTable = content.contracts.reputationPayoutMultPermille ?? [];
  if (payoutTable[0] !== fixture.expect.reputationPayoutBand0) {
    errors.push("reputationPayout band0 mismatch");
  }
  if (payoutTable[4] !== fixture.expect.reputationPayoutBand4) {
    errors.push("reputationPayout band4 mismatch");
  }

  const head = content.contractTemplatesById.get(fixture.chainHeadId);
  if (!head) errors.push(`fixture chain head ${fixture.chainHeadId} missing`);
  else if (head.chainId !== fixture.chainId || (head.chainStep ?? 1) !== 1) {
    errors.push("fixture chain head metadata mismatch");
  }
  if (ContractSystem.chainLength(content, fixture.chainId) !== fixture.chainLength) {
    errors.push("fixture chainLength mismatch");
  }

  const vip = content.contractTemplatesById.get(fixture.repGatedId);
  if (!vip) errors.push(`fixture rep-gated ${fixture.repGatedId} missing`);
  else if (vip.requiresReputationBand !== fixture.repGatedBand) {
    errors.push("fixture rep gate band mismatch");
  }

  if (typeof ContractSystem.failStreak !== "function") errors.push("ContractSystem.failStreak missing");
  if (typeof ContractSystem.nextChainTemplate !== "function") {
    errors.push("ContractSystem.nextChainTemplate missing");
  }

  const contractsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/contracts/Contracts.kt"),
    "utf8",
  );
  const systemsTs = readFileSync(resolve(root, "web/src/engine/systems.ts"), "utf8");
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const screenKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  if (!contractsKt.includes("advanceOrFinishChain")) errors.push("Kotlin chain advance missing");
  if (!contractsKt.includes("failStreak")) errors.push("Kotlin failStreak missing");
  if (!systemsTs.includes("advanceOrFinishChain")) errors.push("web chain advance missing");
  if (!appTsx.includes("failStreak")) errors.push("web Jobs panel missing fail streak");
  if (!appTsx.includes("chainStep")) errors.push("web Jobs panel missing chain step");
  if (!screenKt.includes("failStreak")) errors.push("Android Jobs panel missing fail streak");
  if (!screenKt.includes("chainStep")) errors.push("Android Jobs panel missing chain step");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("contracts:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK contracts:validate — Contracts 2.0 ready");
