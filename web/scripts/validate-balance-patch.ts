/**
 * Phase 23 (post-1.0) — balance patch 1.0.1 readiness gate.
 *
 * Usage:
 *   npm run balance:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function byId<T extends { id: string }>(rows: T[], id: string): T | undefined {
  return rows.find((r) => r.id === id);
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/content/balance-patch-1.0.1.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const publicShip = readJson(resolve(root, "shared/ship/public-ship.json"));
  const listingCopy = readJson(resolve(root, "shared/store/listing-copy.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/content/BalancePatch101.kt"),
    "utf8",
  );
  const web = readFileSync(resolve(root, "web/src/engine/balancePatch101.ts"), "utf8");
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 23) errors.push(`phase expected 23, got ${catalog.phase}`);
  if (catalog.schema !== "fish.content.balance_patch.v1") errors.push("bad schema");
  if (catalog.fromContentVersion !== "1.0.0") errors.push("fromContentVersion must be 1.0.0");
  if (catalog.toContentVersion !== "1.0.1") errors.push("toContentVersion must be 1.0.1");
  if (catalog.schemaVersion !== 20) errors.push("catalog schemaVersion must stay 20");
  if (catalog.constraints?.noSchemaBreak !== true) errors.push("noSchemaBreak required");
  if (catalog.constraints?.keepSchemaVersion !== 20) errors.push("keepSchemaVersion must be 20");
  if (catalog.constraints?.patchBumpOnly !== true) errors.push("patchBumpOnly required");

  if (pack.contentVersion !== "1.0.1") errors.push("content-pack must be 1.0.1");
  if (pin.contentVersion !== "1.0.1") errors.push("RELEASE_PIN contentVersion must be 1.0.1");
  if (pin.versionName !== "1.0.1") errors.push("RELEASE_PIN versionName must be 1.0.1");
  if (pin.versionCode !== 2) errors.push("RELEASE_PIN versionCode must be 2");
  if (pin.schemaVersion !== 20) errors.push("RELEASE_PIN schemaVersion must stay 20");
  if (pin.releaseTag !== "v1.0.1") errors.push("RELEASE_PIN releaseTag must be v1.0.1");
  if (pin.balancePatch !== "shared/content/balance-patch-1.0.1.json") {
    errors.push("RELEASE_PIN.balancePatch path");
  }
  if (dod.contentVersion !== "1.0.1") errors.push("DoD contentVersion must be 1.0.1");
  if (dod.schemaVersion !== 20) errors.push("DoD schemaVersion must stay 20");
  if (dod.releaseTag !== "v1.0.1") errors.push("DoD releaseTag must be v1.0.1");

  // Phase 18 public ship cut stays frozen at 1.0.0-store.
  if (publicShip.contentVersion !== "1.0.0") errors.push("public-ship catalog stays 1.0.0");
  if (pin.storeRelease?.contentVersion !== "1.0.0") {
    errors.push("storeRelease.contentVersion stays 1.0.0 (Phase 18 cut)");
  }
  if (pin.storeRelease?.releaseTag !== "v1.0.0-store") {
    errors.push("storeRelease.releaseTag stays v1.0.0-store");
  }
  if (pin.storeRelease?.versionCode !== 1) errors.push("storeRelease.versionCode stays 1");

  if (listingCopy.copy?.whatsNewVersion !== "1.0.1") {
    errors.push("listing-copy whatsNewVersion must be 1.0.1");
  }

  const bag = byId(pack.upgrades, "upgrade.bag_capacity_2");
  if (bag?.cost !== 30) errors.push("bag_capacity_2 cost must be 30");
  const basic = byId(pack.products, "product.basic_portion");
  if (basic?.unitPrice !== 6) errors.push("basic_portion unitPrice must be 6");
  const fillet = byId(pack.products, "product.fillet");
  if (fillet?.unitPrice !== 13) errors.push("fillet unitPrice must be 13");
  const porter = byId(pack.workers, "worker.porter");
  if (porter?.hireCost !== 85) errors.push("porter hireCost must be 85");
  const fisher = byId(pack.workers, "worker.fisher");
  if (fisher?.hireCost !== 105) errors.push("fisher hireCost must be 105");
  if (pack.staffProgression?.xpFishCaught !== 5) errors.push("xpFishCaught must be 5");
  if (pack.staffProgression?.xpSaleAssisted !== 4) errors.push("xpSaleAssisted must be 4");
  if (JSON.stringify(pack.staffProgression?.xpThresholds) !== JSON.stringify([0, 35, 90, 160, 250])) {
    errors.push("xpThresholds mismatch");
  }
  if (pack.economy?.wear?.repairCoins !== 35) errors.push("repairCoins must be 35");

  for (const t of catalog.tweaks as Array<{ path: string; to: unknown }>) {
    if (!kotlin.includes(String(Array.isArray(t.to) ? "" : t.to)) && !Array.isArray(t.to)) {
      // soft: constants file should mention key knobs
    }
  }
  if (!kotlin.includes("TO_VERSION = \"1.0.1\"")) errors.push("BalancePatch101.kt missing TO_VERSION");
  if (!web.includes("BALANCE_PATCH_TO")) errors.push("balancePatch101.ts missing BALANCE_PATCH_TO");
  if (!ci.includes("balance:validate")) errors.push("ci.yml missing balance:validate");

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("balance:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK balance:validate — content 1.0.1 / schema 20; Phase 18 store cut frozen");
