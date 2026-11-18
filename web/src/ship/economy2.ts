/**
 * Finish 4.0 Phase 20 — economy/bank/dashboard depth
 * (mirrors shared/ship/economy-bank-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/economy-bank-2.json";
import { loadContent } from "../engine";

export interface Economy2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  economy2Marker: string;
  loanProductMin: number;
  goalPresetMin: number;
  loanProductIds: string[];
  goalPresets: number[];
  scarcityCurve: number[];
  dashboardFields: string[];
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const ECONOMY_2 = catalogJson as unknown as Economy2Catalog;
export const ECONOMY_2_PHASE = ECONOMY_2.phase;
export const ECONOMY_2_SCHEMA = ECONOMY_2.schema;
export const ECONOMY_2_MARKER = ECONOMY_2.economy2Marker;

export interface Economy2Measure {
  loanProductCount: number;
  goalPresetCount: number;
  loanProductsPresent: boolean;
  goalsPresent: boolean;
  scarcityMatches: boolean;
  dashboardFieldsPresent: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureEconomy2(repoRoot: string): Economy2Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  loadContent(pack);
  const bank = pack.bank ?? {};
  const products = bank.loanProducts ?? [];
  const goals = bank.goalPresets ?? [];
  const scarcity = pack.economy?.scarcityPriceCurvePermille ?? [];

  const tsDash = existsSync(resolve(repoRoot, "web/src/engine/businessDashboard.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/businessDashboard.ts"), "utf8")
    : "";
  const ktDash = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt"),
      "utf8",
    )
    : "";

  const kickoff = readJson(resolve(repoRoot, ECONOMY_2.kickoffCatalog));
  const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);

  const missingGates: string[] = [];
  for (const gate of ECONOMY_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    loanProductCount: products.length,
    goalPresetCount: goals.length,
    loanProductsPresent: ECONOMY_2.loanProductIds.every((id) =>
      products.some((p: any) => p.id === id),
    ),
    goalsPresent: ECONOMY_2.goalPresets.every((g) => goals.includes(g)),
    scarcityMatches:
      scarcity.length === ECONOMY_2.scarcityCurve.length &&
      ECONOMY_2.scarcityCurve.every((v, i) => scarcity[i] === v),
    dashboardFieldsPresent: ECONOMY_2.dashboardFields.every(
      (f) => tsDash.includes(f) && ktDash.includes(f),
    ),
    kickoffWired:
      phase20?.id === "economy-bank-2" && phase20?.validate === "economy2:validate",
    missingGates,
  };
}
