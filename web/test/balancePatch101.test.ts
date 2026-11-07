import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../src/engine";
import {
  BAG_CAPACITY_2_COST,
  BALANCE_PATCH_FROM,
  BALANCE_PATCH_PHASE,
  BALANCE_PATCH_SCHEMA,
  BALANCE_PATCH_TO,
  BASIC_PORTION_UNIT_PRICE,
  FILLET_UNIT_PRICE,
  FISHER_HIRE_COST,
  PORTER_HIRE_COST,
  REPAIR_COINS,
  XP_FISH_CAUGHT,
  XP_SALE_ASSISTED,
  XP_THRESHOLDS,
  balancePatch101,
} from "../src/engine/balancePatch101";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Balance patch 1.0.1 (post-1.0 Phase 23)", () => {
  it("locks patch metadata and schema 20", () => {
    expect(BALANCE_PATCH_PHASE).toBe(23);
    expect(BALANCE_PATCH_SCHEMA).toBe("fish.content.balance_patch.v1");
    expect(BALANCE_PATCH_FROM).toBe("1.0.0");
    expect(BALANCE_PATCH_TO).toBe("1.0.1");
    expect(balancePatch101.schemaVersion).toBe(20);
    expect(balancePatch101.constraints.noSchemaBreak).toBe(true);
    expect(content.contentVersion).toBe("1.0.1");
  });

  it("applies closed-test economy/XP tweaks in the live pack", () => {
    expect(content.upgradesById.get("upgrade.bag_capacity_2")?.cost).toBe(BAG_CAPACITY_2_COST);
    expect(content.productsById.get("product.basic_portion")?.unitPrice).toBe(BASIC_PORTION_UNIT_PRICE);
    expect(content.productsById.get("product.fillet")?.unitPrice).toBe(FILLET_UNIT_PRICE);
    expect(content.workersById.get("worker.porter")?.hireCost).toBe(PORTER_HIRE_COST);
    expect(content.workersById.get("worker.fisher")?.hireCost).toBe(FISHER_HIRE_COST);
    expect(content.raw.staffProgression.xpFishCaught).toBe(XP_FISH_CAUGHT);
    expect(content.raw.staffProgression.xpSaleAssisted).toBe(XP_SALE_ASSISTED);
    expect(content.raw.staffProgression.xpThresholds).toEqual([...XP_THRESHOLDS]);
    expect(content.raw.economy.wear.repairCoins).toBe(REPAIR_COINS);
  });

  it("balance:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-balance-patch.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK balance:validate");
  });
});
